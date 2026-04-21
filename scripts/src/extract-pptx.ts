import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

async function extractSlides(filePath: string): Promise<string[][]> {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const ai = parseInt(a.match(/slide(\d+)/)![1]);
      const bi = parseInt(b.match(/slide(\d+)/)![1]);
      return ai - bi;
    });
  const slides: string[][] = [];
  const decode = (s: string) =>
    s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  for (const f of slideFiles) {
    const xml = await zip.files[f].async("string");
    const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decode(m[1]));
    slides.push(runs);
  }
  return slides;
}

const arg = process.argv[2];
if (!arg) {
  console.error("usage: extract-pptx <file or dir>");
  process.exit(1);
}

const files = fs.statSync(arg).isDirectory()
  ? fs.readdirSync(arg).filter((f) => f.endsWith(".pptx")).map((f) => path.join(arg, f)).sort()
  : [arg];

const all: Record<string, string[][]> = {};
for (const f of files) {
  const slides = await extractSlides(f);
  all[path.basename(f)] = slides;
}

const out = process.argv[3] || "pptx-extracted.json";
fs.writeFileSync(out, JSON.stringify(all, null, 2));
console.log("Wrote", out, "files:", Object.keys(all).length);
