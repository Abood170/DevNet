import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";




export const UserRole = {
  DEVELOPER: "developer",
  EMPLOYER: "employer",
  ADMIN: "admin",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];




export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default(UserRole.DEVELOPER),

  name: text("name").notNull(),
  bio: text("bio"),
  skills: text("skills"),
  company: text("company"),
  location: text("location"),
  website: text("website"),
  cvUrl: text("cv_url"),
  avatarUrl: text("avatar_url"),

  isDisabled: boolean("is_disabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});




export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  createdAtIdx: index("posts_created_at_idx").on(t.createdAt),
  authorCreatedAtIdx: index("posts_author_created_at_idx").on(t.authorId, t.createdAt),
}));




export const postComments = pgTable("post_comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentCommentId: integer("parent_comment_id").references((): any => postComments.id, { onDelete: "cascade" }),

  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const jobComments = pgTable("job_comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentCommentId: integer("parent_comment_id").references((): any => jobComments.id, { onDelete: "cascade" }),

  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});




export const postLikes = pgTable(
  "post_likes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("post_likes_post_user_unique").on(t.postId, t.userId),
  })
);




export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employerId: integer("employer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  jobType: text("job_type").notNull(), 
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  skills: text("skills"),

  isAccessible: boolean("is_accessible").notNull().default(false),
  accommodations: text("accommodations"),

  deadline: timestamp("deadline"),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  createdAtIdx: index("jobs_created_at_idx").on(t.createdAt),
  employerCreatedAtIdx: index("jobs_employer_created_at_idx").on(t.employerId, t.createdAt),
  activeIdx: index("jobs_is_active_idx").on(t.isActive),
  jobTypeIdx: index("jobs_job_type_idx").on(t.jobType),
}));

export const jobApplications = pgTable(
  "job_applications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    applicantId: integer("applicant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    skills: text("skills"),
    cvUrl: text("cv_url"),
    status: text("status").notNull().default("pending"), // pending, approved, rejected

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("job_applications_job_applicant_unique").on(t.jobId, t.applicantId),
    jobIdIdx: index("job_applications_job_id_idx").on(t.jobId),
    applicantIdIdx: index("job_applications_applicant_id_idx").on(t.applicantId),
    statusIdx: index("job_applications_status_idx").on(t.status),
  })
);

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  recipientId: integer("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  actorId: integer("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),

  type: text("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),

  message: text("message").notNull(),

  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  recipientCreatedAtIdx: index("notifications_recipient_created_at_idx").on(t.recipientId, t.createdAt),
  recipientUnreadIdx: index("notifications_recipient_is_read_idx").on(t.recipientId, t.isRead),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
  }),
}));




export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipientId: integer("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  recipientCreatedAtIdx: index("messages_recipient_created_at_idx").on(t.recipientId, t.createdAt),
  recipientUnreadIdx: index("messages_recipient_is_read_idx").on(t.recipientId, t.isRead),
}));




export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});




export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  jobs: many(jobs),
  comments: many(postComments),
  jobComments: many(jobComments),
  likes: many(postLikes),
  jobApplications: many(jobApplications),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(postComments),
  likes: many(postLikes),
}));

export const postCommentsRelations = relations(postComments, ({ one, many }) => ({
  post: one(posts, {
    fields: [postComments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [postComments.authorId],
    references: [users.id],
  }),
  parent: one(postComments, {
    fields: [postComments.parentCommentId],
    references: [postComments.id],
    relationName: "parent",
  }),
  replies: many(postComments, {
    relationName: "parent",
  }),
}));

export const jobCommentsRelations = relations(jobComments, ({ one, many }) => ({
  job: one(jobs, {
    fields: [jobComments.jobId],
    references: [jobs.id],
  }),
  author: one(users, {
    fields: [jobComments.authorId],
    references: [users.id],
  }),
  parent: one(jobComments, {
    fields: [jobComments.parentCommentId],
    references: [jobComments.id],
    relationName: "parent",
  }),
  replies: many(jobComments, {
    relationName: "parent",
  }),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postLikes.userId],
    references: [users.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  employer: one(users, {
    fields: [jobs.employerId],
    references: [users.id],
  }),
  comments: many(jobComments),
  applications: many(jobApplications),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  job: one(jobs, {
    fields: [jobApplications.jobId],
    references: [jobs.id],
  }),
  applicant: one(users, {
    fields: [jobApplications.applicantId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
  }),
}));




export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([UserRole.DEVELOPER, UserRole.EMPLOYER, UserRole.ADMIN]).default(UserRole.DEVELOPER),

  name: z.string().min(1, "Name is required"),
  bio: z.string().optional().nullable(),
  skills: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  website: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    bio: z.string().optional().nullable(),
    skills: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    website: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
    cvUrl: z.string().optional().nullable(),
    avatarUrl: z.string().optional().nullable(),
    role: z.enum([UserRole.DEVELOPER, UserRole.EMPLOYER, UserRole.ADMIN]).optional(),
  })
  .strict();

export const insertPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  tags: z.string().optional().nullable(),
});

export const updatePostSchema = insertPostSchema.partial();

export const insertCommentSchema = z.object({
  content: z.string().min(1, "Comment is required").max(1000, "Comment too long"),
  parentCommentId: z.number().optional().nullable(),
});

const baseInsertJobSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().min(1, "Location is required"),
  jobType: z.enum(["full-time", "part-time", "contract", "remote"]),

  salaryMin: z.number().min(0, "Min salary cannot be negative").optional().nullable(),
  salaryMax: z.number().min(0, "Max salary cannot be negative").optional().nullable(),

  skills: z.string().optional().nullable(),
  isAccessible: z.boolean().optional().default(false),
  accommodations: z.string().optional().nullable(),

  // Stored as timestamp in DB; API/form uses string.
  deadline: z.string().optional().nullable(),
});

export const updateJobSchema = baseInsertJobSchema.partial();

export const insertJobSchema = baseInsertJobSchema.refine(
  (data) => {
    if (data.salaryMin != null && data.salaryMax != null) return data.salaryMax >= data.salaryMin;
    return true;
  },
  { message: "Max salary must be greater than or equal to min salary", path: ["salaryMax"] },
);

export const insertJobCommentSchema = z.object({
  content: z.string().min(1, "Comment is required").max(1000, "Comment too long"),
  parentCommentId: z.number().optional().nullable(),
});

export const insertJobApplicationSchema = z.object({
  skills: z.string().min(1, "Skills are required").max(500, "Skills too long"),
  cvUrl: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertMessageSchema = z.object({
  recipientId: z.number(),
  content: z.string().min(1, "Message content is required").max(5000, "Message too long"),
});




export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof postComments.$inferSelect;

export type InsertJobComment = z.infer<typeof insertJobCommentSchema>;
export type JobComment = typeof jobComments.$inferSelect;

export type Like = typeof postLikes.$inferSelect;

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;

export type PostWithAuthor = Post & { author: User };
export type JobWithEmployer = Job & { employer: User };
export type JobApplicationWithDetails = JobApplication & { job: Job; applicant: User };

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type MessageWithUsers = Message & { sender: User; recipient: User };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};