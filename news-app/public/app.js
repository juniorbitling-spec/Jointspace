const state = { region: "india", topic: "" };
const $ = (sel) => document.querySelector(sel);

function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

// Small Markdown renderer: escapes HTML first, so feed or model text can't inject markup.
function renderMarkdown(md) {
  const inline = (s) => escapeHtml(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1<em>$2</em>");
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)/))) {
      closeList();
      const level = m[1].length;
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) {
      if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      closeList();
      out.push("<hr>");
    } else if (line.trim()) {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    } else {
      closeList();
    }
  }
  closeList();
  return out.join("\n");
}

async function loadStories() {
  $("#status").textContent = "Gathering stories from news sources…";
  $("#stories").innerHTML = "";
  try {
    const params = new URLSearchParams({ region: state.region, topic: state.topic });
    const res = await fetch(`/api/news?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    const label = state.region === "india" ? "India" : "Global";
    $("#status").textContent = data.stories.length
      ? `${data.stories.length} ${label} stories${data.aiEnabled ? "" : " · AI writer off (set ANTHROPIC_API_KEY)"}`
      : "No matching stories right now. Try another filter or refresh.";
    $("#stories").innerHTML = data.stories.map(cardHtml).join("");
  } catch (err) {
    $("#status").innerHTML = `<span class="error">Could not load news: ${escapeHtml(err.message)}</span>`;
  }
}

function cardHtml(s) {
  const many = s.sources.length > 1;
  return `
    <article class="card" data-id="${s.id}">
      <div class="meta">
        <span class="tag ${s.topic}">${s.topic === "war" ? "War & Conflict" : "Politics"}</span>
        <span>· ${timeAgo(s.published)}</span>
        ${many ? `<span class="multi">· ${s.sources.length} sources</span>` : ""}
      </div>
      <h2>${escapeHtml(s.headline)}</h2>
      <p>${escapeHtml(s.summary.slice(0, 220))}${s.summary.length > 220 ? "…" : ""}</p>
      <div class="meta">${s.sources.map((src) => `<span class="chip">${escapeHtml(src)}</span>`).join("")}</div>
      <span class="read">Read detailed story →</span>
    </article>`;
}

async function openStory(id) {
  $("#reader").hidden = false;
  document.body.style.overflow = "hidden";
  $("#article").innerHTML = '<p class="loading">Reading every source and writing the detailed story… this can take a minute.</p>';
  $("#coverage").innerHTML = "";
  try {
    const res = await fetch(`/api/story/${id}`);
    const data = await res.json();
    if (data.article) $("#article").innerHTML = renderMarkdown(data.article);
    if (!res.ok) {
      $("#article").insertAdjacentHTML("afterbegin", `<p class="error">AI writer failed (${escapeHtml(data.error)}). Showing combined source brief.</p>`);
    }
    $("#coverage").innerHTML = (data.reports || []).map((r) =>
      `<li><strong>${escapeHtml(r.source)}</strong>: <a href="${encodeURI(r.link)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a></li>`,
    ).join("");
  } catch (err) {
    $("#article").innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

function closeReader() {
  $("#reader").hidden = true;
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-region]").forEach((btn) => btn.addEventListener("click", () => {
  document.querySelectorAll("[data-region]").forEach((b) => b.classList.toggle("active", b === btn));
  state.region = btn.dataset.region;
  loadStories();
}));
document.querySelectorAll("[data-topic]").forEach((btn) => btn.addEventListener("click", () => {
  document.querySelectorAll("[data-topic]").forEach((b) => b.classList.toggle("active", b === btn));
  state.topic = btn.dataset.topic;
  loadStories();
}));
$("#refresh").addEventListener("click", loadStories);
$("#stories").addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openStory(card.dataset.id);
});
$("#close").addEventListener("click", closeReader);
$("#reader").addEventListener("click", (e) => { if (e.target.id === "reader") closeReader(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeReader(); });

loadStories();
