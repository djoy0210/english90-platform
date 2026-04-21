# Lesson seed JSON contract

For each Day N PDF, write `scripts/seed-data/dayNN.json` (zero-padded, e.g. `day02.json`) with EXACTLY this shape (matches Day 1 in DB):

```json
{
  "day": 2,
  "level": 1,
  "titleEn": "Day 2: Numbers & Daily Routines",
  "titleMn": "Өдөр 2: Тоо ба өдөр тутмын үйл явдал",
  "objectiveEn": "About one hour. Learn 20 number/routine words, simple present grammar, listening, speaking, homework.",
  "objectiveMn": "Ойролцоогоор 1 цаг. 20 шинэ үг, present simple дүрэм, сонсох, ярих, гэрийн даалгавар.",
  "contentEn": "Short 1-2 sentence summary in English.",
  "contentMn": "Богино 1-2 өгүүлбэр Монголоор.",
  "vocabulary": [
    { "english": "...", "pronunciation": "/.../", "mongolian": "...", "example": "..." }
  ],
  "quiz": [
    { "question": "...", "options": ["A","B","C","D"], "answer": "A", "explanation": "..." }
  ],
  "lessonContent": {
    "page1": {
      "grammarTopic": "...",
      "grammarExplanation": "Bilingual paragraph: English then Mongolian.",
      "grammarTable": [
        { "subject": "I", "verb": "am", "positive": "...", "negative": "...", "question": "...", "mongolian": "Би" }
      ],
      "quickPractice": ["8 fill-in-the-blank items"],
      "answerKey": ["1-am","2-is", "..."],
      "commonMistakes": ["wrong → correct", "..."]
    },
    "page2": {
      "readingPassage": "Short paragraph using today's vocab.",
      "keyPhrases": [
        { "english": "...", "mongolian": "...", "note": "..." }
      ],
      "speakingQuestions": ["6 questions in English (Mongolian translation may follow)"],
      "rolePlay": [
        { "speaker": "A", "text": "..." },
        { "speaker": "B", "text": "..." }
      ],
      "speakingTip": "Encouraging tip in English."
    },
    "page3": {
      "listeningScript": "Dialog/monologue, 4-8 sentences.",
      "listeningQuestions": [
        { "question": "...", "options": ["a","b","c"], "answer": "a" }
      ],
      "grammarPractice": ["6 fill-in items"],
      "matchingExercise": [
        { "left": "English", "right": "Mongolian" }
      ],
      "homework": ["4 homework items"],
      "answerKey": ["Fill in blanks: ...", "Matching: ...", "Listening: ..."],
      "completionSummary": ["Learned 20 new words","..."]
    }
  }
}
```

## Rules
- `vocabulary` MUST have exactly 20 items copied from the PDF Page 1 table.
- `quiz` MUST have 8-10 items derived from listening + grammar (Page 3).
- `listeningQuestions` MUST have exactly 10 items (the 10 PDF comprehension Qs).
- `quickPractice` and `grammarPractice` use `_____` as the blank.
- All Mongolian must be Cyrillic. All bilingual fields must include both languages.
- DO NOT escape Cyrillic — write it as raw UTF-8 in the JSON.
- Source PDFs: `attached_assets/DayNN_*.pdf`. When two PDFs exist for the same day, use the one with the LARGER timestamp suffix (e.g. `1776779942xxx` over `1776779209xxx`).
