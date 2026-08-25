// Emits the reference cards the design tool shows a human browsing this system.
//
// EVERY VALUE ON THESE CARDS IS DERIVED, NOT TYPED. A swatch chart that restates hexes by
// hand is a second home for the palette and rots the first time a token moves — which is
// the failure this whole sync exists downstream of. So the colours come from the extracted
// token file, the roles come from the comment block in the layout that defines them, and
// the scale, the radii and the icon names are read back out of the compiled stylesheet.
// Nothing here knows a value of its own except the four base tokens' one-word labels, which
// the layout's comment deliberately does not carry because they are self-evident.
//
// The cards live under _preview/ rather than components/ because package-validate counts
// every .html under components/ and holds that count against the component count, which is
// zero here and correctly so. They are registered with the design tool explicitly.
//
// Run AFTER the converter: it clears its output directory, so anything written there first
// is destroyed.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT = "ds-bundle/_preview";
const TOKENS = ".design-sync/.cache/css/tokens.css";
const LAYOUT = "src/layouts/BasicLayout.astro";
const SHEET = "ds-bundle/_ds_bundle.css";

for (const f of [TOKENS, LAYOUT, SHEET]) {
  if (!existsSync(f)) {
    console.error(`[CARDS] ${f} is missing — run the site build, the CSS prep and the converter first`);
    process.exit(1);
  }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// -- inputs -----------------------------------------------------------------
const tokenCss = readFileSync(TOKENS, "utf8");
const theme = (name) => {
  const block = tokenCss.match(new RegExp(`:root\\[data-theme=${name}\\][^{]*\\{([^}]*)\\}`));
  if (!block) { console.error(`[CARDS] no ${name} theme block in ${TOKENS}`); process.exit(1); }
  return Object.fromEntries([...block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};
const light = theme("light"), dark = theme("dark");

// The layout documents eleven of the fifteen. The other four are the ground, the plate, its
// edge and the ink — named here because the block that defines them says, in as many words,
// that they are the obvious ones.
const BASE_ROLES = {
  "--background": "the page ground",
  "--card-background": "a card's plate, one step off the ground",
  "--card-border": "that plate's edge",
  "--text": "body ink",
};
const roles = { ...BASE_ROLES };
for (const m of readFileSync(LAYOUT, "utf8").matchAll(/^\s*\*\s+(--[\w-]+)\s{2,}(\S.*?)\s*$/gm)) {
  roles[m[1]] = m[2].replace(/\*(\w+)\*/g, "$1");
}
const missingRole = Object.keys(light).filter((t) => !roles[t]);
if (missingRole.length) {
  console.error(`[CARDS] no documented role for ${missingRole.join(", ")} — add it to the theme-variables block in ${LAYOUT}`);
  process.exit(1);
}

const sheet = readFileSync(SHEET, "utf8");
const pairs = (rx) => [...sheet.matchAll(rx)].reduce((a, m) => (a[m[1]] ??= m.slice(2), a), {});
const scale = pairs(/\.(text-[a-z0-9]+)\{font-size:([^;]+);line-height:([^;}]+)/g);
const weights = pairs(/\.(font-[a-z]+)\{font-weight:(\d+)/g);
const gaps = pairs(/\.(gap-[a-z0-9]+)\{gap:([^;}]+)/g);
const radii = pairs(/\.(rounded-[a-z]+)\{border-radius:([^;}]+)/g);
const icons = [...new Set([...sheet.matchAll(/\.(i-[a-z0-9-]+)/g)].map((m) => m[1]))].sort();

// -- shell ------------------------------------------------------------------
const CHROME = `
  :root{color-scheme:light}
  body{margin:0;padding:28px;background:${light["--background"]};color:${light["--text"]};
       font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
       font-size:14px;line-height:1.5}
  h1{font-size:1.875rem;line-height:2.25rem;font-weight:700;margin:0 0 .25rem}
  .lede{margin:0 0 1.5rem;max-width:60ch;color:${light["--text"]};opacity:.75}
  h2{font-size:.75rem;line-height:1rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
     margin:2rem 0 .75rem;color:${light["--accent"]}}
  table{border-collapse:collapse;width:100%}
  td,th{text-align:left;padding:.5rem .75rem;border-bottom:1px solid ${light["--card-border"]};vertical-align:middle}
  th{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;opacity:.6;font-weight:700}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.8125rem}
  .chip{width:2.75rem;height:1.75rem;border-radius:.375rem;border:1px solid ${light["--card-border"]};display:block}
  .onink{padding:.3rem;border-radius:.5rem;display:inline-block}
  .val{display:block;margin-top:.25rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
       font-size:.625rem;opacity:.55;letter-spacing:-.01em}
  .rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem;margin-top:2rem}
  .rule{background:${light["--card-background"]};border:1px solid ${light["--card-border"]};
        border-radius:.5rem;padding:.875rem 1rem}
  .rule h3{margin:0 0 .5rem;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase}
  .rule.do h3{color:${light["--accent"]}}
  .rule.dont h3{opacity:.55}
  .rule ul{margin:0;padding-left:1.1rem}
  .rule li{margin:.3rem 0}
  .specimen{background:${light["--card-background"]};border:1px solid ${light["--card-border"]};
            border-radius:.5rem;padding:1.25rem;display:flex;flex-wrap:wrap;gap:1.5rem;align-items:center}
`;

const card = ({ group, name, title, lede, body }) =>
  `<!-- @dsCard group="${group}" name="${name}" -->
<!doctype html>
<html data-theme="light">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="stylesheet" href="../styles.css">
<style>${CHROME}</style>
</head>
<body>
<h1>${esc(title)}</h1>
<p class="lede">${lede}</p>
${body}
</body>
</html>
`;

const rules = (does, donts) => `<div class="rules">
  <div class="rule do"><h3>Do</h3><ul>${does.map((d) => `<li>${d}</li>`).join("")}</ul></div>
  <div class="rule dont"><h3>Don't</h3><ul>${donts.map((d) => `<li>${d}</li>`).join("")}</ul></div>
</div>`;

mkdirSync(OUT, { recursive: true });

// -- palette ----------------------------------------------------------------
// A mark meant for an ink-flooded surface is drawn ON one. Showing it against the page
// ground is not a neutral choice — it renders the pale half of every pair as a mistake,
// which is the opposite of what the polarity rule says.
const swatch = (t, vals) => {
  const chip = `<span class="chip" style="background:${vals[t]}"></span>`;
  const inked = t.endsWith("-on-ink")
    ? `<span class="onink" style="background:${vals["--text"]}">${chip}</span>`
    : chip;
  return `${inked}<span class="val">${vals[t]}</span>`;
};
const swatchRows = Object.keys(light).map((t) => `<tr>
  <td>${swatch(t, light)}</td>
  <td>${swatch(t, dark)}</td>
  <td><code>${t}</code></td>
  <td>${esc(roles[t])}</td>
</tr>`).join("\n");

writeFileSync(join(OUT, "palette.html"), card({
  group: "Foundations", name: "Palette", title: "Palette",
  lede: `Fifteen tokens, defined twice — once per theme — and never anywhere else. Colour is the
         whole system here, so a design is on-brand exactly to the degree it reaches for these
         and nothing else.`,
  body: `<table>
  <tr><th>Light</th><th>Dark</th><th>Token</th><th>Role</th></tr>
  ${swatchRows}
  </table>
  ${rules(
    ["Reach for the token whose <em>role</em> matches what you are drawing, not the one whose colour you like.",
     "Design in both themes. Every token is defined in each, and several swap polarity rather than merely darkening.",
     `Use the <code>-on-ink</code> variants on a surface flooded with <code>--text</code>.`],
    [`Hardcode a hex. There is no token whose value is worth restating.`,
     `Use <code>--brand-ink</code> for anything interactive — that is <code>--accent</code>'s job, and the two only coincide in light mode.`,
     `Assume dark is light with the lightness inverted: <code>--progress-fill</code> and <code>--progress-track</code> deliberately trade places.`],
  )}`,
}));

// -- type and space ---------------------------------------------------------
const scaleRows = Object.entries(scale)
  .sort((a, b) => parseFloat(a[1][0]) - parseFloat(b[1][0]))
  .map(([cls, [size, lh]]) => `<tr>
    <td style="font-size:${size};line-height:${lh}">Ag</td>
    <td><code>${cls}</code></td><td><code>${size}</code></td><td><code>${lh}</code></td></tr>`).join("\n");

writeFileSync(join(OUT, "type-and-space.html"), card({
  group: "Foundations", name: "Type & space", title: "Type and space",
  lede: `A deliberately short scale. There is no webfont and no display face — the system sans
         stack is the typeface, and restraint in the ramp is what carries hierarchy instead.`,
  body: `<h2>Scale</h2>
  <table><tr><th>Specimen</th><th>Class</th><th>Size</th><th>Line height</th></tr>${scaleRows}</table>
  <h2>Weight</h2>
  <table>${Object.entries(weights).map(([c, [w]]) =>
    `<tr><td style="font-weight:${w};font-size:1.25rem">Ag</td><td><code>${c}</code></td><td><code>${w}</code></td></tr>`).join("")}</table>
  <h2>Space and radius</h2>
  <table>
    ${Object.entries(gaps).map(([c, [v]]) =>
      `<tr><td><span style="display:inline-flex;gap:${v}">
             <span style="width:1.25rem;height:1.25rem;background:${light["--accent"]};border-radius:.125rem"></span>
             <span style="width:1.25rem;height:1.25rem;background:${light["--accent"]};border-radius:.125rem"></span>
           </span></td>
           <td><code>${c}</code></td><td><code>${v}</code></td></tr>`).join("")}
    ${Object.entries(radii).map(([c, [v]]) =>
      `<tr><td><span style="display:block;height:2.5rem;width:2.5rem;border:2px solid ${light["--accent"]};border-radius:${v}"></span></td>
           <td><code>${c}</code></td><td><code>${v}</code></td></tr>`).join("")}
  </table>
  ${rules(
    ["Carry hierarchy with size and weight from this ramp, and with space.",
     "Let the reader's own text size drive layout — the site sizes its breakpoints and boxes in <code>rem</code> for exactly this reason.",
     "Space sibling groups with a <code>gap</code> on a flex or grid parent."],
    ["Introduce a decorative or display face. There is no webfont to pair with one.",
     "Invent an intermediate step in the ramp because something is a little too big.",
     "Pin a height in pixels — text that grows then clips instead of pushing."],
  )}`,
}));

// -- controls ---------------------------------------------------------------
writeFileSync(join(OUT, "controls.html"), card({
  group: "Controls", name: "Controls", title: "Controls",
  lede: `Three kinds of control, and which one to use is decided by what the control contains
         rather than by how important it is. All three share one surface: a hairline in
         <code>--accent</code>, a hard offset plate in <code>--shadow</code>, and colour moving over 300ms.`,
  body: `<h2>control — icon only</h2>
  <div class="specimen">
    <span class="control"><span class="i-ri-sun-line"></span></span>
    <span class="control"><span class="i-ri-moon-line"></span></span>
    <span class="control"><span class="i-fa6-brands-github"></span></span>
    <p style="margin:0;max-width:34ch">Pinned at 64×48. Its box is fixed because its content is:
    one mark, never a word. The social links and the theme toggle wear it.</p>
  </div>
  <h2>control-cta — labelled, full width</h2>
  <div class="specimen">
    <span class="control-cta" style="max-width:18rem">My cycling events <span class="i-ri-arrow-right-line"></span></span>
    <p style="margin:0;max-width:34ch">Takes the width of whatever contains it and floors its height
    rather than pinning it, because its label comes from data and must be allowed to wrap.</p>
  </div>
  <h2>text-link — a run of words</h2>
  <div class="specimen">
    <p style="margin:0">Read the <a class="text-link" href="#">full event wall</a> for every race entered.</p>
  </div>
  ${rules(
    ["Give every link a signifier a reader can perceive — an underline, a mark, or a border.",
     "Let a labelled control wrap. Its width belongs to its container; its height belongs to its text.",
     "Draw the press. A tap lasting ~100ms shows only a third of a 300ms colour ramp, so a pressed state must not ease."],
    [`Use <code>control-surface</code>. It is a source-level shortcut the other two compose, nothing wears it directly, and it is not in the shipped stylesheet.`,
     "Draw a link exactly like the prose beside it.",
     "Pin a control's height in pixels — the box is sized in <code>rem</code> so it grows with the reader's text."],
  )}`,
}));

// -- icons ------------------------------------------------------------------
const set = (prefix) => icons.filter((i) => i.startsWith(prefix));
const grid = (list) => `<div class="specimen" style="display:grid;gap:1.25rem 1rem;
  grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));align-items:start">${list.map((i) =>
  `<span style="display:flex;flex-direction:column;align-items:center;gap:.45rem;text-align:center">
     <span class="${i}" style="font-size:1.5rem"></span>
     <code style="font-size:.6875rem;opacity:.7;overflow-wrap:anywhere">${i}</code></span>`).join("")}</div>`;

writeFileSync(join(OUT, "icons.html"), card({
  group: "Icons", name: "Icons", title: "Icons",
  lede: `${icons.length} marks ship, and only those — each one is in the stylesheet because some page
         uses it, so the set grows with the site rather than ahead of it.`,
  body: `<h2>Remix Icon — ${set("i-ri-").length} marks</h2>${grid(set("i-ri-"))}
  <h2>Brand marks — ${set("i-fa6-brands-").length}</h2>${grid(set("i-fa6-brands-"))}
  ${rules(
    ["Size a mark with <code>font-size</code>; they are background images scaled to the text box.",
     "Pair a mark with a word wherever the mark alone would be a guess.",
     "Give an icon-only control an accessible name."],
    ["Substitute an emoji for a mark that is not in the set.",
     "Mix a second icon family in. Two sets ship and they do different jobs.",
     "Recolour a brand mark away from what the surface needs for contrast."],
  )}`,
}));

console.error(`[CARDS] wrote 4 cards to ${OUT} (${Object.keys(light).length} tokens, ${Object.keys(scale).length} sizes, ${icons.length} icons)`);
