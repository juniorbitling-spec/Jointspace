import express from "express";
import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const FEED_TTL_MS = 10 * 60 * 1000;
const MODEL = "claude-opus-5-5";

// RSS feeds grouped by region. A failing feed is skipped, never fatal.
const FEEDS = {
  india: [
    { source: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
    { source: "Indian Express", url: "https://indianexpress.com/section/india/feed/" },
    { source: "NDTV", url: "https://feeds.feedburner.com/ndtvnews-india-news" },
    { source: "Hindustan Times", url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml" },
    { source: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms" },
    { source: "BBC India", url: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml" },
  ],
  world: [
    { source: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
    { source: "The Guardian", url: "https://www.theguardian.com/world/rss" },
    { source: "DW", url: "https://rss.dw.com/rdf/rss-en-world" },
    { source: "The Hindu (World)", url: "https://www.thehindu.com/news/international/feeder/default.rss" },
    { source: "Indian Express (World)", url: "https://indianexpress.com/section/world/feed/" },
  ],
};

// Keyword lists used to tag each headline with a topic. Strong words count double;
// weak words (killed, attack...) alone are not enough, so crime and accidents stay out.
const TOPICS = {
  war: {
    strong: [
      "war", "wars", "military", "army", "troops", "missile", "missiles", "drone strike", "airstrike",
      "airstrikes", "ceasefire", "truce", "invasion", "shelling", "hostage", "hostages", "insurgent",
      "militant", "militants", "terrorist", "terror attack", "nato", "gaza", "ukraine", "kyiv",
      "hamas", "hezbollah", "houthi", "houthis", "idf", "pentagon", "warship", "soldiers", "rebels",
      "offensive", "line of control", "loc", "infiltration", "air force", "navy", "nuclear",
      "artillery", "west bank", "occupied", "frontline", "armed forces", "defence minister",
    ],
    weak: ["attack", "killed", "strike", "bomb", "blast", "border", "conflict", "weapons", "drone", "russia", "israel", "iran", "sudan", "gunmen"],
  },
  politics: {
    strong: [
      "election", "elections", "minister", "government", "parliament", "lok sabha", "rajya sabha",
      "assembly", "bjp", "congress", "aap", "tmc", "dmk", "samajwadi", "prime minister", "modi",
      "rahul gandhi", "chief minister", "opposition", "senate", "cabinet", "president", "polls",
      "white house", "kremlin", "coalition", "governor", "election commission", "midterms",
      "diplomat", "diplomatic", "summit", "sanctions", "tariff", "tariffs", "trump", "mla", "mp",
    ],
    weak: ["vote", "poll", "policy", "bill", "law", "court", "supreme court", "talks", "protest", "party", "centre"],
  },
};

const STOPWORDS = new Set(
  "a an the of to in on for and or but with at by from as is are was were be been has have had it its this that these those after over into about amid says said say new up out not no will can could would should more than his her their they them he she we you who what why how when where which india indian world news live updates".split(" "),
);

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (NewsDesk RSS reader)" },
});

const anthropic = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? new Anthropic() : null;

const feedCache = new Map(); // region -> { at, stories }
const storyIndex = new Map(); // story id -> story
const articleCache = new Map(); // story id -> generated article

function stripHtml(s = "") {
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;|&#039;/g, "'").replace(/\s+/g, " ").trim();
}

function tokens(text) {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function similarity(a, b) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size || 1, b.size || 1);
}

function classify(text) {
  const t = text.toLowerCase();
  const has = (w) => new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`).test(t);
  // A topic needs at least one strong word; weak words only add weight on top.
  const score = ({ strong, weak }) => {
    const hits = strong.filter(has).length;
    return hits ? hits * 2 + weak.filter(has).length : 0;
  };
  const war = score(TOPICS.war);
  const politics = score(TOPICS.politics);
  if (!war && !politics) return null;
  return war >= politics ? "war" : "politics";
}

async function fetchFeed({ source, url }) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 40).map((item) => ({
      source,
      title: stripHtml(item.title),
      link: item.link,
      summary: stripHtml(item.contentSnippet || item.content || item.summary || "").slice(0, 600),
      published: item.isoDate || item.pubDate || null,
    }));
  } catch (err) {
    console.warn(`Feed failed: ${source} (${err.message})`);
    return [];
  }
}

// Group headlines about the same event, across outlets, into one story.
function cluster(items) {
  const stories = [];
  for (const item of items) {
    const words = tokens(`${item.title} ${item.summary.slice(0, 160)}`);
    const titleWords = tokens(item.title);
    const match = stories.find((s) => s.topic === item.topic &&
      (similarity(words, s.words) >= 0.45 || similarity(titleWords, s.titleWords) >= 0.5));
    if (match) {
      if (!match.reports.some((r) => r.link === item.link)) match.reports.push(item);
      for (const w of words) match.words.add(w);
    } else {
      stories.push({ topic: item.topic, words, titleWords, reports: [item] });
    }
  }
  return stories.map(({ topic, reports }) => {
    reports.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
    const lead = reports[0];
    const id = createHash("sha1").update(lead.link || lead.title).digest("hex").slice(0, 12);
    return {
      id,
      topic,
      headline: lead.title,
      summary: lead.summary,
      published: lead.published,
      sources: [...new Set(reports.map((r) => r.source))],
      reports,
    };
  });
}

async function getStories(region) {
  const cached = feedCache.get(region);
  if (cached && Date.now() - cached.at < FEED_TTL_MS) return cached.stories;

  const results = await Promise.all(FEEDS[region].map(fetchFeed));
  const items = results.flat()
    .map((it) => ({ ...it, topic: classify(`${it.title} ${it.summary}`) }))
    .filter((it) => it.topic && it.title);

  const stories = cluster(items).sort((a, b) =>
    b.sources.length - a.sources.length || new Date(b.published || 0) - new Date(a.published || 0),
  );
  for (const s of stories) storyIndex.set(s.id, { ...s, region });
  feedCache.set(region, { at: Date.now(), stories });
  return stories;
}

// Pull readable paragraph text from an article page, to give the writer more than a teaser.
async function fetchArticleText(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (NewsDesk RSS reader)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripHtml(m[1]))
      .filter((p) => p.length > 60);
    return paras.join("\n").slice(0, 6000);
  } catch {
    return "";
  }
}

const SYSTEM_PROMPT = `You are the senior editor of an independent news desk that covers Indian and global politics and conflict.
You receive several reports of the same event from different outlets. Write one original, detailed news article in your own words that:
- Opens with a clear headline line ("# ...") and a 2-3 sentence lede stating what happened, where and when.
- Explains the background and why the event matters, then covers the key players and their stated positions.
- Notes where the outlets agree, and explicitly flags where they differ in facts, numbers or framing.
- Stays neutral: attribute claims to their source ("according to Al Jazeera ..."), never present a disputed claim as fact, and do not invent quotes, figures or details that are not in the reports.
- Ends with a "## What to watch" section and a "## Sources" list naming each outlet used.
Use Markdown with short sections and subheadings. Aim for 500-900 words, less if the reports are thin.`;

async function writeArticle(story) {
  const reports = await Promise.all(
    story.reports.slice(0, 6).map(async (r) => ({ ...r, body: await fetchArticleText(r.link) })),
  );
  const material = reports.map((r, i) =>
    `<report index="${i + 1}" source="${r.source}" published="${r.published || "unknown"}">\nHeadline: ${r.title}\nSummary: ${r.summary}\n${r.body ? `Article text:\n${r.body}` : ""}\n</report>`,
  ).join("\n\n");

  const stream = anthropic.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Topic: ${story.topic}. Region: ${story.region}.\n\n${material}\n\nWrite the article now.`,
    }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("The model declined to write this story.");
  }
  return message.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

// Without an API key, stitch the outlets' own summaries into a simple combined brief.
function fallbackArticle(story) {
  const parts = [`# ${story.headline}`, ""];
  parts.push(`*Combined brief from ${story.sources.join(", ")}. Set ANTHROPIC_API_KEY for a fully written article.*`, "");
  for (const r of story.reports) {
    parts.push(`## ${r.source}: ${r.title}`, "", r.summary || "_No summary provided._", "", `[Read at ${r.source}](${r.link})`, "");
  }
  return parts.join("\n");
}

const app = express();
app.use(express.static(path.join(here, "public")));

app.get("/api/news", async (req, res) => {
  const region = req.query.region === "world" ? "world" : "india";
  const topic = ["politics", "war"].includes(req.query.topic) ? req.query.topic : null;
  try {
    let stories = await getStories(region);
    if (topic) stories = stories.filter((s) => s.topic === topic);
    res.json({
      region,
      topic,
      aiEnabled: Boolean(anthropic),
      stories: stories.slice(0, 60).map(({ reports, ...s }) => ({ ...s, reportCount: reports.length })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/story/:id", async (req, res) => {
  const story = storyIndex.get(req.params.id);
  if (!story) return res.status(404).json({ error: "Story not found. Refresh the feed." });

  try {
    let article = articleCache.get(story.id);
    if (!article) {
      article = anthropic ? await writeArticle(story) : fallbackArticle(story);
      if (anthropic) articleCache.set(story.id, article);
    }
    res.json({
      id: story.id,
      topic: story.topic,
      region: story.region,
      article,
      reports: story.reports.map(({ source, title, link, published }) => ({ source, title, link, published })),
    });
  } catch (err) {
    console.error("Article generation failed:", err);
    const status = err instanceof Anthropic.APIError ? 502 : 500;
    res.status(status).json({ error: err.message, article: fallbackArticle(story) });
  }
});

app.listen(PORT, () => {
  console.log(`NewsDesk running at http://localhost:${PORT}`);
  if (!anthropic) console.log("ANTHROPIC_API_KEY not set: detailed articles will be combined source briefs.");
});
