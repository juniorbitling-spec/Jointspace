# DOCX Annotator

An offline app for marking up Word (`.docx`) files: highlight text, attach notes, and draw or type on top of the page.
Everything runs in your browser. Your files never leave your device.

## Features

- **Highlight** text in 5 colours. Pick the Highlight tool and drag over text, or select text with the Select tool and choose a colour from the pop-up.
- **Notes**: attach a note to any highlight with the 💬 button. All notes are listed in the **Notes** panel. Click a quote there to jump to it.
- **Pen and marker**: draw freehand on the page with a mouse, finger or stylus.
- **Text**: click anywhere on a page and type. Drag the box by its "move" handle.
- **Eraser**: drag over ink to remove it.
- **Undo/redo** for every change.
- **Auto-save**: annotations and the document are stored on your device (IndexedDB). Reopen a file from the library (⌂) at any time, including offline.
- **Export**:
  - **Save annotated .docx**: writes your highlights into the Word file as real Word highlights, and your notes as Word comments.
  - **Print / Save as PDF**: includes everything, including ink and text boxes.
  - **Back up / restore annotations (.json)**: moves your markup to another device.

> Ink and typed text boxes are only kept in the app and in PDF exports. Word has no simple way to store freehand ink.

## Running it

**Easiest:** open `index.html` in Chrome, Edge, Firefox or Safari. It works with no internet connection, because every library is bundled in `vendor/`.

**Install as an app (recommended):** serve the folder over `http(s)` and click **Install** in the browser. Some ways to do that:

- Enable GitHub Pages for this repo, then open `https://<user>.github.io/<repo>/docx-annotator/`.
- Or run a local server: `python3 -m http.server` inside this folder, then open http://localhost:8000.

After the first visit, a service worker caches the app. From then on it launches and works fully offline, on desktop (Windows/macOS/Linux/ChromeOS), on Android, and on iOS via "Add to Home Screen". On desktop Chrome/Edge, the installed app can also be set to open `.docx` files.

## Keyboard shortcuts

| Key | Action |
|---|---|
| V / H / P / M / T / E | Select / Highlight / Pen / Marker / Text / Eraser |
| Ctrl+Z, Ctrl+Shift+Z (or Ctrl+Y) | Undo, Redo |
| Ctrl+O | Open a file |
| Ctrl+S | Save annotated .docx |
| Delete | Remove the selected highlight |

## Notes

- Rendering uses [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) (Apache-2.0) and [JSZip](https://stuk.github.io/jszip/) (MIT). Complex layouts may look slightly different from Word, but your original file is never changed. Exports are written to a new file.
- Old `.doc` files are not supported. Save them as `.docx` in Word first.
- When you change files in this folder, bump `VERSION` in `sw.js` so installed copies update.
