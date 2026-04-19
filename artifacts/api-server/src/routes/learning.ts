import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  finalTestsTable,
  contentUnlocksTable,
  lessonProgressTable,
  lessonsTable,
  paymentInvoicesTable,
  quizAttemptsTable,
  usersTable,
  type FinalTest,
  type Lesson,
  type PaymentInvoice,
  type StoredQuizQuestion,
  type User,
} from "@workspace/db/schema";
import {
  AdminCreateLessonBody,
  AdminDeleteLessonParams,
  AdminUpdateLessonBody,
  AdminUpdateLessonParams,
  CheckQpayInvoiceParams,
  CreateCheckoutSessionBody,
  CreateQpayInvoiceBody,
  GetQpayInvoiceParams,
  GetFinalTestParams,
  GetLessonParams,
  SubmitPlacementTestBody,
  SubmitFinalTestBody,
  SubmitFinalTestParams,
  SubmitLessonQuizBody,
  SubmitLessonQuizParams,
} from "@workspace/api-zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type Request } from "express";
import { checkQPayInvoiceStatus, createQPayInvoice, isQPayConfigured, verifyQPayWebhook, type QPayInvoiceStatus } from "../services/qpay";

const router = Router();
let seedPromise: Promise<void> | null = null;

type PublicQuestion = {
  id: string;
  promptEn: string;
  promptMn: string;
  options: string[];
};

function getQuestionPublic(question: StoredQuizQuestion): PublicQuestion {
  return {
    id: question.id,
    promptEn: question.promptEn,
    promptMn: question.promptMn,
    options: question.options,
  };
}

function getLevel(day: number) {
  return Math.ceil(day / 30);
}

function getStartingDay(user: User) {
  return ((user.placementLevel ?? 1) - 1) * 30 + 1;
}

function getCurrentDay(user: User, completedCount: number) {
  return Math.min(90, getStartingDay(user) + completedCount);
}

function getLessonTemplateContent() {
  return {
    page1: {
      grammarTopic: `Verb "To Be" — am / is / are`,
      grammarExplanation: `The verb "to be" is the most important verb in English. In Mongolian you can say "Би оюутан" without a verb, but in English you must say "I am a student." Use am with I, is with he/she/it, and are with you/we/they.`,
      grammarTable: [
        { subject: "I", verb: "am", positive: "I am happy.", negative: "I am not sad.", question: "Am I right?", mongolian: "Би" },
        { subject: "You", verb: "are", positive: "You are kind.", negative: "You are not late.", question: "Are you ready?", mongolian: "Та / Чи" },
        { subject: "He", verb: "is", positive: "He is a doctor.", negative: "He is not here.", question: "Is he your friend?", mongolian: "Тэр (эр)" },
        { subject: "She", verb: "is", positive: "She is a teacher.", negative: "She is not busy.", question: "Is she a student?", mongolian: "Тэр (эм)" },
        { subject: "We", verb: "are", positive: "We are students.", negative: "We are not tired.", question: "Are we late?", mongolian: "Бид" },
        { subject: "They", verb: "are", positive: "They are friends.", negative: "They are not here.", question: "Are they ready?", mongolian: "Тэд" },
      ],
      quickPractice: ["I _____ a student.", "She _____ from Mongolia.", "They _____ my friends.", "He _____ a teacher.", "We _____ happy.", "You _____ very kind.", "My name _____ Bat.", "I _____ fine, thank you."],
      commonMistakes: ["He are my friend. → He is my friend.", "I is happy. → I am happy.", "She am a doctor. → She is a doctor.", "They is here. → They are here."],
      answerKey: ["1-am", "2-is", "3-are", "4-is", "5-are", "6-are", "7-is", "8-am"],
    },
    page2: {
      readingPassage: `Hello! My name is Bat. I am a student. I am from Ulaanbaatar, Mongolia. This is my friend, Sarnai. She is a teacher. "Good morning, Sarnai!" "Good morning, Bat! How are you?" "I am fine, thank you. And you?" "I am fine too. Nice to meet you!" "Nice to meet you too! Goodbye, Bat!" "Bye, Sarnai! See you tomorrow!"`,
      keyPhrases: [
        { english: "My name is Bat", mongolian: "Миний нэр Бат", note: "My name is + [your name]" },
        { english: "I am a student", mongolian: "Би оюутан", note: "I am + job or role" },
        { english: "I am from ...", mongolian: "Би ...-аас ирсэн", note: "I am from + city/country" },
        { english: "How are you?", mongolian: "Та сайн уу? Юу байна?", note: "Standard daily greeting" },
        { english: "I am fine, thank you", mongolian: "Би сайн байна, баярлалаа", note: "Most common answer" },
        { english: "Nice to meet you", mongolian: "Танилцсандаа таатай байна", note: "Say when meeting someone new" },
      ],
      speakingQuestions: ["What is your name?", "Where are you from?", "Are you a student or a teacher?", "How are you today?", "How do you greet someone in the morning?", "What do you say when you meet someone new?"],
      rolePlay: [
        { speaker: "A", text: "Hello! My name is Bat. What is your name?" },
        { speaker: "B", text: "Hi Bat! My name is Sarnai. Nice to meet you!" },
        { speaker: "A", text: "Nice to meet you, Sarnai! How are you today?" },
        { speaker: "B", text: "I am fine, thank you! And you?" },
        { speaker: "A", text: "I'm fine too. Are you a student here?" },
        { speaker: "B", text: "Yes, I am a student. And you?" },
      ],
      speakingTip: "Don't worry about mistakes — just keep talking. Confidence is more important than perfection at this stage.",
    },
    page3: {
      listeningScript: `Teacher: Good morning, class! Students: Good morning, teacher! Teacher: My name is Ms. Bold. I am your English teacher. What is your name? Bat: My name is Bat. I am from Ulaanbaatar. I am a student. Teacher: Nice to meet you, Bat. How are you today? Bat: I am fine, thank you. And you? Teacher: I am fine too! Sarnai: Hello! My name is Sarnai. I am also a student. Nice to meet you, Ms. Bold! Teacher: Nice to meet you too, Sarnai! Welcome to English class, everyone! Students: Thank you, Ms. Bold!`,
      comprehensionQuestions: [],
      grammarPractice: ["I _____ a student.", "She _____ from Mongolia.", "They _____ my friends.", "He _____ a teacher.", "We _____ happy.", "You _____ very kind."],
      matchingExercise: [
        { left: "Good morning", right: "Өглөөний мэнд" },
        { left: "Thank you", right: "Баярлалаа" },
        { left: "Nice to meet you", right: "Танилцсандаа таатай байна" },
        { left: "Excuse me", right: "Өршөөгөөрэй" },
        { left: "You're welcome", right: "Зүгээр ээ" },
      ],
      homework: ["Writing: Write 5+ sentences: My name is... / I am from... / I am a...", "Vocabulary: Write all 20 words 3 times. Cover and test yourself.", "Speaking: Greet 3 different people in English today.", "Review: Re-read the listening script before sleeping."],
      answerKey: ["Fill in blanks: 1-am, 2-is, 3-are, 4-is, 5-are, 6-are", "Matching: 1-Good morning=Өглөөний мэнд, 2-Thank you=Баярлалаа, 3-Nice to meet you=Танилцсандаа таатай байна, 4-Excuse me=Өршөөгөөрэй, 5-You're welcome=Зүгээр ээ", "Listening: 1-a, 2-c, 3-b, 4-c, 5-c, 6-b, 7-b, 8-c, 9-b, 10-b"],
      completionSummary: ["Learned 20 new words", "Mastered verb 'to be'", "Read a passage", "Completed grammar practice", "Practiced speaking", "Completed listening practice", "Introduced yourself"],
      nextLessonPreview: "Day 2: Numbers & Daily Routines",
    },
  };
}

const placementQuestions: StoredQuizQuestion[] = [
  { id: "placement-q1", promptEn: "Choose the correct sentence.", promptMn: "Зөв өгүүлбэрийг сонгоно уу.", options: ["I am a student.", "I is a student.", "I are a student."], correctAnswer: "I am a student." },
  { id: "placement-q2", promptEn: "What does 'Good morning' mean?", promptMn: "'Good morning' ямар утгатай вэ?", options: ["Өглөөний мэнд", "Оройн мэнд", "Баяртай"], correctAnswer: "Өглөөний мэнд" },
  { id: "placement-q3", promptEn: "Complete: She _____ from Mongolia.", promptMn: "Гүйцээ: She _____ from Mongolia.", options: ["am", "is", "are"], correctAnswer: "is" },
  { id: "placement-q4", promptEn: "Choose the best reply: How are you?", promptMn: "Хамгийн зөв хариултыг сонго: How are you?", options: ["I am fine, thank you.", "My name morning.", "Goodbye student."], correctAnswer: "I am fine, thank you." },
  { id: "placement-q5", promptEn: "Complete: They _____ my friends.", promptMn: "Гүйцээ: They _____ my friends.", options: ["is", "am", "are"], correctAnswer: "are" },
  { id: "placement-q6", promptEn: "Choose the correct past sentence.", promptMn: "Зөв өнгөрсөн цагийн өгүүлбэрийг сонго.", options: ["Yesterday I went to school.", "Yesterday I go to school.", "Yesterday I going school."], correctAnswer: "Yesterday I went to school." },
  { id: "placement-q7", promptEn: "Choose the polite request.", promptMn: "Эелдэг хүсэлтийг сонго.", options: ["Could you help me, please?", "Help me now.", "You help."], correctAnswer: "Could you help me, please?" },
  { id: "placement-q8", promptEn: "Complete: I have lived here _____ 2020.", promptMn: "Гүйцээ: I have lived here _____ 2020.", options: ["for", "since", "during"], correctAnswer: "since" },
  { id: "placement-q9", promptEn: "Choose the sentence with correct word order.", promptMn: "Үгийн зөв дараалалтай өгүүлбэрийг сонго.", options: ["I usually drink tea in the morning.", "Usually drink I tea morning in.", "Tea morning I usually drink."], correctAnswer: "I usually drink tea in the morning." },
  { id: "placement-q10", promptEn: "Choose the best meaning: I would rather stay home.", promptMn: "Зөв утгыг сонго: I would rather stay home.", options: ["Би гэртээ байсан нь дээр.", "Би гэр олж чаддаггүй.", "Би гэрээ зарсан."], correctAnswer: "Би гэртээ байсан нь дээр." },
  { id: "placement-q11", promptEn: "Choose the correct conditional.", promptMn: "Зөв нөхцөл өгүүлбэрийг сонго.", options: ["If I have time, I will call you.", "If I will have time, I call you.", "If time have, I called you."], correctAnswer: "If I have time, I will call you." },
  { id: "placement-q12", promptEn: "Choose the clearest opinion sentence.", promptMn: "Санал бодлоо зөв илэрхийлсэн өгүүлбэрийг сонго.", options: ["In my opinion, daily practice is the best way to improve.", "Opinion daily best improve.", "I best way practice opinion."], correctAnswer: "In my opinion, daily practice is the best way to improve." },
];

const dayOneLesson = {
  day: 1,
  level: 1,
  titleEn: "Day 1: Greetings & Introductions",
  titleMn: "Өдөр 1: Мэндчилгээ ба танилцуулах",
  objectiveEn: "Spend about one hour learning 20 greeting words, practicing the verb to be, reading and speaking a short introduction, listening for details, and completing homework.",
  objectiveMn: "Ойролцоогоор нэг цаг зарцуулж 20 мэндчилгээний үг, to be дүрэм, унших/ярих дасгал, сонсголын ойлголт болон гэрийн даалгаврыг хийнэ.",
  contentEn: `60-minute self-study plan:
1. Vocabulary pronunciation — 15 minutes. Click each word, listen, repeat 3 times, then cover the Mongolian meaning and test yourself.
2. Grammar — 10 minutes. Study the verb "to be": I am, you/we/they are, he/she/it is. Use it for names, jobs, nationality, location, age, and feelings.
3. Reading & speaking — 15 minutes. Read aloud twice: Hello! My name is Bat. I am a student. I am from Ulaanbaatar, Mongolia. This is my friend, Sarnai. She is a teacher. "Good morning, Sarnai!" "Good morning, Bat! How are you?" "I am fine, thank you. And you?" "I am fine too. Nice to meet you!" "Nice to meet you too! Goodbye, Bat!" "Bye, Sarnai! See you tomorrow!"
4. Role play — 10 minutes. A: Hello! My name is Bat. What is your name? B: Hi Bat! My name is Sarnai. Nice to meet you! A: Nice to meet you, Sarnai! How are you today? B: I am fine, thank you! And you? A: I'm fine too. Are you a student here? B: Yes, I am a student. And you?
5. Listening — 10 minutes. Listen/read the script and answer the quiz: Teacher: Good morning, class! Students: Good morning, teacher! Teacher: My name is Ms. Bold. I am your English teacher. What is your name? Bat: My name is Bat. I am from Ulaanbaatar. I am a student. Teacher: Nice to meet you, Bat. How are you today? Bat: I am fine, thank you. And you? Teacher: I am fine too! Sarnai: Hello! My name is Sarnai. I am also a student. Nice to meet you, Ms. Bold! Teacher: Nice to meet you too, Sarnai! Welcome to English class, everyone! Students: Thank you, Ms. Bold!

Homework:
Writing: Write 5+ sentences using My name is..., I am from..., I am a...
Vocabulary: Write all 20 words 3 times. Cover and test yourself.
Speaking: Greet 3 different people in English today.
Review: Re-read the listening script before sleeping.`,
  contentMn: `60 минутын өөрөө сурах төлөвлөгөө:
1. Үгийн дуудлага — 15 минут. Үг бүр дээр дарж сонсоод 3 удаа давтана. Дараа нь Монгол утгыг хааж өөрийгөө шалгана.
2. Дүрэм — 10 минут. "To be" үйл үгийг судална: I am, you/we/they are, he/she/it is. Нэр, ажил, үндэстэн, байршил, нас, мэдрэмж хэлэхэд хэрэглэнэ.
3. Унших ба ярих — 15 минут. Эхийг 2 удаа чангаар уншина: Hello! My name is Bat. I am a student. I am from Ulaanbaatar, Mongolia. This is my friend, Sarnai. She is a teacher. "Good morning, Sarnai!" "Good morning, Bat! How are you?" "I am fine, thank you. And you?" "I am fine too. Nice to meet you!" "Nice to meet you too! Goodbye, Bat!" "Bye, Sarnai! See you tomorrow!"
4. Дүрд тоглох — 10 минут. A/B хоёр дүрээр ярьж давтана. Алдаа гаргасан ч зогсолгүй чангаар ярь.
5. Сонсох — 10 минут. Багш, Bat, Sarnai нарын яриаг сонсоод/уншаад сорилын асуултад хариулна.

Гэрийн даалгавар:
Бичих: My name is..., I am from..., I am a... ашиглан 5+ өгүүлбэр бич.
Үгийн сан: 20 үгийг бүгдийг 3 удаа бич. Хааж өөрийгөө шалга.
Ярих: Өнөөдөр 3 өөр хүнтэй Англиар мэндчил.
Давтах: Унтахаасаа өмнө listening script-ийг дахин унш.`,
  lessonContent: getLessonTemplateContent(),
  pdfUrl: null,
  durationMinutes: 60,
  isPremium: false,
  vocabulary: [
    { english: "Hello", pronunciation: "/həˈloʊ/", mongolian: "Сайн уу", example: "Hello! My name is Bat." },
    { english: "Hi", pronunciation: "/haɪ/", mongolian: "Сайн уу (өдөр тутмын яриа)", example: "Hi! How are you?" },
    { english: "Good morning", pronunciation: "/ɡʊd ˈmɔːrnɪŋ/", mongolian: "Өглөөний мэнд", example: "Good morning, teacher!" },
    { english: "Good afternoon", pronunciation: "/ɡʊd ˌæftərˈnuːn/", mongolian: "Өдрийн мэнд", example: "Good afternoon, sir." },
    { english: "Good evening", pronunciation: "/ɡʊd ˈiːvnɪŋ/", mongolian: "Оройн мэнд", example: "Good evening, everyone." },
    { english: "Goodbye", pronunciation: "/ˌɡʊdˈbaɪ/", mongolian: "Баяртай (албан ёсны)", example: "Goodbye! See you tomorrow." },
    { english: "Bye", pronunciation: "/baɪ/", mongolian: "Баяртай (өдөр тутмын яриа)", example: "Bye! Take care." },
    { english: "My name is", pronunciation: "/maɪ neɪm ɪz/", mongolian: "Миний нэр ... мөн", example: "My name is Sarnai." },
    { english: "I am", pronunciation: "/aɪ æm/", mongolian: "Би ... юм", example: "I am a student." },
    { english: "Nice to meet you", pronunciation: "/naɪs tə miːt juː/", mongolian: "Танилцсандаа таатай байна", example: "Nice to meet you, Bat." },
    { english: "Please", pronunciation: "/pliːz/", mongolian: "Гуйя", example: "Please sit down." },
    { english: "Thank you", pronunciation: "/θæŋk juː/", mongolian: "Баярлалаа", example: "Thank you very much!" },
    { english: "You're welcome", pronunciation: "/jʊr ˈwɛlkəm/", mongolian: "Зүгээр ээ", example: "You're welcome, friend." },
    { english: "Sorry", pronunciation: "/ˈsɑːri/", mongolian: "Уучлаарай", example: "Sorry, I am late." },
    { english: "Excuse me", pronunciation: "/ɪkˈskjuːz miː/", mongolian: "Өршөөгөөрэй", example: "Excuse me, where is the exit?" },
    { english: "Yes", pronunciation: "/jɛs/", mongolian: "Тийм", example: "Yes, I am from Mongolia." },
    { english: "No", pronunciation: "/noʊ/", mongolian: "Үгүй", example: "No, I am not a teacher." },
    { english: "How are you?", pronunciation: "/haʊ ɑːr juː/", mongolian: "Та сайн уу? Юу байна?", example: "Hi! How are you?" },
    { english: "I am fine", pronunciation: "/aɪ æm faɪn/", mongolian: "Би сайн байна", example: "I am fine, thank you." },
    { english: "And you?", pronunciation: "/ænd juː/", mongolian: "Харин та?", example: "I am fine. And you?" },
  ],
  quiz: [
    { id: "d1-q1", promptEn: "What is the teacher's name?", promptMn: "Багшийн нэр хэн бэ?", options: ["Ms. Bold", "Ms. Sarnai", "Ms. Bat"], correctAnswer: "Ms. Bold" },
    { id: "d1-q2", promptEn: "What is Ms. Bold's job?", promptMn: "Ms. Bold ямар ажилтай вэ?", options: ["student", "doctor", "English teacher"], correctAnswer: "English teacher" },
    { id: "d1-q3", promptEn: "Where is Bat from?", promptMn: "Bat хаанаас ирсэн бэ?", options: ["Beijing", "Ulaanbaatar", "Seoul"], correctAnswer: "Ulaanbaatar" },
    { id: "d1-q4", promptEn: "How is Bat today?", promptMn: "Bat өнөөдөр хэр байна вэ?", options: ["tired", "sad", "fine"], correctAnswer: "fine" },
    { id: "d1-q5", promptEn: "What is Sarnai?", promptMn: "Sarnai юу вэ?", options: ["a teacher", "a doctor", "a student"], correctAnswer: "a student" },
    { id: "d1-q6", promptEn: "Complete: I _____ a student.", promptMn: "Гүйцээ: I _____ a student.", options: ["am", "is", "are"], correctAnswer: "am" },
    { id: "d1-q7", promptEn: "Complete: She _____ from Mongolia.", promptMn: "Гүйцээ: She _____ from Mongolia.", options: ["am", "is", "are"], correctAnswer: "is" },
    { id: "d1-q8", promptEn: "What does 'Good morning' mean?", promptMn: "'Good morning' ямар утгатай вэ?", options: ["Оройн мэнд", "Өглөөний мэнд", "Баяртай"], correctAnswer: "Өглөөний мэнд" },
    { id: "d1-q9", promptEn: "What should you say when you meet someone new?", promptMn: "Шинэ хүнтэй танилцахдаа юу гэж хэлэх вэ?", options: ["Nice to meet you", "Goodbye", "No"], correctAnswer: "Nice to meet you" },
    { id: "d1-q10", promptEn: "What is today's homework?", promptMn: "Өнөөдрийн гэрийн даалгавар юу вэ?", options: ["Write sentences and practice vocabulary", "Skip vocabulary", "Only watch a video"], correctAnswer: "Write sentences and practice vocabulary" },
  ],
};

function buildVocabulary(focus: string) {
  const words = [
    ["practice", "/ˈpræktɪs/", "давтах, дадлага хийх", "I practice English every morning."],
    ["sentence", "/ˈsɛntəns/", "өгүүлбэр", "Write one sentence about your day."],
    ["listen", "/ˈlɪsən/", "сонсох", "Listen and repeat the word."],
    ["repeat", "/rɪˈpiːt/", "давтах", "Repeat the sentence three times."],
    ["speak", "/spiːk/", "ярих", "Speak English out loud."],
    ["read", "/riːd/", "унших", "Read the passage twice."],
    ["write", "/raɪt/", "бичих", "Write your homework tonight."],
    ["question", "/ˈkwɛstʃən/", "асуулт", "Answer the question in English."],
    ["answer", "/ˈænsər/", "хариулт", "Choose the best answer."],
    ["meaning", "/ˈmiːnɪŋ/", "утга", "What is the meaning of this word?"],
    ["example", "/ɪɡˈzæmpəl/", "жишээ", "Read the example sentence."],
    ["homework", "/ˈhoʊmwɜːrk/", "гэрийн даалгавар", "Finish your homework before tomorrow."],
    ["review", "/rɪˈvjuː/", "давтах, хянах", "Review the lesson before sleeping."],
    ["grammar", "/ˈɡræmər/", "дүрэм", "Study the grammar rule."],
    ["vocabulary", "/voʊˈkæbjəleri/", "үгийн сан", "Learn twenty vocabulary words."],
    ["dialogue", "/ˈdaɪəlɔːɡ/", "харилцан яриа", "Practice the dialogue with a friend."],
    ["teacher", "/ˈtiːtʃər/", "багш", "The teacher speaks slowly."],
    ["student", "/ˈstuːdənt/", "оюутан, сурагч", "I am a student."],
    ["today", "/təˈdeɪ/", "өнөөдөр", `Today I study ${focus}.`],
    [focus.split(" ")[0] || "study", "", "өнөөдрийн гол үг", `Today I talk about ${focus}.`],
  ];
  return words.map(([english, pronunciation, mongolian, example]) => ({ english, pronunciation, mongolian, example }));
}

function buildSeedLesson(day: number) {
  if (day === 1) return dayOneLesson;
  const level = getLevel(day);
  const levelName = level === 1 ? "Foundation" : level === 2 ? "Everyday Communication" : "Confident Expression";
  const focus = [
    "greetings and introductions",
    "daily routines",
    "family and people",
    "food and shopping",
    "work and study",
    "travel and directions",
    "past experiences",
    "future plans",
    "opinions and reasons",
    "problem solving",
  ][(day - 1) % 10];
  return {
    day,
    level,
    titleEn: `Day ${day}: ${focus.replace(/\b\w/g, (c) => c.toUpperCase())}`,
    titleMn: `${day}-р өдөр: ${focus}`,
    objectiveEn: `Practice ${focus} with useful English patterns for self-study.`,
    objectiveMn: `${focus} сэдвээр өдөр тутмын Англи хэлний өгүүлбэр, үгийн санг давтана.`,
    contentEn: `Level ${level} (${levelName}) lesson for day ${day}. Read the model sentences aloud, compare the Mongolian meaning, then write three personal sentences using today's pattern. Example pattern: I can talk about ${focus} in simple, clear English.`,
    contentMn: `${level}-р түвшин (${levelName}) - ${day}-р өдрийн хичээл. Жишээ өгүүлбэрийг чангаар уншаад Монгол утгатай нь харьцуулж, өнөөдрийн бүтэц ашиглан өөрийн 3 өгүүлбэр бичээрэй.`,
    lessonContent: {
      ...getLessonTemplateContent(),
      page1: {
        ...getLessonTemplateContent().page1,
        grammarTopic: `Daily English pattern for ${focus}`,
        grammarExplanation: `Study today's pattern, then make your own sentences about ${focus}.`,
      },
      page3: {
        ...getLessonTemplateContent().page3,
        nextLessonPreview: `Day ${day + 1}: Continue your 90-day practice`,
      },
    },
    pdfUrl: null,
    durationMinutes: 60,
    isPremium: day > 7,
    vocabulary: buildVocabulary(focus),
    quiz: [
      {
        id: `d${day}-q1`,
        promptEn: "Choose the best Mongolian meaning for practice.",
        promptMn: "practice гэдэг үгийн зөв утгыг сонгоно уу.",
        options: ["мартах", "давтах", "хаах", "унтах"],
        correctAnswer: "давтах",
      },
      {
        id: `d${day}-q2`,
        promptEn: "Complete: I ___ English every morning.",
        promptMn: "Өгүүлбэрийг гүйцээнэ үү: I ___ English every morning.",
        options: ["practice", "practices", "practiced", "practicing"],
        correctAnswer: "practice",
      },
      {
        id: `d${day}-q3`,
        promptEn: `What is today's main topic?`,
        promptMn: "Өнөөдрийн гол сэдэв юу вэ?",
        options: [focus, "weather only", "numbers only", "alphabet only"],
        correctAnswer: focus,
      },
    ],
  };
}

async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await db.select({ id: lessonsTable.id }).from(lessonsTable).limit(1);
      if (existing.length > 0) {
        const currentDayOne = await db.select().from(lessonsTable).where(eq(lessonsTable.day, 1)).limit(1);
        if ((currentDayOne[0]?.vocabulary?.length ?? 0) < 20 || !currentDayOne[0]?.lessonContent) {
          await db.update(lessonsTable).set({ ...dayOneLesson, updatedAt: new Date() }).where(eq(lessonsTable.day, 1));
        }
        return;
      }

      await db.insert(lessonsTable).values(Array.from({ length: 90 }, (_, index) => buildSeedLesson(index + 1))).onConflictDoNothing();
      await db.insert(finalTestsTable).values([1, 2, 3].map((level) => ({
        level,
        titleEn: `Level ${level} Final Test`,
        titleMn: `${level}-р түвшний эцсийн шалгалт`,
        questions: [
          {
            id: `final-${level}-q1`,
            promptEn: "Choose the sentence with correct word order.",
            promptMn: "Үгийн зөв дараалалтай өгүүлбэрийг сонгоно уу.",
            options: ["I study English every day.", "Study I English day every.", "English every I day study.", "Every study English I day."],
            correctAnswer: "I study English every day.",
          },
          {
            id: `final-${level}-q2`,
            promptEn: "Which phrase asks for help politely?",
            promptMn: "Аль нь тусламж эелдгээр хүссэн хэллэг вэ?",
            options: ["Could you help me?", "You help now.", "Give help.", "Help must."],
            correctAnswer: "Could you help me?",
          },
          {
            id: `final-${level}-q3`,
            promptEn: "Translate: Би Англи хэл сурч байна.",
            promptMn: "Орчуулна уу: Би Англи хэл сурч байна.",
            options: ["I am learning English.", "I English learned yesterday.", "English learns me.", "I am learn English."],
            correctAnswer: "I am learning English.",
          },
        ],
      }))).onConflictDoNothing();
    })();
  }
  await seedPromise;
}

async function getCurrentUser(req: Request): Promise<User> {
  const auth = getAuth(req);
  const clerkUserId = auth.userId ?? "demo-user";
  const email = auth.userId ? `${auth.userId}@learner.local` : "demo@english90.local";
  const name = auth.userId ? "English Learner" : "Demo Learner";
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
  if (existing[0]) {
    if (process.env.NODE_ENV !== "production" && existing[0].role !== "admin") {
      const [updated] = await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, existing[0].id)).returning();
      return updated;
    }
    return existing[0];
  }

  const adminCount = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "admin"));
  const role = process.env.NODE_ENV !== "production" || (adminCount[0]?.count ?? 0) === 0 ? "admin" : "learner";
  const [user] = await db
    .insert(usersTable)
    .values({ id: clerkUserId, clerkUserId, email, name, role, placementCompleted: role === "admin" })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { clerkUserId, email, name },
    })
    .returning();
  if (process.env.NODE_ENV !== "production" && user.role !== "admin") {
    const [updated] = await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, user.id)).returning();
    return updated;
  }
  return user;
}

function ensureAdmin(user: User) {
  if (user.role !== "admin") {
    const error = new Error("Admin access required");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

type UnlockSet = Set<string>;

function lessonProductId(lessonId: string) {
  return `lesson:${lessonId}`;
}

function levelProductId(level: number) {
  return `level:${level}`;
}

function isUnlocked(lesson: Lesson, user: User, unlocks: UnlockSet = new Set()) {
  return !lesson.isPremium || user.premium || user.role === "admin" || unlocks.has("course:full") || unlocks.has(levelProductId(lesson.level)) || unlocks.has(lessonProductId(lesson.id));
}

async function getUnlockedProducts(userId: string): Promise<UnlockSet> {
  const unlocks = await db.select().from(contentUnlocksTable).where(eq(contentUnlocksTable.userId, userId));
  return new Set(unlocks.map((unlock) => unlock.productId));
}

function toLessonSummary(lesson: Lesson, user: User, progress?: { completed: boolean; bestScore: number }, unlocks: UnlockSet = new Set()) {
  return {
    id: lesson.id,
    day: lesson.day,
    level: lesson.level,
    titleEn: lesson.titleEn,
    titleMn: lesson.titleMn,
    durationMinutes: lesson.durationMinutes,
    isPremium: lesson.isPremium,
    isUnlocked: isUnlocked(lesson, user, unlocks),
    completed: progress?.completed ?? false,
    bestScore: progress?.bestScore ?? null,
  };
}

function toLessonDetail(lesson: Lesson, user: User, progress?: { completed: boolean; bestScore: number }, unlocks: UnlockSet = new Set()) {
  const unlocked = isUnlocked(lesson, user, unlocks);
  return {
    ...toLessonSummary(lesson, user, progress, unlocks),
    objectiveEn: lesson.objectiveEn,
    objectiveMn: lesson.objectiveMn,
    contentEn: unlocked ? lesson.contentEn : "Premium access is required to unlock this lesson.",
    contentMn: unlocked ? lesson.contentMn : "Энэ хичээлийг нээхийн тулд premium эрх шаардлагатай.",
    lessonContent: unlocked ? (lesson.lessonContent ?? getLessonTemplateContent()) : {},
    pdfUrl: unlocked ? lesson.pdfUrl ?? null : null,
    vocabulary: unlocked ? lesson.vocabulary : [],
    quiz: unlocked ? lesson.quiz.map(getQuestionPublic) : [],
  };
}

function grade(questions: StoredQuizQuestion[], answers: { questionId: string; answer: string }[]) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]));
  const correctAnswers = questions.map((question) => {
    const isCorrect = answerMap.get(question.id) === question.correctAnswer;
    return { questionId: question.id, correctAnswer: question.correctAnswer, isCorrect };
  });
  const score = correctAnswers.filter((answer) => answer.isCorrect).length;
  const total = questions.length;
  const percentage = total === 0 ? 0 : Math.round((score / total) * 100);
  return { score, total, percentage, passed: percentage >= 70, correctAnswers };
}

async function historyFor(userId: string) {
  const attempts = await db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.userId, userId)).orderBy(desc(quizAttemptsTable.createdAt)).limit(50);
  return attempts.map((attempt) => ({
    id: attempt.id,
    type: attempt.type as "lesson" | "final",
    titleEn: attempt.titleEn,
    titleMn: attempt.titleMn,
    day: attempt.day ?? null,
    level: attempt.level,
    score: attempt.score,
    total: attempt.total,
    percentage: attempt.percentage,
    createdAt: attempt.createdAt.toISOString(),
  }));
}

function getPublicBaseUrl(req: Request) {
  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

async function resolveProduct(productId: string) {
  if (productId === "course:full") {
    return { productId, productName: "Full 90-Day Course", amount: 79000, lessonId: null as string | null, level: null as number | null };
  }

  if (productId.startsWith("level:")) {
    const level = Number(productId.split(":")[1]);
    if (![1, 2, 3].includes(level)) throw new Error("Invalid level product");
    return { productId, productName: `Level ${level} Package`, amount: 29000, lessonId: null as string | null, level };
  }

  if (productId.startsWith("lesson:")) {
    const lessonId = productId.split(":")[1];
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
    if (!lesson) throw new Error("Lesson product not found");
    return { productId, productName: `Day ${lesson.day}: ${lesson.titleEn}`, amount: 4900, lessonId, level: lesson.level };
  }

  throw new Error("Invalid product id");
}

function invoiceToResponse(invoice: PaymentInvoice, providerConnected = isQPayConfigured(), message?: string) {
  return {
    id: invoice.id,
    invoiceCode: invoice.invoiceCode,
    qpayInvoiceId: invoice.qpayInvoiceId,
    paymentStatus: invoice.paymentStatus,
    productId: invoice.productId,
    productName: invoice.productName,
    amount: invoice.amount,
    currency: invoice.currency,
    unlockStatus: invoice.unlockStatus,
    qrText: invoice.qrText,
    qrImage: invoice.qrImage,
    paymentUrl: invoice.paymentUrl,
    providerConnected,
    message,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

async function unlockPurchasedContent(invoice: PaymentInvoice) {
  if (invoice.paymentStatus !== "paid" || invoice.unlockStatus === "unlocked") return invoice;
  const product = await resolveProduct(invoice.productId);

  await db.insert(contentUnlocksTable).values({
    userId: invoice.userId,
    productId: invoice.productId,
    lessonId: product.lessonId,
    level: product.level,
    unlockedByInvoiceId: invoice.id,
  }).onConflictDoNothing();

  if (invoice.productId === "course:full") {
    await db.update(usersTable).set({ premium: true }).where(eq(usersTable.id, invoice.userId));
  }

  const [updated] = await db.update(paymentInvoicesTable).set({ unlockStatus: "unlocked", updatedAt: new Date() }).where(eq(paymentInvoicesTable.id, invoice.id)).returning();
  return updated;
}

async function updateInvoiceStatus(invoice: PaymentInvoice, status: QPayInvoiceStatus, payload?: Record<string, unknown>) {
  const [updated] = await db.update(paymentInvoicesTable).set({
    paymentStatus: status,
    providerPayload: payload ?? invoice.providerPayload,
    updatedAt: new Date(),
  }).where(eq(paymentInvoicesTable.id, invoice.id)).returning();

  if (updated.paymentStatus === "paid") {
    return unlockPurchasedContent(updated);
  }

  return updated;
}

router.use(async (_req, _res, next) => {
  try {
    await ensureSeeded();
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const completed = await db.select({ count: sql<number>`count(*)::int` }).from(lessonProgressTable).where(and(eq(lessonProgressTable.userId, user.id), eq(lessonProgressTable.completed, true)));
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, premium: user.premium, currentDay: getCurrentDay(user, completed[0]?.count ?? 0), placementCompleted: user.placementCompleted, placementLevel: user.placementLevel });
  } catch (error) {
    next(error);
  }
});

router.get("/placement-test", async (_req, res, next) => {
  try {
    res.json({
      titleEn: "English Placement Test",
      titleMn: "Англи хэлний түвшин тогтоох тест",
      questions: placementQuestions.map(getQuestionPublic),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/placement-test", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const body = SubmitPlacementTestBody.parse(req.body);
    const result = grade(placementQuestions, body.answers);
    const level = result.score <= 4 ? 1 : result.score <= 8 ? 2 : 3;
    const startingDay = (level - 1) * 30 + 1;
    await db.update(usersTable).set({ placementCompleted: true, placementLevel: level }).where(eq(usersTable.id, user.id));
    res.json({
      ...result,
      level,
      startingDay,
      messageEn: `Your recommended level is Level ${level}. Start from Day ${startingDay}.`,
      messageMn: `Таны санал болгож буй түвшин ${level}-р түвшин. ${startingDay}-р өдрөөс эхлээрэй.`,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/lessons", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const unlocks = await getUnlockedProducts(user.id);
    const lessons = await db.select().from(lessonsTable).orderBy(lessonsTable.day);
    const progress = await db.select().from(lessonProgressTable).where(eq(lessonProgressTable.userId, user.id));
    const progressMap = new Map(progress.map((item) => [item.lessonId, item]));
    res.json(lessons.map((lesson) => toLessonSummary(lesson, user, progressMap.get(lesson.id), unlocks)));
  } catch (error) {
    next(error);
  }
});

router.get("/lessons/:lessonId", async (req, res, next) => {
  try {
    const { lessonId } = GetLessonParams.parse(req.params);
    const user = await getCurrentUser(req);
    const unlocks = await getUnlockedProducts(user.id);
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    const [progress] = await db.select().from(lessonProgressTable).where(and(eq(lessonProgressTable.userId, user.id), eq(lessonProgressTable.lessonId, lesson.id))).limit(1);
    res.json(toLessonDetail(lesson, user, progress, unlocks));
  } catch (error) {
    next(error);
  }
});

router.post("/lessons/:lessonId/quiz-attempts", async (req, res, next) => {
  try {
    const { lessonId } = SubmitLessonQuizParams.parse(req.params);
    const body = SubmitLessonQuizBody.parse(req.body);
    const user = await getCurrentUser(req);
    const unlocks = await getUnlockedProducts(user.id);
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    if (!isUnlocked(lesson, user, unlocks)) return res.status(402).json({ error: "Premium access required" });
    const result = grade(lesson.quiz, body.answers);
    const [attempt] = await db.insert(quizAttemptsTable).values({
      userId: user.id,
      lessonId: lesson.id,
      type: "lesson",
      titleEn: lesson.titleEn,
      titleMn: lesson.titleMn,
      day: lesson.day,
      level: lesson.level,
      ...result,
    }).returning();
    await db.insert(lessonProgressTable).values({ userId: user.id, lessonId: lesson.id, completed: result.passed, bestScore: result.percentage }).onConflictDoUpdate({
      target: [lessonProgressTable.userId, lessonProgressTable.lessonId],
      set: { completed: result.passed, bestScore: sql`greatest(${lessonProgressTable.bestScore}, ${result.percentage})`, updatedAt: new Date() },
    });
    res.json({ id: attempt.id, ...result, completedDay: result.passed ? lesson.day : null });
  } catch (error) {
    next(error);
  }
});

router.get("/final-tests/:level", async (req, res, next) => {
  try {
    const { level } = GetFinalTestParams.parse(req.params);
    const [test] = await db.select().from(finalTestsTable).where(eq(finalTestsTable.level, level)).limit(1);
    if (!test) return res.status(404).json({ error: "Final test not found" });
    res.json({ id: test.id, level: test.level, titleEn: test.titleEn, titleMn: test.titleMn, questions: test.questions.map(getQuestionPublic) });
  } catch (error) {
    next(error);
  }
});

router.post("/final-tests/:level/attempts", async (req, res, next) => {
  try {
    const { level } = SubmitFinalTestParams.parse(req.params);
    const body = SubmitFinalTestBody.parse(req.body);
    const user = await getCurrentUser(req);
    const [test] = await db.select().from(finalTestsTable).where(eq(finalTestsTable.level, level)).limit(1);
    if (!test) return res.status(404).json({ error: "Final test not found" });
    const result = grade(test.questions, body.answers);
    const [attempt] = await db.insert(quizAttemptsTable).values({ userId: user.id, finalTestId: test.id, type: "final", titleEn: test.titleEn, titleMn: test.titleMn, level: test.level, ...result }).returning();
    res.json({ id: attempt.id, ...result, completedDay: null });
  } catch (error) {
    next(error);
  }
});

router.get("/test-history", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    res.json(await historyFor(user.id));
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const unlocks = await getUnlockedProducts(user.id);
    const lessons = await db.select().from(lessonsTable).orderBy(lessonsTable.day);
    const progress = await db.select().from(lessonProgressTable).where(eq(lessonProgressTable.userId, user.id));
    const history = await historyFor(user.id);
    const completedIds = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));
    const startDay = getStartingDay(user);
    const nextLesson = lessons.find((lesson) => lesson.day >= startDay && !completedIds.has(lesson.id));
    const averageScore = history.length === 0 ? 0 : Math.round(history.reduce((sum, item) => sum + item.percentage, 0) / history.length);
    res.json({
      completedDays: completedIds.size,
      totalDays: 90,
      currentLevel: Math.min(3, Math.max(1, Math.ceil(getCurrentDay(user, completedIds.size) / 30))),
      averageScore,
      premium: user.premium,
      nextLesson: nextLesson ? toLessonSummary(nextLesson, user, progress.find((item) => item.lessonId === nextLesson.id), unlocks) : null,
      recentHistory: history.slice(0, 5),
      levelProgress: [1, 2, 3].map((level) => ({ level, completed: lessons.filter((lesson) => lesson.level === level && completedIds.has(lesson.id)).length, total: 30 })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/payments/status", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const recentInvoices = await db.select().from(paymentInvoicesTable).where(eq(paymentInvoicesTable.userId, user.id)).orderBy(desc(paymentInvoicesTable.createdAt)).limit(10);
    res.json({
      premium: user.premium,
      providerConnected: isQPayConfigured(),
      message: isQPayConfigured() ? "QPay is configured for live invoice creation." : "QPay credentials are not configured yet. Add merchant credentials as environment variables before taking live payments.",
      recentInvoices: recentInvoices.map((invoice) => invoiceToResponse(invoice)),
      products: [
        { productId: "lesson:LESSON_ID", name: "Single lesson", amount: 4900, currency: "MNT" },
        { productId: "level:1", name: "Level 1 package", amount: 29000, currency: "MNT" },
        { productId: "course:full", name: "Full 90-day course", amount: 79000, currency: "MNT" },
      ],
    });
  } catch (error) {
    next(error);
  }
});

router.post("/payments/checkout", async (req, res, next) => {
  try {
    CreateCheckoutSessionBody.parse(req.body);
    await getCurrentUser(req);
    res.json({ checkoutUrl: null, providerConnected: isQPayConfigured(), message: "Stripe is not used. Use QPay invoice endpoints for Mongolian payments." });
  } catch (error) {
    next(error);
  }
});

router.post("/payments/qpay/invoices", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const body = CreateQpayInvoiceBody.parse(req.body);
    const product = await resolveProduct(body.productId);
    const invoiceCode = `E90-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const qpay = await createQPayInvoice({
      invoiceCode,
      productName: product.productName,
      amount: product.amount,
      callbackUrl: `${getPublicBaseUrl(req)}/api/payments/qpay/callback`,
    });

    const [invoice] = await db.insert(paymentInvoicesTable).values({
      userId: user.id,
      invoiceCode,
      qpayInvoiceId: qpay.qpayInvoiceId || null,
      paymentStatus: "pending",
      productId: product.productId,
      productName: product.productName,
      amount: product.amount,
      qrText: qpay.qrText || null,
      qrImage: qpay.qrImage || null,
      paymentUrl: qpay.paymentUrl || null,
      providerPayload: qpay.raw,
    }).returning();

    res.json(invoiceToResponse(invoice, qpay.providerConnected, qpay.message));
  } catch (error) {
    next(error);
  }
});

router.get("/payments/qpay/invoices/:invoiceId", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const { invoiceId } = GetQpayInvoiceParams.parse(req.params);
    const [invoice] = await db.select().from(paymentInvoicesTable).where(and(eq(paymentInvoicesTable.id, invoiceId), eq(paymentInvoicesTable.userId, user.id))).limit(1);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoiceToResponse(invoice));
  } catch (error) {
    next(error);
  }
});

router.post("/payments/qpay/invoices/:invoiceId/check", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const { invoiceId } = CheckQpayInvoiceParams.parse(req.params);
    const [invoice] = await db.select().from(paymentInvoicesTable).where(and(eq(paymentInvoicesTable.id, invoiceId), eq(paymentInvoicesTable.userId, user.id))).limit(1);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const qpayStatus = await checkQPayInvoiceStatus(invoice.qpayInvoiceId ?? "", invoice.invoiceCode);
    const updated = await updateInvoiceStatus(invoice, qpayStatus.status, qpayStatus.raw);
    res.json(invoiceToResponse(updated, qpayStatus.providerConnected, qpayStatus.message));
  } catch (error) {
    next(error);
  }
});

router.post("/payments/qpay/callback", async (req, res, next) => {
  try {
    if (!verifyQPayWebhook(req.headers)) {
      return res.status(401).json({ error: "Invalid QPay webhook token" });
    }

    const invoiceCode = String(req.body?.invoice_code ?? req.body?.invoiceCode ?? req.body?.sender_invoice_no ?? "");
    const qpayInvoiceId = String(req.body?.invoice_id ?? req.body?.qpayInvoiceId ?? "");
    const rawStatus = String(req.body?.payment_status ?? req.body?.status ?? req.body?.state ?? "").toLowerCase();
    const status: QPayInvoiceStatus = rawStatus.includes("paid") || rawStatus.includes("success") ? "paid" : rawStatus.includes("fail") ? "failed" : rawStatus.includes("expire") ? "expired" : "pending";
    const [invoice] = await db.select().from(paymentInvoicesTable).where(invoiceCode ? eq(paymentInvoicesTable.invoiceCode, invoiceCode) : eq(paymentInvoicesTable.qpayInvoiceId, qpayInvoiceId)).limit(1);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const updated = await updateInvoiceStatus(invoice, status, req.body);
    res.json({ success: true, invoice: invoiceToResponse(updated) });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/lessons", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    ensureAdmin(user);
    const unlocks = await getUnlockedProducts(user.id);
    const lessons = await db.select().from(lessonsTable).orderBy(lessonsTable.day);
    res.json(lessons.map((lesson) => ({ ...toLessonDetail(lesson, user, undefined, unlocks), correctAnswers: lesson.quiz.map((question) => ({ questionId: question.id, answer: question.correctAnswer })) })));
  } catch (error) {
    next(error);
  }
});

router.post("/admin/lessons", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    ensureAdmin(user);
    const body = AdminCreateLessonBody.parse(req.body);
    const [lesson] = await db.insert(lessonsTable).values(body).returning();
    res.json({ ...toLessonDetail(lesson, user, undefined, new Set(["course:full"])), correctAnswers: lesson.quiz.map((question) => ({ questionId: question.id, answer: question.correctAnswer })) });
  } catch (error) {
    next(error);
  }
});

router.put("/admin/lessons/:lessonId", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    ensureAdmin(user);
    const { lessonId } = AdminUpdateLessonParams.parse(req.params);
    const body = AdminUpdateLessonBody.parse(req.body);
    const [lesson] = await db.update(lessonsTable).set({ ...body, updatedAt: new Date() }).where(eq(lessonsTable.id, lessonId)).returning();
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    res.json({ ...toLessonDetail(lesson, user, undefined, new Set(["course:full"])), correctAnswers: lesson.quiz.map((question) => ({ questionId: question.id, answer: question.correctAnswer })) });
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/lessons/:lessonId", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    ensureAdmin(user);
    const { lessonId } = AdminDeleteLessonParams.parse(req.params);
    await db.delete(lessonsTable).where(eq(lessonsTable.id, lessonId));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.use((error: Error & { status?: number }, req: Request, res: { status: (status: number) => { json: (body: unknown) => void } }, _next: unknown) => {
  req.log.error({ error }, "Learning route error");
  res.status(error.status ?? 500).json({ error: error.message || "Server error" });
});

export default router;
