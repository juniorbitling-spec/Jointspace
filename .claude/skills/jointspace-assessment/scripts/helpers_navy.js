const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  VerticalAlign, TableLayoutType
} = require("docx");

const USABLE_TWIPS = 12240 - 720 - 720; // Letter minus 0.5" margins

const ACCENT = "1F3864", SUBHEAD = "1F5C6B", LABEL_FILL = "D6E4F0",
      KEY_FILL = "FCE4D6", GOOD_FILL = "D9EAD3", BORDER = "CCCCCC",
      BODY = "1A1A1A", LABELCOL = "333333", FONT = "Calibri";

const border = () => ({
  top:    { style: BorderStyle.SINGLE, size: 2, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
  left:   { style: BorderStyle.SINGLE, size: 2, color: BORDER },
  right:  { style: BorderStyle.SINGLE, size: 2, color: BORDER },
});

function mkParas(text, o = {}) {
  return (Array.isArray(text) ? text : [text]).map(l => new Paragraph({
    children: [new TextRun({ text: l, font: FONT, size: o.size || 22,
      bold: !!o.bold, italics: !!o.italics, color: o.color || BODY })],
    spacing: { after: 40 },
  }));
}

function cell(text, o = {}) {
  return new TableCell({
    width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
    borders: border(),
    verticalAlign: VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: mkParas(text, o),
  });
}

// rows: array of arrays; each cell is a string or {text, fill, bold}
// colWidths: percentages summing to 100 (REQUIRED - prevents the squashed-column bug)
function T(rows, colWidths) {
  const n = Math.max(...rows.map(r => r.length));
  const pct = colWidths && colWidths.length === n ? colWidths : Array(n).fill(Math.floor(100 / n));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: pct.map(p => Math.round(USABLE_TWIPS * p / 100)),
    layout: TableLayoutType.FIXED,
    rows: rows.map(r => new TableRow({
      children: r.map((c, i) => {
        const cfg = c && typeof c === "object" && c.text !== undefined ? c : { text: c };
        return cell(cfg.text, { ...cfg, width: pct[i] });
      }),
    })),
  });
}

const banner = (t) => new Paragraph({
  children: [new TextRun({ text: t, font: FONT, bold: true, size: 28, color: "FFFFFF" })],
  shading: { type: ShadingType.CLEAR, color: "auto", fill: ACCENT },
  spacing: { before: 240, after: 120 },
});
const heading = (n, t) => banner(`Section ${n}: ${t}`);
const sub  = (t) => new Paragraph({ children: [new TextRun({ text: t, font: FONT, bold: true, size: 24, color: SUBHEAD })], spacing: { before: 160, after: 80 } });
const note = (t) => new Paragraph({ children: [new TextRun({ text: t, font: FONT, italics: true, size: 21, color: "666666" })], spacing: { after: 100 } });
const body = (t) => new Paragraph({
  children: Array.isArray(t)
    ? t.map(x => new TextRun({ text: x.text, font: FONT, size: 22, bold: !!x.bold, color: x.color || BODY }))
    : [new TextRun({ text: t, font: FONT, size: 22, color: BODY })],
  spacing: { after: 120 },
});
const bullet = (t) => new Paragraph({ children: [new TextRun({ text: t, font: FONT, size: 22, color: BODY })], bullet: { level: 0 }, spacing: { after: 60 } });
const gap = (s = 100) => new Paragraph({ text: "", spacing: { after: s } });

module.exports = { Document, Packer, Paragraph, TextRun, AlignmentType,
  ACCENT, LABEL_FILL, KEY_FILL, GOOD_FILL, LABELCOL,
  T, heading, banner, sub, note, body, bullet, gap };
