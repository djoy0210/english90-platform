import level1Json from "./level1.json";

export type CurriculumDay = {
  day: number;
  titleEn: string;
  titleMn: string;
  objectiveEn: string;
  objectiveMn: string;
  vocabulary: { english: string; pronunciation: string; mongolian: string; example: string }[];
  grammarTitleEn: string;
  grammarTitleMn: string;
  grammarExplanationEn: string;
  grammarExplanationMn: string;
  readingPassageEn: string;
  speakingPrompts: string[];
  rolePlayLines: { speaker: string; en: string }[];
  listeningScriptEn: string;
  quiz: { promptEn: string; promptMn: string; options: string[]; correctAnswer: string }[];
  homeworkEn: string;
  homeworkMn: string;
};

const stripPrefix = (s: string) => s.replace(/^\s*[a-d]\)\s*/i, "").trim();

export const CURRICULUM_LEVEL1: Record<number, CurriculumDay> = (() => {
  const raw = level1Json as Record<string, CurriculumDay>;
  const out: Record<number, CurriculumDay> = {};
  for (const [k, v] of Object.entries(raw)) {
    const day = Number(k);
    out[day] = {
      ...v,
      day,
      quiz: v.quiz.map((q) => {
        const cleanedOptions = q.options.map(stripPrefix);
        const cleanedAnswer = stripPrefix(q.correctAnswer);
        const finalAnswer = cleanedOptions.includes(cleanedAnswer)
          ? cleanedAnswer
          : (cleanedOptions[0] ?? cleanedAnswer);
        return { ...q, options: cleanedOptions, correctAnswer: finalAnswer };
      }),
    };
  }
  return out;
})();

export const CURRICULUM_VERSION = "level1-v1";
