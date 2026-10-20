// Usage: node build.js [content.js] [output.docx]
const path = require("path");
const { Document, Packer } = require("../scripts/helpers_navy.js");
const contentFile = path.resolve(process.argv[2] || path.join(__dirname, "content.js"));
const outFile = process.argv[3] || "output.docx";
const k = require(contentFile);
const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: k }] });
Packer.toBuffer(doc).then(b => { require("fs").writeFileSync(outFile, b); console.log("Wrote " + outFile); });
