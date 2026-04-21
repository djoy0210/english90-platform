import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "@neondatabase/serverless";
const { Pool, neonConfig } = pkg;
import ws from "ws";
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

const dir = "scripts/seed-data";
const files = readdirSync(dir)
  .filter((f) => /^day\d{2}\.json$/.test(f))
  .sort();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  let updated = 0;
  for (const f of files) {
    const raw = readFileSync(join(dir, f), "utf-8");
    const lesson = JSON.parse(raw);
    const {
      day,
      level,
      titleEn,
      titleMn,
      objectiveEn,
      objectiveMn,
      contentEn,
      contentMn,
      vocabulary,
      quiz,
      lessonContent,
    } = lesson;
    if (typeof day !== "number" || level !== 1) {
      console.warn(`skip ${f}: bad day/level`);
      continue;
    }
    if (!Array.isArray(vocabulary) || vocabulary.length < 15) {
      console.warn(`skip ${f}: vocab=${vocabulary?.length}`);
      continue;
    }
    await pool.query(
      `UPDATE lessons SET
         title_en=$2, title_mn=$3,
         objective_en=$4, objective_mn=$5,
         content_en=$6, content_mn=$7,
         vocabulary=$8::jsonb, quiz=$9::jsonb, lesson_content=$10::jsonb,
         updated_at=NOW()
       WHERE level=1 AND day=$1`,
      [
        day,
        titleEn,
        titleMn,
        objectiveEn,
        objectiveMn,
        contentEn ?? null,
        contentMn ?? null,
        JSON.stringify(vocabulary),
        JSON.stringify(quiz),
        JSON.stringify(lessonContent),
      ],
    );
    updated++;
    console.log(`✓ Day ${day}: ${titleEn}`);
  }
  console.log(`\nDone. Updated ${updated} lessons.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
