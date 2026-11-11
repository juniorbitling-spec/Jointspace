# Study Highlighter

A single-file reading app for studying Claude docs, artifacts, and other documents.
Open `index.html` in any browser. Nothing to install.

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
