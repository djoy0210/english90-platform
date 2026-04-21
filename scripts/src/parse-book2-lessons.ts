import fs from "node:fs";

type Vocab = { english: string; pronunciation: string; mongolian: string; example: string };
type McqQ = { id?: string; question: string; options: string[]; answer: string };
type StoredQuiz = { id: string; promptEn: string; promptMn: string; options: string[]; correctAnswer: string };

type ParsedLesson = {
  day: number;
  level: number;
  titleEn: string;
  titleMn: string;
  objectiveEn: string;
  objectiveMn: string;
  contentEn: string;
  contentMn: string;
  durationMinutes: number;
  vocabulary: Vocab[];
  quiz: StoredQuiz[];
  lessonContent: any;
};

import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "../..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/pptx-extracted.json"), "utf8")) as Record<string, string[][]>;

function findIndex(arr: string[], pred: (s: string) => boolean, from = 0): number {
  for (let i = from; i < arr.length; i++) if (pred(arr[i])) return i;
  return -1;
}

function parseLesson(slides: string[][], dayNum: number): ParsedLesson {
  const s1 = slides[0];
  const s2 = slides[1];
  const s3 = slides[2];

  // ===== Title and topic from slide 1 header =====
  // [4] is "<topic>  ·  <topic_mn>"
  const titleLine = s1[4] || "";
  const [topicEn, topicMn] = titleLine.split("·").map((x) => x.trim());
  const titleEn = `Day ${dayNum}: ${topicEn}`;
  const titleMn = `Өдөр ${dayNum}: ${topicMn || topicEn}`;

  // Objective from [7]: "✦ Learn 20 words   ✦ Grammar: <topic>   ✦ Cover & test yourself"
  const objLine = (s1[7] || "").replace(/\s+/g, " ").trim();
  const objectiveEn = objLine || `Master ${topicEn}`;
  const objectiveMn = `${topicMn || topicEn}: 20 шинэ үг, дүрэм, унших, ярих, сонсох дасгал.`;

  // ===== Vocabulary: 20 entries after vocab header =====
  // Find the headers row pattern: "#" then headers then "1", "<word>", ...
  const hashIdx = findIndex(s1, (s) => s === "#");
  // After hash header there are 6 column header runs then data: # English Pronunciation Дуудлага Mongolian Монгол Example
  // But in slide 1 we saw: ['#', 'English', 'Pronunciation', 'Дуудлага', 'Mongolian', 'Монгол', 'Example sentence']
  let vocStart = -1;
  for (let i = hashIdx + 1; i < s1.length - 1; i++) {
    if (s1[i] === "1" && /[a-zA-Z]/.test(s1[i + 1] || "")) {
      vocStart = i;
      break;
    }
  }
  const vocabulary: Vocab[] = [];
  if (vocStart > 0) {
    for (let n = 0; n < 20; n++) {
      const base = vocStart + n * 5;
      const num = s1[base];
      const english = s1[base + 1];
      const pronunciation = s1[base + 2];
      const mongolian = s1[base + 3];
      const example = s1[base + 4];
      if (!english || String(parseInt(num || "")) !== String(n + 1)) break;
      vocabulary.push({
        english: english.trim(),
        pronunciation: (pronunciation || "").trim(),
        mongolian: (mongolian || "").trim(),
        example: (example || "").trim(),
      });
    }
  }

  // ===== Grammar topic + explanation from slide 1 =====
  const gIdx = findIndex(s1, (s) => /Grammar — /.test(s));
  const grammarTopic = gIdx >= 0 ? s1[gIdx].replace(/^.*Grammar — /, "").trim() : "";
  // Explanation runs are after "Learn step by step" — typically the next 2 are EN / MN
  const lsIdx = findIndex(s1, (s) => /Learn step by step/.test(s));
  const grammarExplanation = lsIdx >= 0 ? (s1[lsIdx + 1] || "") : "";
  const grammarExplanationMn = lsIdx >= 0 ? (s1[lsIdx + 2] || "") : "";

  // Common mistakes: lines starting with "❌"
  const commonMistakes = s1.filter((s) => /^❌/.test(s.trim())).map((s) => s.trim());

  // Quick practice: "1. ____ ... (answer)" lines (sort by leading number — slides are 2-column so order is 1,5,2,6,...)
  const practiceLines = s1
    .filter((s) => /^\d+\.\s+_+/.test(s.trim()))
    .slice()
    .sort((a, b) => {
      const na = parseInt(a.trim().match(/^(\d+)\./)?.[1] || "0", 10);
      const nb = parseInt(b.trim().match(/^(\d+)\./)?.[1] || "0", 10);
      return na - nb;
    });
  const quickPractice = practiceLines.map((s) => s.replace(/\s*\(.*?\)\s*$/, "").trim());
  const quickPracticeAnswers = practiceLines.map((s) => {
    const m = s.match(/\(([^)]+)\)\s*$/);
    return m ? m[1].trim() : "";
  });
  // Look for "🔑  Answers:" line for canonical answer key
  const ansIdx = s1.findIndex((s) => /^🔑\s*Answers:/.test(s.trim()));
  const grammarAnswerKey = ansIdx >= 0 ? s1[ansIdx].replace(/^🔑\s*Answers:\s*/, "").split("·").map((x) => x.trim()) : quickPracticeAnswers.map((a, i) => `${i + 1}-${a}`);

  // ===== Reading passage from slide 2 (slide may be undefined for short lessons) =====
  let readingPassage = "";
  let keyPhrases: { english: string; mongolian: string; note?: string }[] = [];
  let speakingQuestions: string[] = [];
  let rolePlay: { speaker: string; text: string }[] = [];
  let speakingTip = "";
  if (s2) {
    const rIdx = findIndex(s2, (s) => /Reading Passage/.test(s));
    const kIdx = findIndex(s2, (s) => /Key Phrases/.test(s));
    if (rIdx >= 0 && kIdx > rIdx) {
      // Concatenate all runs between rIdx+2 and kIdx (skipping the "Bold = ..." instruction at rIdx+1)
      const passageRuns = s2.slice(rIdx + 2, kIdx);
      readingPassage = passageRuns.join("").replace(/\s+/g, " ").trim();
    }
    // Key phrases table: after "English Phrase" header, groups of 3 (en, mn, note)
    const epIdx = findIndex(s2, (s) => s.trim() === "English Phrase");
    if (epIdx >= 0) {
      // Skip 3 header cells (English Phrase, Mongolian / Монгол, Grammar Note)
      let i = epIdx + 3;
      while (i + 2 < s2.length) {
        const en = s2[i];
        const mn = s2[i + 1];
        const note = s2[i + 2];
        // stop if we hit speaking section
        if (/Speaking|Role Play|🗣|💬/.test(en)) break;
        keyPhrases.push({ english: en.trim(), mongolian: mn.trim(), note: note.trim() });
        i += 3;
      }
    }
    // Speaking questions: "1. ... / ..." lines after Speaking Practice
    const spIdx = findIndex(s2, (s) => /Speaking Practice/.test(s));
    if (spIdx >= 0) {
      const rpIdx = findIndex(s2, (s) => /Role Play/.test(s));
      const range = s2.slice(spIdx + 1, rpIdx > 0 ? rpIdx : s2.length);
      speakingQuestions = range.filter((s) => /^\d+\./.test(s.trim())).map((s) => s.trim());
    }
    // Role play: alternating "A:" / "B:" lines
    const rpIdx = findIndex(s2, (s) => /Role Play/.test(s));
    if (rpIdx >= 0) {
      const range = s2.slice(rpIdx + 1);
      for (const line of range) {
        const m = line.match(/^([AB]):\s*(.*)$/);
        if (m) rolePlay.push({ speaker: m[1], text: m[2].trim() });
      }
    }
    // Speaking tip
    const tipIdx = findIndex(s2, (s) => /A2 Tip|A2 зөвлөгөө/.test(s));
    if (tipIdx >= 0) speakingTip = s2[tipIdx];
  }

  // ===== Slide 3: listening + practice + matching + homework =====
  let listeningScript = "";
  let listeningQuestions: McqQ[] = [];
  let grammarPractice: string[] = [];
  let matchingExercise: { left: string; right: string }[] = [];
  let homework: string[] = [];
  let answerKey: string[] = [];
  let completionSummary: string[] = [];
  let nextLessonPreview = "";
  let listeningAnswers: string[] = [];

  if (s3) {
    const lsIdx2 = findIndex(s3, (s) => /Listening Script/.test(s));
    const cqIdx = findIndex(s3, (s) => /Comprehension Questions/.test(s));
    if (lsIdx2 >= 0 && cqIdx > lsIdx2) {
      // Skip the "Answer 10 questions WITHOUT looking at the text!" line at lsIdx2+1
      const scriptRuns = s3.slice(lsIdx2 + 2, cqIdx);
      // Speaker labels alternate; format as "Speaker: line"
      const lines: string[] = [];
      for (let i = 0; i < scriptRuns.length; i++) {
        const r = scriptRuns[i].trim();
        if (/:$/.test(r)) {
          const next = (scriptRuns[i + 1] || "").trim();
          lines.push(`${r} ${next}`);
          i++;
        } else if (r) {
          lines.push(r);
        }
      }
      listeningScript = lines.join("\n");
    }
    // Listening questions: starting after cqIdx, pattern: "1.", question, "a) ...", "b) ...", "c) ..."
    if (cqIdx >= 0) {
      // Find end: "Grammar Practice" or "Matching" header
      const endIdx = findIndex(s3, (s) => /Grammar Practice|Fill in the blank|✏️/.test(s), cqIdx + 1);
      const range = s3.slice(cqIdx + 2, endIdx > 0 ? endIdx : s3.length);
      let qNum = 0;
      for (let i = 0; i < range.length; i++) {
        const m = range[i].trim().match(/^(\d+)\.$/);
        if (m) {
          qNum++;
          const question = (range[i + 1] || "").trim();
          const opts: string[] = [];
          for (let k = 0; k < 3; k++) {
            const opt = (range[i + 2 + k] || "").trim();
            const om = opt.match(/^([abc])\)\s*(.*)$/);
            opts.push(om ? om[2] : opt);
          }
          listeningQuestions.push({
            id: `d${dayNum}-l${qNum}`,
            question,
            options: opts,
            answer: "", // fill from answer key below
          });
          i += 4;
        }
      }
    }
    // Fill-in (grammar practice on slide 3)
    const fillIdx = findIndex(s3, (s) => /Fill in the blank/.test(s));
    if (fillIdx >= 0) {
      const matchIdx = findIndex(s3, (s) => /Matching/.test(s), fillIdx + 1);
      const range = s3.slice(fillIdx + 1, matchIdx > 0 ? matchIdx : s3.length);
      for (const line of range) {
        if (/^\d+\.\s+_+/.test(line.trim())) {
          grammarPractice.push(line.replace(/\s*\(.*?\)\s*$/, "").trim());
        }
      }
    }
    // Matching: header "Matching — English → Mongolian" (NOT the section heading "Practice & Matching")
    const matchIdx = findIndex(s3, (s) => /^Matching\s*[—-]/.test(s.trim()));
    let matchingLefts: string[] = [];
    let matchingRights: string[] = [];
    if (matchIdx >= 0) {
      const hwIdx = findIndex(s3, (s) => /Homework/.test(s), matchIdx + 1);
      const range = s3.slice(matchIdx + 1, hwIdx > 0 ? hwIdx : s3.length);
      for (const line of range) {
        const lm = line.trim().match(/^\d+\.\s+(.*)$/);
        const rm = line.trim().match(/^[A-E]\.\s+(.*)$/);
        if (lm) matchingLefts.push(lm[1]);
        else if (rm) matchingRights.push(rm[1]);
      }
    }
    // Homework: lines after Homework header. Each item has emoji + content; we already have lines like "✍  " then "Writing: ..."
    const hwIdx = findIndex(s3, (s) => /^📝/.test(s.trim()) && /Homework/.test(s));
    if (hwIdx >= 0) {
      const akIdx = findIndex(s3, (s) => /Answer Key/.test(s), hwIdx + 1);
      const range = s3.slice(hwIdx + 1, akIdx > 0 ? akIdx : s3.length);
      for (const line of range) {
        const t = line.trim();
        if (/^(Writing|Vocabulary|Speaking|Review):/.test(t)) homework.push(t);
      }
    }
    // Answer key
    const akIdx = findIndex(s3, (s) => /Answer Key/.test(s));
    if (akIdx >= 0) {
      const compIdx = findIndex(s3, (s) => /Day \d+ Complete/.test(s), akIdx + 1);
      const range = s3.slice(akIdx + 1, compIdx > 0 ? compIdx : s3.length);
      for (const line of range) {
        const t = line.trim();
        if (/^\d+-/.test(t)) answerKey.push(t);
        if (/^Listening \(/i.test(t)) {
          // next entries in answerKey will include listening answer line
        }
      }
      // Find listening answers specifically
      for (let i = 0; i < range.length; i++) {
        if (/Listening \(/i.test(range[i])) {
          // Concatenate the next 1-2 lines until empty/header
          const txt = (range[i + 1] || "") + " " + (range[i + 2] || "");
          listeningAnswers = [...txt.matchAll(/(\d+)-([abc])/g)].map((m) => m[2]);
        }
      }
    }
    // Apply listening answers
    listeningQuestions = listeningQuestions.map((q, i) => ({ ...q, answer: listeningAnswers[i] || "" }));

    // Build matching pairs from answer key (e.g. "1-E · 2-C · 3-A · 4-B · 5-D")
    const matchingMapLine = answerKey.find((l) => /^[1-9]-[A-E]/.test(l)) || "";
    if (matchingLefts.length && matchingRights.length) {
      const pairTokens = [...matchingMapLine.matchAll(/(\d+)-([A-E])/g)];
      if (pairTokens.length) {
        for (const m of pairTokens) {
          const li = parseInt(m[1]) - 1;
          const ri = m[2].charCodeAt(0) - "A".charCodeAt(0);
          if (matchingLefts[li] && matchingRights[ri]) {
            matchingExercise.push({ left: matchingLefts[li], right: matchingRights[ri] });
          }
        }
      } else {
        for (let i = 0; i < Math.min(matchingLefts.length, matchingRights.length); i++) {
          matchingExercise.push({ left: matchingLefts[i], right: matchingRights[i] });
        }
      }
    }

    // Completion summary
    const compIdx = findIndex(s3, (s) => /Day \d+ Complete/.test(s));
    if (compIdx >= 0) {
      const range = s3.slice(compIdx + 1);
      for (const line of range) {
        const t = line.trim();
        if (/^✅/.test(t)) completionSummary.push(t.replace(/^✅\s*/, ""));
        if (/^🚀/.test(t)) nextLessonPreview = t.replace(/^🚀\s*/, "");
      }
    }
  }

  // ===== Build quiz from listening questions (matches existing day-1 pattern: quiz === listeningQuestions in MCQ form) =====
  const quiz: StoredQuiz[] = listeningQuestions.map((q, i) => {
    const correctIdx = ["a", "b", "c"].indexOf(q.answer);
    return {
      id: `d${dayNum}-q${i + 1}`,
      promptEn: q.question,
      promptMn: q.question,
      options: q.options,
      correctAnswer: q.options[correctIdx >= 0 ? correctIdx : 0] || "",
    };
  });

  return {
    day: dayNum,
    level: 2,
    titleEn,
    titleMn,
    objectiveEn,
    objectiveMn,
    contentEn: `${topicEn} — Past/Present focus with sequence words, daily 20 vocab, reading, grammar, listening, role-play, homework.`,
    contentMn: `${topicMn || topicEn} — өдрийн 20 шинэ үг, унших, дүрэм, сонсох, ярих дасгал, гэрийн даалгавар.`,
    durationMinutes: 60,
    vocabulary,
    quiz,
    lessonContent: {
      page1: {
        grammarTopic,
        grammarExplanation,
        grammarExplanationMn,
        commonMistakes,
        quickPractice,
        answerKey: grammarAnswerKey,
      },
      page2: {
        readingPassage,
        keyPhrases,
        speakingQuestions,
        rolePlay,
        speakingTip,
      },
      page3: {
        listeningScript,
        listeningQuestions,
        grammarPractice,
        matchingExercise,
        homework,
        answerKey,
        completionSummary,
        nextLessonPreview,
        comprehensionQuestions: [],
      },
    },
  };
}

const out: ParsedLesson[] = [];
for (let day = 31; day <= 45; day++) {
  const file = Object.keys(data).find((k) => new RegExp(`^Day${day}_Book2`).test(k));
  if (!file) {
    console.warn("Missing pptx for day", day);
    continue;
  }
  try {
    const lesson = parseLesson(data[file], day);
    out.push(lesson);
    console.log(
      `Day ${day}: "${lesson.titleEn}" — vocab=${lesson.vocabulary.length}, quiz=${lesson.quiz.length}, listening=${lesson.lessonContent.page3.listeningQuestions.length}, keyPhrases=${lesson.lessonContent.page2.keyPhrases.length}, rolePlay=${lesson.lessonContent.page2.rolePlay.length}`,
    );
  } catch (e) {
    console.error("Failed", day, e);
  }
}

fs.writeFileSync(path.join(ROOT, "scripts/book2-lessons.json"), JSON.stringify(out, null, 2));
console.log("\nWrote scripts/book2-lessons.json with", out.length, "lessons");
