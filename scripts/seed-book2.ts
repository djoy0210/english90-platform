import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const lessons = JSON.parse(readFileSync(new URL("./book2-lessons.json", import.meta.url), "utf-8"));
  let updated = 0, inserted = 0;
  for (const l of lessons) {
    const { day, level, titleEn, titleMn, objectiveEn, objectiveMn, contentEn, contentMn, vocabulary, quiz, lessonContent } = l;
    if (level !== 2) continue;

    const exists = await pool.query(`SELECT id FROM lessons WHERE level=2 AND day=$1`, [day]);
    if (exists.rowCount && exists.rowCount > 0) {
      await pool.query(
        `UPDATE lessons SET
           title_en=$2, title_mn=$3,
           objective_en=$4, objective_mn=$5,
           content_en=$6, content_mn=$7,
           vocabulary=$8::jsonb, quiz=$9::jsonb, lesson_content=$10::jsonb,
           updated_at=NOW()
         WHERE level=2 AND day=$1`,
        [day, titleEn, titleMn, objectiveEn, objectiveMn, contentEn, contentMn,
         JSON.stringify(vocabulary), JSON.stringify(quiz), JSON.stringify(lessonContent)],
      );
      updated++;
    } else {
      await pool.query(
        `INSERT INTO lessons (day, level, title_en, title_mn, objective_en, objective_mn, content_en, content_mn, vocabulary, quiz, lesson_content)
         VALUES ($1, 2, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)`,
        [day, titleEn, titleMn, objectiveEn, objectiveMn, contentEn, contentMn,
         JSON.stringify(vocabulary), JSON.stringify(quiz), JSON.stringify(lessonContent)],
      );
      inserted++;
    }
    console.log(`Day ${day}: ${titleEn} — ${exists.rowCount ? "updated" : "inserted"}`);
  }
  console.log(`\nDone. Inserted ${inserted}, Updated ${updated}`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
