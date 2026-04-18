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

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("learner"),
  premium: boolean("premium").notNull().default(false),
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
    durationMinutes: integer("duration_minutes").notNull().default(20),
    isPremium: boolean("is_premium").notNull().default(false),
    vocabulary: jsonb("vocabulary").$type<VocabularyItem[]>().notNull(),
    quiz: jsonb("quiz").$type<StoredQuizQuestion[]>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lessons_day_unique").on(table.day)],
);

export const finalTestsTable = pgTable(
  "final_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: integer("level").notNull(),
    titleEn: text("title_en").notNull(),
    titleMn: text("title_mn").notNull(),
    questions: jsonb("questions").$type<StoredQuizQuestion[]>().notNull(),
  },
  (table) => [uniqueIndex("final_tests_level_unique").on(table.level)],
);

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

export type User = typeof usersTable.$inferSelect;
export type Lesson = typeof lessonsTable.$inferSelect;
export type FinalTest = typeof finalTestsTable.$inferSelect;