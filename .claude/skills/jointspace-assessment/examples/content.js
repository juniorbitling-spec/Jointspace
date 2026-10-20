const { T, heading, sub, body, bullet, gap, LABEL_FILL, KEY_FILL, GOOD_FILL } = require("../scripts/helpers_navy.js");
const k = [];
k.push(heading(1, "Patient Demographics"));
k.push(T([
  [{ text: "Name", fill: LABEL_FILL, bold: true }, "Mr. X"],
  [{ text: "Age / Sex", fill: LABEL_FILL, bold: true }, "64 / Male"],
], [30, 70]));
k.push(gap());
k.push(heading(7, "Range of Motion"));
k.push(T([
  [{text:"Movement",fill:LABEL_FILL,bold:true},{text:"LEFT",fill:LABEL_FILL,bold:true},{text:"RIGHT",fill:LABEL_FILL,bold:true},{text:"Normal",fill:LABEL_FILL,bold:true}],
  ["Hip flexion", {text:"0°–90°",fill:KEY_FILL}, {text:"0°–120°",fill:GOOD_FILL}, "0°–120°"],
], [28, 24, 24, 24]));
module.exports = k;
