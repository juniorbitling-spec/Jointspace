# Study Highlighter

A single-file reading app for studying Claude docs, artifacts, and other documents.
`index.html` here is the source. **`../Study-Highlighter.html` is the offline build**: every library and font is inside the file, so it works with no internet at all. Rebuild it after editing with `python3 tools/build_offline.py`.

## Linux Mint app
Put `Study-Highlighter.html` in the same folder as `linux-mint/install.sh` (or keep the repo layout) and run `bash install.sh`. Study Highlighter then appears in the Menu under Education and opens in its own window. Remove it with `bash install.sh --uninstall`.

## Getting content in
- **Paste**: select all in a Claude Doc or artifact page, copy, and paste. Headings, lists, tables and code keep their formatting. Markdown copied from a Claude chat reply also works.
- **Files**: HTML (saved artifacts), Markdown, text, PDF, and Word (.docx). Drag them onto the page or use *Add document*.

## Studying
- Select text, then pick a color (or press `1`–`5`): Key idea, Definition, Example, Question, Review later.
- Press `N` (or *Note*) to attach a note. Click a highlight to recolor, annotate, copy, or remove it.
- The right panel lists highlights in reading order; filter by color and click one to jump to it.
- **Review** (`R`) hides every highlight as a blank. Tap a blank to reveal it: active recall from your own highlights.
- *Copy highlights as Markdown* groups them by color with your notes.

## Saving
Your library is stored in the browser (IndexedDB). *Copy backup* puts the whole library on the clipboard as JSON; paste it (or load a `.json` file) through *Add document* to restore it elsewhere.
