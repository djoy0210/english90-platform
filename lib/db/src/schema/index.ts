import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type VocabularyItem = {
  english: string;
  pronunciation?: string;
  mongolian: string;
  example: string;
};

export type StoredQuizQuestion = {
  id: string;
  promptEn: string;
  promptMn: string;
  options: string[];
  correctAnswer: string;
};

export type LessonTemplateContent = {
  page1?: {
    grammarTopic?: string;
    grammarExplanation?: string;
    grammarTable?: Array<Record<string, string>>;
    quickPractice?: string[];
    commonMistakes?: string[];
    answerKey?: string[];
  };
  page2?: {
    readingPassage?: string;
    keyPhrases?: Array<{ english: string; mongolian: string; note?: string }>;
    speakingQuestions?: string[];
    rolePlay?: Array<{ speaker: string; text: string }>;
    speakingTip?: string;
  };
  page3?: {
    listeningScript?: string;
    listeningQuestions?: StoredQuizQuestion[];
    comprehensionQuestions?: StoredQuizQuestion[];
    grammarPractice?: string[];
    matchingExercise?: Array<{ left: string; right: string }>;
    homework?: string[];
    answerKey?: string[];
    completionSummary?: string[];
    nextLessonPreview?: string;
  };
};

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("learner"),
  premium: boolean("premium").notNull().default(false),
    placementCompleted: boolean("placement_completed").notNull().default(false),
    placementLevel: integer("placement_level").notNull().default(1),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lessonsTable = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    day: integer("day").notNull(),
    level: integer("level").notNull(),
    titleEn: text("title_en").notNull(),
    titleMn: text("title_mn").notNull(),
    objectiveEn: text("objective_en").notNull(),
    objectiveMn: text("objective_mn").notNull(),
    contentEn: text("content_en").notNull(),
    contentMn: text("content_mn").notNull(),
    lessonContent: jsonb("lesson_content").$type<LessonTemplateContent>(),
    pdfUrl: text("pdf_url"),
    audioUrl: text("audio_url"),
    durationMinutes: integer("duration_minutes").notNull().default(20),
    isPremium: boolean("is_premium").notNull().default(false),
    vocabulary: jsonb("vocabulary").$type<VocabularyItem[]>().notNull(),
    quiz: jsonb("quiz").$type<StoredQuizQuestion[]>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lessons_day_unique").on(table.day)],
);

export const placementQuestionsTable = pgTable(
  "placement_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    position: integer("position").notNull(),
    band: text("band").notNull(),
    promptEn: text("prompt_en").notNull(),
    promptMn: text("prompt_mn").notNull().default(""),
    options: jsonb("options").$type<string[]>().notNull(),
    correctAnswer: text("correct_answer").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("placement_questions_position_unique").on(table.position)],
);

export const finalTestsTable = pgTable(
  "final_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: integer("level").notNull(),
    titleEn: text("title_en").notNull(),
    titleMn: text("title_mn").notNull(),
    questions: jsonb("questions").$type<StoredQuizQuestion[]>().notNull(),
    passingScore: integer("passing_score").notNull().default(70),
  },
  (table) => [uniqueIndex("final_tests_level_unique").on(table.level)],
);

export const paymentRequestsTable = pgTable("payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("MNT"),
  bankName: text("bank_name").notNull().default("Khan Bank"),
  transactionRef: text("transaction_ref"),
  payerName: text("payer_name"),
  screenshotUrl: text("screenshot_url"),
  note: text("note"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lessonProgressTable = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessonsTable.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    bestScore: integer("best_score").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lesson_progress_user_lesson_unique").on(table.userId, table.lessonId)],
);

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessonsTable.id, {
    onDelete: "cascade",
  }),
  finalTestId: uuid("final_test_id").references(() => finalTestsTable.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(),
  titleEn: text("title_en").notNull(),
  titleMn: text("title_mn").notNull(),
  day: integer("day"),
  level: integer("level").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  percentage: integer("percentage").notNull(),
  passed: boolean("passed").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentInvoicesTable = pgTable(
  "payment_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    invoiceCode: text("invoice_code").notNull(),
    qpayInvoiceId: text("qpay_invoice_id"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("MNT"),
    unlockStatus: text("unlock_status").notNull().default("locked"),
    qrText: text("qr_text"),
    qrImage: text("qr_image"),
    paymentUrl: text("payment_url"),
    providerPayload: jsonb("provider_payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payment_invoices_invoice_code_unique").on(table.invoiceCode)],
);

export const contentUnlocksTable = pgTable(
  "content_unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    lessonId: uuid("lesson_id").references(() => lessonsTable.id, {
      onDelete: "cascade",
    }),
    level: integer("level"),
    unlockedByInvoiceId: uuid("unlocked_by_invoice_id").references(() => paymentInvoicesTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("content_unlocks_user_product_unique").on(table.userId, table.productId)],
);

export type User = typeof usersTable.$inferSelect;
export type Lesson = typeof lessonsTable.$inferSelect;
export type FinalTest = typeof finalTestsTable.$inferSelect;
export type PaymentInvoice = typeof paymentInvoicesTable.$inferSelect;
export type PaymentRequest = typeof paymentRequestsTable.$inferSelect;