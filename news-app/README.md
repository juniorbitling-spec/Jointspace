# NewsDesk

A news app for **India** and **global** news on **politics** and **war & conflict**.
It pulls headlines from many outlets, groups reports of the same event together,
and writes one detailed article per story that compares what each outlet says.

## Sources

| India | Global |
|---|---|
| The Hindu, Indian Express, NDTV, Hindustan Times, Times of India, BBC India | BBC, Al Jazeera, The Guardian, DW, The Hindu (World), Indian Express (World) |

Feeds are listed in `FEEDS` in `server.js`; add or remove any RSS feed there.

## How it works

1. **Collect**: every RSS feed for the chosen region is fetched (cached for 10 minutes).
2. **Classify**: each headline is tagged *Politics* or *War & Conflict* by keyword; others are dropped.
3. **Group**: headlines about the same event from different outlets are merged into one story.
   Stories covered by the most outlets rank first.
4. **Write**: when you open a story, the server fetches the text of each source article and asks
   Claude to write an original, neutral, detailed article: background, key players, where the
   outlets agree or disagree, what to watch next, and a list of sources.
   Articles are cached in memory once written.

Without an API key, the app still works; opening a story shows a combined brief of each outlet's summary.

## Run it

Requires Node.js 18+.

```bash
cd news-app
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # optional, enables the AI-written articles
npm start
```

Open http://localhost:3000. Set `PORT` to use a different port.

If you are behind a corporate proxy, start it with `NODE_USE_ENV_PROXY=1 npm start`
(Node 22.21+), so Node uses your `HTTPS_PROXY` setting.

## API

- `GET /api/news?region=india|world&topic=politics|war` returns grouped stories.
- `GET /api/story/:id` returns the detailed article (Markdown) and the original links.

## Notes

- Generated articles are written only from the outlets' own reporting and attribute claims
  to their source, but they are AI-written: check the linked originals for anything important.
- Some outlets block automated access to their article pages; the writer then works from the RSS summary.
