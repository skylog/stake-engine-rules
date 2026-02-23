/**
 * Post-build: fix asset paths and SvelteKit base in the SPA fallback page.
 *
 * SvelteKit's adapter-static generates absolute paths (/_app/...) and
 * base: "" in the fallback index.html. On Stake Engine the game is served
 * from /{gameId}/{version}/, so:
 *
 * 1. Rewrite /_app/ -> ./_app/ so assets resolve relative to the HTML file.
 * 2. Replace base: "" with a runtime expression that reads the <base> tag
 *    set in app.html, so SvelteKit's router correctly strips the deployment
 *    path and matches the "/" route.
 */
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "build", "index.html");
let html = fs.readFileSync(htmlPath, "utf8");

let changes = 0;

// 1. Make asset paths relative
const assetsBefore = html;
html = html.replaceAll('"/_app/', '"./_app/');
html = html.replaceAll("'/_app/", "'./_app/");
if (html !== assetsBefore) {
  const count = (assetsBefore.match(/\/_app\//g) || []).length;
  console.log(`fix-base-path: rewrote ${count} asset paths to relative`);
  changes += count;
}

// 2. Replace static base: "" with runtime base detection
const basePattern = /base:\s*""/;
if (basePattern.test(html)) {
  html = html.replace(
    basePattern,
    'base: new URL(".", document.baseURI).pathname.replace(/\\/$/, "")'
  );
  console.log('fix-base-path: replaced base: "" with runtime base detection');
  changes++;
}

if (changes > 0) {
  fs.writeFileSync(htmlPath, html);
  console.log(`fix-base-path: done (${changes} changes)`);
} else {
  console.log("fix-base-path: no changes needed");
}
