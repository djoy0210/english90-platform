import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  finalTestsTable,
  lessonProgressTable,
  lessonsTable,
  quizAttemptsTable,
  usersTable,
  type FinalTest,
  type Lesson,
  type StoredQuizQuestion,
  type User,
} from "@workspace/db/schema";
import {
  AdminCreateLessonBody,
  AdminDeleteLessonParams,
  AdminUpdateLessonBody,
  AdminUpdateLessonParams,
  CreateCheckoutSessionBody,
  GetFinalTestParams,
  GetLessonParams,
  SubmitFinalTestBody,
  SubmitFinalTestParams,
  SubmitLessonQuizBody,
  SubmitLessonQuizParams,
} from "@workspace/api-zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type Request } from "express";

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

function buildSeedLesson(day: number) {
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
    durationMinutes: 20 + (day % 3) * 5,
    isPremium: day > 7,
    vocabulary: [
      { english: "practice", mongolian: "давтах, дадлага хийх", example: "I practice English every morning." },
      { english: "sentence", mongolian: "өгүүлбэр", example: "Write one sentence about your day." },
      { english: focus.split(" ")[0] || "study", mongolian: "өнөөдрийн гол үг", example: `Today I talk about ${focus}.` },
    ],
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
      if (existing.length > 0) return;

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
    .values({ id: clerkUserId, clerkUserId, email, name, role })
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

function isUnlocked(lesson: Lesson, user: User) {
  return !lesson.isPremium || user.premium || user.role === "admin";
}

function toLessonSummary(lesson: Lesson, user: User, progress?: { completed: boolean; bestScore: number }) {
  return {
    id: lesson.id,
    day: lesson.day,
    level: lesson.level,
    titleEn: lesson.titleEn,
    titleMn: lesson.titleMn,
    durationMinutes: lesson.durationMinutes,
    isPremium: lesson.isPremium,
    isUnlocked: isUnlocked(lesson, user),
    completed: progress?.completed ?? false,
    bestScore: progress?.bestScore ?? null,
  };
}

function toLessonDetail(lesson: Lesson, user: User, progress?: { completed: boolean; bestScore: number }) {
  return {
    ...toLessonSummary(lesson, user, progress),
    objectiveEn: lesson.objectiveEn,
    objectiveMn: lesson.objectiveMn,
    contentEn: isUnlocked(lesson, user) ? lesson.contentEn : "Premium access is required to unlock this lesson.",
    contentMn: isUnlocked(lesson, user) ? lesson.contentMn : "Энэ хичээлийг нээхийн тулд premium эрх шаардлагатай.",
    vocabulary: isUnlocked(lesson, user) ? lesson.vocabulary : [],
    quiz: isUnlocked(lesson, user) ? lesson.quiz.map(getQuestionPublic) : [],
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
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, premium: user.premium, currentDay: (completed[0]?.count ?? 0) + 1 });
  } catch (error) {
    next(error);
  }
});

router.get("/lessons", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const lessons = await db.select().from(lessonsTable).orderBy(lessonsTable.day);
    const progress = await db.select().from(lessonProgressTable).where(eq(lessonProgressTable.userId, user.id));
    const progressMap = new Map(progress.map((item) => [item.lessonId, item]));
    res.json(lessons.map((lesson) => toLessonSummary(lesson, user, progressMap.get(lesson.id))));
  } catch (error) {
    next(error);
  }
});

router.get("/lessons/:lessonId", async (req, res, next) => {
  try {
    const { lessonId } = GetLessonParams.parse(req.params);
    const user = await getCurrentUser(req);
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    const [progress] = await db.select().from(lessonProgressTable).where(and(eq(lessonProgressTable.userId, user.id), eq(lessonProgressTable.lessonId, lesson.id))).limit(1);
    res.json(toLessonDetail(lesson, user, progress));
  } catch (error) {
    next(error);
  }
});

router.post("/lessons/:lessonId/quiz-attempts", async (req, res, next) => {
  try {
    const { lessonId } = SubmitLessonQuizParams.parse(req.params);
    const body = SubmitLessonQuizBody.parse(req.body);
    const user = await getCurrentUser(req);
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    if (!isUnlocked(lesson, user)) return res.status(402).json({ error: "Premium access required" });
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
    const lessons = await db.select().from(lessonsTable).orderBy(lessonsTable.day);
    const progress = await db.select().from(lessonProgressTable).where(eq(lessonProgressTable.userId, user.id));
    const history = await historyFor(user.id);
    const completedIds = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));
    const nextLesson = lessons.find((lesson) => !completedIds.has(lesson.id));
    const averageScore = history.length === 0 ? 0 : Math.round(history.reduce((sum, item) => sum + item.percentage, 0) / history.length);
    res.json({
      completedDays: completedIds.size,
      totalDays: 90,
      currentLevel: Math.min(3, Math.max(1, Math.ceil((completedIds.size + 1) / 30))),
      averageScore,
      premium: user.premium,
      nextLesson: nextLesson ? toLessonSummary(nextLesson, user, progress.find((item) => item.lessonId === nextLesson.id)) : null,
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
    res.json({ premium: user.premium, providerConnected: false, message: "Stripe was not connected yet. Connect Stripe to enable live checkout for premium access." });
  } catch (error) {
    next(error);
  }
});

router.post("/payments/checkout", async (req, res, next) => {
  try {
    CreateCheckoutSessionBody.parse(req.body);
    await getCurrentUser(req);
    res.json({ checkoutUrl: null, providerConnected: false, message: "Stripe checkout is ready to connect, but the Stripe account authorization was skipped." });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/lessons", async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    ensureAdmin(user);
    const lessons = await db.select().from(lessonsTable).orderBy(lessonsTable.day);
    res.json(lessons.map((lesson) => ({ ...toLessonDetail(lesson, user), correctAnswers: lesson.quiz.map((question) => ({ questionId: question.id, answer: question.correctAnswer })) })));
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
    res.json({ ...toLessonDetail(lesson, user), correctAnswers: lesson.quiz.map((question) => ({ questionId: question.id, answer: question.correctAnswer })) });
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
    res.json({ ...toLessonDetail(lesson, user), correctAnswers: lesson.quiz.map((question) => ({ questionId: question.id, answer: question.correctAnswer })) });
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
