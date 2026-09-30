#!/usr/bin/env python3
"""Assemble the single-file offline app: python3 src/build.py"""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent
back = (root / 'base.css').read_text()
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Joint Space — Assessment Proforma</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
{back}
{(root / 'extra.css').read_text()}
</style>
</head>
{(root / 'shell.html').read_text()}
<script>
{(root / 'regions.js').read_text()}
{(root / 'engine.js').read_text()}
</script>
</body>
</html>
"""
out = root.parent / 'JointSpace-Proforma.html'
out.write_text(html)
print('wrote', out, len(html), 'bytes')
