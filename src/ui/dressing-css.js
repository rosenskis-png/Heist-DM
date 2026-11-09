// The Dressing Room's styles (src/ui/dressing.js), scoped to its root so it can sit inside the game page. The
// bench's iron and moss, each companion's own colour on her swatch, and the prompt text in mono.
export const css = `
.dr {
  --bg: #eef0ee; --panel: #fbfcfb; --fg: #1c2422; --muted: #5d6b67; --line: #d3d9d6; --sunk: #e4e8e5;
  --accent: #2f7a68; --accent-fg: #ffffff; --accent-soft: #dcefe8;
  --ok: #2e7d4f; --near: #a86b12; --bad: #b3362c; --info: #4b6a8a;
  --ok-bg: #e2f1e7; --near-bg: #f8ecd6; --bad-bg: #f7e1de; --info-bg: #e3ebf4;
  --mark: #f3dd8a; --mark-fg: #2a2210; --add: #cfe9d8; --del: #f3d3cf;
  --body: "Alegreya Sans", "Segoe UI", system-ui, sans-serif;
  --display: "Alegreya SC", "Alegreya Sans", Georgia, serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .dr {
  --bg: #131917; --panel: #1b2321; --fg: #e3ebe8; --muted: #93a39e; --line: #2c3835; --sunk: #161d1b;
  --accent: #5fbfa6; --accent-fg: #0d1513; --accent-soft: #1f3a32;
  --ok: #6fcf94; --near: #e3a94a; --bad: #ef7d72; --info: #8fb2d8;
  --ok-bg: #1d3327; --near-bg: #3a2e18; --bad-bg: #3d2220; --info-bg: #1f2c3a;
  --mark: #5c4c17; --mark-fg: #f6ecc8; --add: #1f4030; --del: #4a2522; color-scheme: dark;
} }
:root[data-theme="dark"] .dr {
  --bg: #131917; --panel: #1b2321; --fg: #e3ebe8; --muted: #93a39e; --line: #2c3835; --sunk: #161d1b;
  --accent: #5fbfa6; --accent-fg: #0d1513; --accent-soft: #1f3a32;
  --ok: #6fcf94; --near: #e3a94a; --bad: #ef7d72; --info: #8fb2d8;
  --ok-bg: #1d3327; --near-bg: #3a2e18; --bad-bg: #3d2220; --info-bg: #1f2c3a;
  --mark: #5c4c17; --mark-fg: #f6ecc8; --add: #1f4030; --del: #4a2522; color-scheme: dark;
}
.dr { background: var(--bg); color: var(--fg); font: 16px/1.45 var(--body); min-height: 100%; }
.dr .dbstate { font-size: 12px; color: var(--muted); white-space: nowrap; }
.dr .wrap { max-width: 820px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); box-sizing: border-box; }
.dr p { margin: 0; }
.dr header.top { position: sticky; top: var(--dr-top, 0px); z-index: 5; background: var(--panel); border-bottom: 1px solid var(--line); }
.dr .bar { display: flex; align-items: center; gap: 12px; padding-block: 8px 4px; }
.dr h1 { font: 500 15px var(--display); letter-spacing: .08em; margin: 0; white-space: nowrap; color: var(--muted); }
.dr nav { display: flex; gap: 4px; flex: 1; min-width: 0; }
.dr nav button { font: 500 15px var(--body); border: 0; background: none; color: var(--muted); padding: 5px 12px; border-radius: 999px; cursor: pointer; }
.dr nav button[aria-current="page"] { background: var(--accent); color: var(--accent-fg); }
.dr #dbstate { font-size: 12px; color: var(--muted); white-space: nowrap; }
.dr .strip { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-block: 4px 8px; }
.dr .strip::-webkit-scrollbar { display: none; }
.dr .pick { display: inline-flex; align-items: center; gap: 7px; flex: none; font: 500 15px var(--body); color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px 4px 6px; cursor: pointer; }
.dr .pick[aria-pressed="true"] { border-color: var(--fg); background: var(--panel); box-shadow: inset 0 0 0 1px var(--fg); }
.dr .dot { width: 16px; height: 16px; border-radius: 50%; background: var(--c); box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); flex: none; }
.dr .badge { font: 500 11px/1 var(--mono); padding: 3px 5px; border-radius: 999px; background: var(--near-bg); color: var(--near); }
.dr .badge.draft { background: var(--info-bg); color: var(--info); }
.dr main { display: grid; gap: 14px; padding-block: 14px 72px; }
.dr section.card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; display: grid; gap: 12px; min-width: 0; }
.dr .head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.dr h2 { font: 700 20px/1.2 var(--display); margin: 0; letter-spacing: .02em; text-wrap: balance; }
.dr h3 { font: 500 12px var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 0; }
.dr .muted { color: var(--muted); }
.dr .small { font-size: 14px; }
.dr .tiny { font-size: 12.5px; }
.dr .hero { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; align-items: center; }
.dr .hero .swatch { grid-row: span 2; width: 44px; height: 44px; border-radius: 50%; background: var(--c); box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); }
.dr .hero h2 { font-size: 26px; }
.dr .ctx { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
.dr label.inline { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--muted); }
.dr select, .dr textarea, .dr input[type="text"], .dr input[type="number"] { font: 15px var(--body); color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; box-sizing: border-box; min-width: 0; }
.dr textarea { width: 100%; resize: vertical; line-height: 1.45; }
.dr textarea.changed, .dr input.changed { border-color: var(--info); box-shadow: 0 0 0 1px var(--info); }
.dr button:focus-visible, .dr select:focus-visible, .dr textarea:focus-visible, .dr input:focus-visible, .dr summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dr .btn { font: 700 14px var(--body); background: var(--accent); color: var(--accent-fg); border: 0; border-radius: 8px; padding: 7px 12px; cursor: pointer; white-space: nowrap; }
.dr .btn:disabled { opacity: .5; cursor: not-allowed; }
.dr .btn.ghost { background: none; color: var(--fg); border: 1px solid var(--line); font-weight: 500; }
.dr .btn.ghost.on { background: var(--accent-soft); border-color: var(--accent); color: var(--fg); }
.dr .btn.danger { background: none; color: var(--bad); border: 1px solid var(--line); font-weight: 500; }
.dr .btn.small { font-size: 13px; padding: 4px 9px; }
.dr .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.dr .seg { display: inline-flex; flex-wrap: wrap; gap: 2px; background: var(--sunk); border-radius: 9px; padding: 3px; }
.dr .seg button { font: 500 14px var(--body); border: 0; background: none; color: var(--muted); padding: 5px 10px; border-radius: 7px; cursor: pointer; }
.dr .seg button[aria-pressed="true"] { background: var(--panel); color: var(--fg); box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.dr dl.sorted { margin: 0; display: grid; grid-template-columns: minmax(96px, 150px) 1fr; border-top: 1px solid var(--line); }
.dr dl.sorted > div { display: contents; }
.dr dl.sorted dt, .dr dl.sorted dd { padding: 8px 0; border-bottom: 1px solid var(--line); }
.dr dl.sorted dt { font: 500 12px var(--body); letter-spacing: .07em; text-transform: uppercase; color: var(--muted); padding-right: 12px; padding-top: 11px; }
.dr dl.sorted dd { margin: 0; display: grid; gap: 6px; min-width: 0; }
.dr .sent { display: block; }
.dr .tag { display: inline-block; font: 500 11px/1.3 var(--mono); color: var(--muted); background: var(--sunk); border-radius: 5px; padding: 1px 5px; margin-left: 6px; vertical-align: 1px; white-space: nowrap; }
.dr .tag.src { color: var(--info); background: var(--info-bg); }
@media (max-width: 520px) {
  .dr dl.sorted { grid-template-columns: 1fr; }
  .dr dl.sorted dt { border-bottom: 0; padding-bottom: 0; }
}
.dr .raw { display: grid; gap: 8px; }
.dr .raw p { padding: 8px 10px; background: var(--bg); border-radius: 8px; }
.dr .sub { display: grid; gap: 8px; padding-top: 4px; }
.dr .editor { display: grid; gap: 10px; padding: 12px; background: var(--bg); border: 1px dashed var(--line); border-radius: 8px; }
.dr .field { display: grid; gap: 4px; min-width: 0; }
.dr .field > span { font-size: 13px; color: var(--muted); display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.dr .path { font: 12px var(--mono); color: var(--muted); overflow-wrap: anywhere; }
.dr .sent-rows { display: grid; gap: 10px; }
.dr .sent-row { display: grid; gap: 4px; min-width: 0; }
.dr .key { font: 500 13px var(--mono); color: var(--accent); display: flex; gap: 8px; align-items: center; justify-content: space-between; }
.dr .quote { font: 13.5px/1.55 var(--mono); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 9px 11px; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
.dr .absent { font-size: 14px; color: var(--muted); padding: 8px 10px; border-radius: 8px; background: var(--sunk); }
.dr .guide { border-left: 3px solid var(--line); padding: 2px 0 2px 10px; font-size: 14px; color: var(--muted); }
.dr details.fold { border: 1px solid var(--line); border-radius: 8px; background: var(--bg); min-width: 0; }
.dr details.fold > summary { padding: 8px 10px; cursor: pointer; font-size: 14px; color: var(--muted); }
.dr details.fold pre { margin: 0; padding: 0 10px 10px; font: 12px/1.5 var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; max-height: 60vh; overflow-y: auto; }
.dr mark { background: var(--mark); color: var(--mark-fg); border-radius: 3px; }
.dr .meter { display: flex; gap: 14px; flex-wrap: wrap; font: 12.5px var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.dr .slots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.dr .slots .wide { grid-column: 1 / -1; }
@media (max-width: 560px) { .dr .slots { grid-template-columns: 1fr; }  }
.dr .slots input[type="text"] { width: 100%; }
.dr .check { display: inline-flex; gap: 6px; align-items: center; font-size: 14px; }
.dr .prompt-out { font: 14px/1.6 var(--mono); background: var(--sunk); border-radius: 8px; padding: 12px 14px; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
.dr .chips { display: flex; flex-wrap: wrap; gap: 4px; }
.dr .chip { display: inline-block; font: 500 12px/1.2 var(--mono); padding: 3px 7px; border-radius: 999px; }
.dr .chip.near { background: var(--near-bg); color: var(--near); }
.dr .chip.ok { background: var(--ok-bg); color: var(--ok); }
.dr .chip.info { background: var(--info-bg); color: var(--info); }
.dr .chip.bad { background: var(--bad-bg); color: var(--bad); }
.dr .draftbar { position: sticky; bottom: 0; z-index: 4; background: var(--info-bg); border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom, 0px); }
.dr .draftbar .wrap { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding-block: 8px; }
.dr .draftbar .grow { flex: 1; min-width: 160px; font-size: 14px; }
.dr .diff { font: 13px/1.6 var(--mono); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 9px 11px; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
.dr .diff ins { background: var(--add); text-decoration: none; border-radius: 3px; }
.dr .diff del { background: var(--del); border-radius: 3px; }
.dr .notes { display: grid; gap: 8px; }
.dr .note { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; display: grid; gap: 6px; background: var(--bg); min-width: 0; }
.dr .note.done { opacity: .6; }
.dr .note .meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); }
.dr .note .text { white-space: pre-wrap; overflow-wrap: anywhere; }
.dr .err { color: var(--bad); }
.dr .status { font-size: 13px; color: var(--muted); }
.dr .lineup { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.dr .lineup .card { cursor: pointer; text-align: left; font: inherit; color: inherit; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; display: grid; gap: 10px; align-content: start; }
.dr .lineup .card:hover { border-color: var(--muted); }
.dr .lineup dl { margin: 0; display: grid; gap: 6px; font-size: 14px; }
.dr .lineup dt { font: 500 11px var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.dr .lineup dd { margin: 0; }
@media (prefers-reduced-motion: no-preference) { .dr .pick, .dr .btn, .dr .seg button { transition: background-color .15s, border-color .15s; }  }
`;
