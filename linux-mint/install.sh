#!/usr/bin/env bash
# Installs Study Highlighter as an app on Linux Mint (Cinnamon, MATE, Xfce).
# Run from this folder:  bash install.sh      Remove with:  bash install.sh --uninstall
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$HOME/.local/share/study-highlighter"
DESKTOP="$HOME/.local/share/applications/study-highlighter.desktop"

if [ "${1:-}" = "--uninstall" ]; then
  rm -rf "$APP_DIR" "$DESKTOP"
  echo "Study Highlighter removed."
  exit 0
fi

SRC="$HERE/../Study-Highlighter.html"
[ -f "$SRC" ] || SRC="$HERE/Study-Highlighter.html"
[ -f "$SRC" ] || { echo "Put Study-Highlighter.html next to this script and run it again."; exit 1; }

mkdir -p "$APP_DIR" "$(dirname "$DESKTOP")"
cp "$SRC" "$APP_DIR/Study-Highlighter.html"
cp "$HERE/study-highlighter.svg" "$APP_DIR/icon.svg"

# Launcher: open in its own window (no tabs or address bar) when a Chromium-based browser exists.
cat > "$APP_DIR/launch.sh" <<'LAUNCH'
#!/usr/bin/env bash
PAGE="file://$HOME/.local/share/study-highlighter/Study-Highlighter.html"
for b in chromium chromium-browser google-chrome google-chrome-stable brave-browser microsoft-edge vivaldi; do
  if command -v "$b" >/dev/null 2>&1; then
    exec "$b" --app="$PAGE" --class=StudyHighlighter --user-data-dir="$HOME/.local/share/study-highlighter/profile"
  fi
done
exec xdg-open "$PAGE"
LAUNCH
chmod +x "$APP_DIR/launch.sh"

cat > "$DESKTOP" <<DESK
[Desktop Entry]
Type=Application
Name=Study Highlighter
Comment=Highlight and review Claude docs, artifacts, PDFs and notes
Exec=$APP_DIR/launch.sh
Icon=$APP_DIR/icon.svg
Terminal=false
Categories=Education;Office;
StartupWMClass=StudyHighlighter
DESK
chmod +x "$DESKTOP"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$(dirname "$DESKTOP")" || true
echo "Installed. Find Study Highlighter in the Menu under Education or Office."
