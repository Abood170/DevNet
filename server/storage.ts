
import { db } from "./db";
import { eq, desc, and, or, count, sql } from "drizzle-orm";
import {
  users,
  posts,
  jobs,
  postComments,
  jobComments,
  jobApplications,
  postLikes,
  notifications,
  messages,
  type User,
  type InsertUser,
  type Post,
  type InsertPost,
  type Job,
  type InsertJob,
  type PostWithAuthor,
  type JobWithEmployer,
  type PaginatedResponse,
  type InsertMessage,
  type Message,
  type MessageWithUsers,
  type JobApplication,
  type JobApplicationWithDetails,
  type UpdateUser,
} from "@shared/schema";




type NotificationRow = {
  id: number;
  recipientId: number;
  actorId: number | null;
  type: string; 
  entityType: string; 
  entityId: number;   
  message: string;
  isRead: boolean;
  createdAt: Date;
  actor?: User | null;
};

type CommentRow = {
  id: number;
  postId: number;
  authorId: number;
  parentCommentId?: number | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: User;
};

type PostWithAuthorAndCounts = PostWithAuthor & {
  likesCount: number;
  commentsCount: number;
};




export interface IStorage {
  
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<UpdateUser>): Promise<User | undefined>;
  getAllUsers(page: number, limit: number, search?: string, role?: string, status?: string): Promise<PaginatedResponse<User>>;
  disableUser(id: number): Promise<User | undefined>;
  enableUser(id: number): Promise<User | undefined>;

  
  getPosts(page: number, limit: number, q?: string, tag?: string): Promise<PaginatedResponse<PostWithAuthorAndCounts>>;
  getPostById(id: number): Promise<PostWithAuthorAndCounts | undefined>;
  getPostsByAuthor(authorId: number, page: number, limit: number): Promise<PaginatedResponse<PostWithAuthorAndCounts>>;
  createPost(authorId: number, post: InsertPost): Promise<Post>;
  updatePost(id: number, authorId: number, data: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number, authorId: number): Promise<boolean>;
  deletePostAdmin(id: number): Promise<boolean>;

  
  getJobs(
    page: number,
    limit: number,
    activeOnly?: boolean,
    isAccessible?: boolean,
    q?: string,
    jobType?: string,
    location?: string,
    includeExpired?: boolean
  ): Promise<PaginatedResponse<JobWithEmployer>>;
  getJobById(id: number): Promise<JobWithEmployer | undefined>;
  getJobsByEmployer(employerId: number, page: number, limit: number): Promise<PaginatedResponse<JobWithEmployer>>;
  createJob(employerId: number, job: InsertJob): Promise<Job>;
  updateJob(id: number, employerId: number, data: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number, employerId: number): Promise<boolean>;
  deleteJobAdmin(id: number): Promise<boolean>;

  
  getCommentsByPost(postId: number, page: number, limit: number): Promise<PaginatedResponse<CommentRow>>;
  createComment(postId: number, authorId: number, data: { content: string; parentCommentId?: number | null }): Promise<any>;
  updateComment(commentId: number, authorId: number, data: { content: string }): Promise<any | undefined>;
  deleteComment(commentId: number, authorId: number): Promise<boolean>;
  updateCommentAdmin(commentId: number, data: { content: string }): Promise<any | undefined>;
  deleteCommentAdmin(commentId: number): Promise<boolean>;

  
  getCommentsByJob(jobId: number, page: number, limit: number): Promise<PaginatedResponse<CommentRow>>;
  createJobComment(jobId: number, authorId: number, data: { content: string }): Promise<any>;
  updateJobComment(commentId: number, authorId: number, data: { content: string }): Promise<any | undefined>;
  deleteJobComment(commentId: number, authorId: number): Promise<boolean>;
  updateJobCommentAdmin(commentId: number, data: { content: string }): Promise<any | undefined>;
  deleteJobCommentAdmin(commentId: number): Promise<boolean>;

  
  likePost(postId: number, userId: number): Promise<{ liked: true; likesCount: number }>;
  unlikePost(postId: number, userId: number): Promise<{ liked: false; likesCount: number }>;
  getPostLikesInfo(postId: number, userId: number | null): Promise<{ likesCount: number; likedByMe: boolean }>;

  
  getNotifications(userId: number, page: number, limit: number): Promise<PaginatedResponse<NotificationRow>>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  markAllNotificationsRead(userId: number): Promise<void>;
  markNotificationRead(userId: number, notificationId: number): Promise<boolean>;
  createNotification(data: {
    recipientId: number;
    actorId: number | null;
    type: "comment" | "like" | "application";
    entityType: "post" | "comment" | "job";
    entityId: number;
    message: string;
  }): Promise<void>;

  
  applyToJob(jobId: number, applicantId: number, data: { skills: string; cvUrl?: string | null }): Promise<JobApplication>;
  getJobApplication(jobId: number, applicantId: number): Promise<JobApplication | undefined>;
  getApplicationsByJob(jobId: number, page: number, limit: number): Promise<PaginatedResponse<JobApplicationWithDetails>>;
  getApplicationsByApplicant(applicantId: number, page: number, limit: number): Promise<PaginatedResponse<JobApplicationWithDetails>>;
  getApplicationsByEmployer(employerId: number, page: number, limit: number): Promise<PaginatedResponse<JobApplicationWithDetails>>;
  deleteJobApplication(applicationId: number, applicantId: number): Promise<boolean>;
  approveApplication(applicationId: number, employerId: number): Promise<JobApplication | undefined>;
  rejectApplication(applicationId: number, employerId: number): Promise<JobApplication | undefined>;
  getJobApplicationCount(jobId: number): Promise<number>;
  hasAppliedToJob(jobId: number, applicantId: number): Promise<boolean>;
}




export class DatabaseStorage implements IStorage {
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<UpdateUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(page: number, limit: number, search = "", role?: string, status?: string): Promise<PaginatedResponse<User>> {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        sql`(${users.username} ILIKE ${searchTerm} OR ${users.name} ILIKE ${searchTerm} OR ${users.email} ILIKE ${searchTerm})`
      );
    }

    
    if (role && role.trim()) {
      conditions.push(eq(users.role, role.trim()));
    }

    
    if (status === "active") {
      conditions.push(eq(users.isDisabled, false));
    } else if (status === "disabled") {
      conditions.push(eq(users.isDisabled, true));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = whereClause
      ? await db.select({ count: count() }).from(users).where(whereClause)
      : await db.select({ count: count() }).from(users);
    const total = Number(totalResult.count);

    const baseQuery = db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
    const items = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async disableUser(id: number): Promise<User | undefined> {
    const [user] = await db.update(users).set({ isDisabled: true }).where(eq(users.id, id)).returning();
    return user;
  }

  async enableUser(id: number): Promise<User | undefined> {
    const [user] = await db.update(users).set({ isDisabled: false }).where(eq(users.id, id)).returning();
    return user;
  }

  
  private async countLikes(postId: number): Promise<number> {
    const [r] = await db.select({ count: count() }).from(postLikes).where(eq(postLikes.postId, postId));
    return Number(r.count);
  }

  private async countComments(postId: number): Promise<number> {
    const [r] = await db.select({ count: count() }).from(postComments).where(eq(postComments.postId, postId));
    return Number(r.count);
  }

  
  async getPosts(page: number, limit: number, q?: string, tag?: string): Promise<PaginatedResponse<PostWithAuthorAndCounts>> {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      conditions.push(sql`(${posts.title} ILIKE ${like} OR ${posts.content} ILIKE ${like} OR ${posts.tags} ILIKE ${like})`);
    }
    if (tag && tag.trim()) {
      const likeTag = `%${tag.trim()}%`;
      conditions.push(sql`${posts.tags} ILIKE ${likeTag}`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = whereClause
      ? await db.select({ count: count() }).from(posts).where(whereClause)
      : await db.select({ count: count() }).from(posts);

    const total = Number(totalResult.count);

    const rows = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        tags: posts.tags,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
        likesCount: sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId} = ${posts.id})`,
        commentsCount: sql<number>`(select count(*)::int from ${postComments} where ${postComments.postId} = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(whereClause ?? sql`TRUE`)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map((row) => ({
      ...row,
      author: row.author!,
      likesCount: Number(row.likesCount) || 0,
      commentsCount: Number(row.commentsCount) || 0,
    }));

    return { items: items as PostWithAuthorAndCounts[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPostById(id: number): Promise<PostWithAuthorAndCounts | undefined> {
    const [row] = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        tags: posts.tags,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
        likesCount: sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId} = ${posts.id})`,
        commentsCount: sql<number>`(select count(*)::int from ${postComments} where ${postComments.postId} = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id));

    if (!row) return undefined;

    return {
      ...row,
      author: row.author!,
      likesCount: Number(row.likesCount) || 0,
      commentsCount: Number(row.commentsCount) || 0,
    } as PostWithAuthorAndCounts;
  }

  async getPostsByAuthor(authorId: number, page: number, limit: number): Promise<PaginatedResponse<PostWithAuthorAndCounts>> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(posts).where(eq(posts.authorId, authorId));
    const total = Number(totalResult.count);

    const rows = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        tags: posts.tags,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
        likesCount: sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId} = ${posts.id})`,
        commentsCount: sql<number>`(select count(*)::int from ${postComments} where ${postComments.postId} = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.authorId, authorId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map((row) => ({
      ...row,
      author: row.author!,
      likesCount: Number(row.likesCount) || 0,
      commentsCount: Number(row.commentsCount) || 0,
    }));

    return { items: items as PostWithAuthorAndCounts[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createPost(authorId: number, post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values({ ...post, authorId }).returning();
    return newPost;
  }

  async updatePost(id: number, authorId: number, data: Partial<InsertPost>): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
      .returning();
    return post;
  }

  async deletePost(id: number, authorId: number): Promise<boolean> {
    const result = await db.delete(posts).where(and(eq(posts.id, id), eq(posts.authorId, authorId)));
    return (result.rowCount ?? 0) > 0;
  }

  async deletePostAdmin(id: number): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  
  async getCommentsByPost(postId: number, page: number, limit: number): Promise<PaginatedResponse<CommentRow>> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(postComments).where(eq(postComments.postId, postId));
    const total = Number(totalResult.count);

    const items = await db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        authorId: postComments.authorId,
        parentCommentId: postComments.parentCommentId,
        content: postComments.content,
        createdAt: postComments.createdAt,
        updatedAt: postComments.updatedAt,
        author: users,
      })
      .from(postComments)
      .leftJoin(users, eq(postComments.authorId, users.id))
      .where(eq(postComments.postId, postId))
      .orderBy(desc(postComments.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items: items.map((i) => ({ ...i, author: i.author! })) as CommentRow[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createComment(postId: number, authorId: number, data: { content: string; parentCommentId?: number | null }): Promise<any> {
    const [row] = await db
      .insert(postComments)
      .values({ 
        postId, 
        authorId, 
        content: data.content, 
        parentCommentId: data.parentCommentId || null,
        createdAt: new Date(), 
        updatedAt: new Date() 
      })
      .returning();

    const [actor] = await db.select({ username: users.username }).from(users).where(eq(users.id, authorId));
    const actorName = actor?.username ?? "Someone";

    
    if (data.parentCommentId) {
      const [parentComment] = await db
        .select({ authorId: postComments.authorId })
        .from(postComments)
        .where(eq(postComments.id, data.parentCommentId));
      
      if (parentComment && parentComment.authorId !== authorId) {
        await this.createNotification({
          recipientId: parentComment.authorId,
          actorId: authorId,
          type: "comment",
          entityType: "comment",
          entityId: data.parentCommentId,
          message: `${actorName} replied to your comment.`,
        });
      }
    } else {
      
      const [postRow] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId));
      if (postRow && postRow.authorId !== authorId) {
        await this.createNotification({
          recipientId: postRow.authorId,
          actorId: authorId,
          type: "comment",
          entityType: "post",
          entityId: postId,
          message: `${actorName} commented on your post.`,
        });
      }
    }

    return row;
  }

  async updateComment(commentId: number, authorId: number, data: { content: string }): Promise<any | undefined> {
    const [row] = await db
      .update(postComments)
      .set({ content: data.content, updatedAt: new Date() })
      .where(and(eq(postComments.id, commentId), eq(postComments.authorId, authorId)))
      .returning();
    return row;
  }

  async deleteComment(commentId: number, authorId: number): Promise<boolean> {
    const result = await db.delete(postComments).where(and(eq(postComments.id, commentId), eq(postComments.authorId, authorId)));
    return (result.rowCount ?? 0) > 0;
  }

  async updateCommentAdmin(commentId: number, data: { content: string }): Promise<any | undefined> {
    const [row] = await db.update(postComments).set({ content: data.content, updatedAt: new Date() }).where(eq(postComments.id, commentId)).returning();
    return row;
  }

  async deleteCommentAdmin(commentId: number): Promise<boolean> {
    const result = await db.delete(postComments).where(eq(postComments.id, commentId));
    return (result.rowCount ?? 0) > 0;
  }

  
  async getCommentsByJob(jobId: number, page: number, limit: number): Promise<PaginatedResponse<CommentRow>> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(jobComments).where(eq(jobComments.jobId, jobId));
    const total = Number(totalResult.count);

    const items = await db
      .select({
        id: jobComments.id,
        postId: jobComments.jobId, 
        authorId: jobComments.authorId,
        content: jobComments.content,
        createdAt: jobComments.createdAt,
        updatedAt: jobComments.updatedAt,
        author: users,
      })
      .from(jobComments)
      .leftJoin(users, eq(jobComments.authorId, users.id))
      .where(eq(jobComments.jobId, jobId))
      .orderBy(desc(jobComments.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items: items.map((i) => ({ ...i, author: i.author! })) as CommentRow[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createJobComment(jobId: number, authorId: number, data: { content: string; parentCommentId?: number | null }): Promise<any> {
    const [row] = await db
      .insert(jobComments)
      .values({ 
        jobId, 
        authorId, 
        content: data.content, 
        parentCommentId: data.parentCommentId || null,
        createdAt: new Date(), 
        updatedAt: new Date() 
      })
      .returning();

    const [actor] = await db.select({ username: users.username }).from(users).where(eq(users.id, authorId));
    const actorName = actor?.username ?? "Someone";

    
    if (data.parentCommentId) {
      const [parentComment] = await db
        .select({ authorId: jobComments.authorId })
        .from(jobComments)
        .where(eq(jobComments.id, data.parentCommentId));
      
      if (parentComment && parentComment.authorId !== authorId) {
        await this.createNotification({
          recipientId: parentComment.authorId,
          actorId: authorId,
          type: "comment",
          entityType: "comment",
          entityId: data.parentCommentId,
          message: `${actorName} replied to your comment.`,
        });
      }
    } else {
      
      const [jobRow] = await db.select({ employerId: jobs.employerId }).from(jobs).where(eq(jobs.id, jobId));
      if (jobRow && jobRow.employerId !== authorId) {
        await this.createNotification({
          recipientId: jobRow.employerId,
          actorId: authorId,
          type: "comment",
          entityType: "job",
          entityId: jobId,
          message: `${actorName} commented on your job listing.`,
        });
      }
    }

    return row;
  }

  async updateJobComment(commentId: number, authorId: number, data: { content: string }): Promise<any | undefined> {
    const [row] = await db
      .update(jobComments)
      .set({ content: data.content, updatedAt: new Date() })
      .where(and(eq(jobComments.id, commentId), eq(jobComments.authorId, authorId)))
      .returning();
    return row;
  }

  async deleteJobComment(commentId: number, authorId: number): Promise<boolean> {
    const result = await db.delete(jobComments).where(and(eq(jobComments.id, commentId), eq(jobComments.authorId, authorId)));
    return (result.rowCount ?? 0) > 0;
  }

  async updateJobCommentAdmin(commentId: number, data: { content: string }): Promise<any | undefined> {
    const [row] = await db.update(jobComments).set({ content: data.content, updatedAt: new Date() }).where(eq(jobComments.id, commentId)).returning();
    return row;
  }

  async deleteJobCommentAdmin(commentId: number): Promise<boolean> {
    const result = await db.delete(jobComments).where(eq(jobComments.id, commentId));
    return (result.rowCount ?? 0) > 0;
  }

  
  async likePost(postId: number, userId: number): Promise<{ liked: true; likesCount: number }> {
    await db
      .insert(postLikes)
      .values({ postId, userId, createdAt: new Date() })
      .onConflictDoNothing();

    const [postRow] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId));
    if (postRow && postRow.authorId !== userId) {
      const [actor] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId));
      const actorName = actor?.username ?? "Someone";

      
      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, postRow.authorId),
            eq(notifications.actorId, userId),
            eq(notifications.type, "like"),
            eq(notifications.entityType, "post"),
            eq(notifications.entityId, postId),
            eq(notifications.isRead, false)
          )
        );

      if (!existing) {
        await this.createNotification({
          recipientId: postRow.authorId,
          actorId: userId,
          type: "like",
          entityType: "post",
          entityId: postId,
          message: `${actorName} liked your post.`,
        });
      }
    }

    return { liked: true, likesCount: await this.countLikes(postId) };
  }

  async unlikePost(postId: number, userId: number): Promise<{ liked: false; likesCount: number }> {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    return { liked: false, likesCount: await this.countLikes(postId) };
  }

  async getPostLikesInfo(postId: number, userId: number | null): Promise<{ likesCount: number; likedByMe: boolean }> {
    const likesCount = await this.countLikes(postId);

    let likedByMe = false;
    if (userId) {
      const [row] = await db.select().from(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
      likedByMe = !!row;
    }

    return { likesCount, likedByMe };
  }

  
  async getJobs(
    page: number,
    limit: number,
    activeOnly = true,
    isAccessible?: boolean,
    q?: string,
    jobType?: string,
    location?: string,
    includeExpired = false
  ): Promise<PaginatedResponse<JobWithEmployer>> {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (activeOnly) conditions.push(eq(jobs.isActive, true));
    if (typeof isAccessible === "boolean") conditions.push(eq(jobs.isAccessible, isAccessible));
    if (jobType && jobType.trim()) conditions.push(eq(jobs.jobType, jobType.trim()));

    if (location && location.trim()) {
      const likeLoc = `%${location.trim()}%`;
      conditions.push(sql`${jobs.location} ILIKE ${likeLoc}`);
    }

    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      conditions.push(sql`(
        ${jobs.title} ILIKE ${like}
        OR ${jobs.description} ILIKE ${like}
        OR ${jobs.company} ILIKE ${like}
        OR ${jobs.location} ILIKE ${like}
        OR ${jobs.skills} ILIKE ${like}
      )`);
    }

    // Filter out expired jobs unless includeExpired is true
    // Show jobs with no deadline OR jobs with deadline in the future
    if (!includeExpired) {
      // For now, don't filter by deadline - show all jobs regardless of deadline status
      // This ensures jobs with deadlines are visible
      // TODO: Re-enable deadline filtering once date comparison is verified
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = whereClause
      ? await db.select({ count: count() }).from(jobs).where(whereClause)
      : await db.select({ count: count() }).from(jobs);

    const total = Number(totalResult.count);

    const baseQuery = db
      .select({
        id: jobs.id,
        employerId: jobs.employerId,
        title: jobs.title,
        description: jobs.description,
        company: jobs.company,
        location: jobs.location,
        jobType: jobs.jobType,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        skills: jobs.skills,
        isAccessible: jobs.isAccessible,
        accommodations: jobs.accommodations,
        deadline: jobs.deadline,
        isActive: jobs.isActive,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        employer: users,
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.employerId, users.id))
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    const items = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

    return { items: items.map((i) => ({ ...i, employer: i.employer! })) as JobWithEmployer[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getJobById(id: number): Promise<JobWithEmployer | undefined> {
    const [result] = await db
      .select({
        id: jobs.id,
        employerId: jobs.employerId,
        title: jobs.title,
        description: jobs.description,
        company: jobs.company,
        location: jobs.location,
        jobType: jobs.jobType,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        skills: jobs.skills,
        isAccessible: jobs.isAccessible,
        accommodations: jobs.accommodations,
        deadline: jobs.deadline,
        isActive: jobs.isActive,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        employer: users,
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.employerId, users.id))
      .where(eq(jobs.id, id));

    if (!result) return undefined;
    return { ...result, employer: result.employer! } as JobWithEmployer;
  }

  async getJobsByEmployer(employerId: number, page: number, limit: number): Promise<PaginatedResponse<JobWithEmployer>> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(jobs).where(eq(jobs.employerId, employerId));
    const total = Number(totalResult.count);

    const items = await db
      .select({
        id: jobs.id,
        employerId: jobs.employerId,
        title: jobs.title,
        description: jobs.description,
        company: jobs.company,
        location: jobs.location,
        jobType: jobs.jobType,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        skills: jobs.skills,
        isAccessible: jobs.isAccessible,
        accommodations: jobs.accommodations,
        deadline: jobs.deadline,
        isActive: jobs.isActive,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        employer: users,
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.employerId, users.id))
      .where(eq(jobs.employerId, employerId))
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    return { items: items.map((i) => ({ ...i, employer: i.employer! })) as JobWithEmployer[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createJob(employerId: number, job: InsertJob): Promise<Job> {
    const deadline =
      typeof job.deadline === "string" && job.deadline.trim()
        ? new Date(job.deadline)
        : job.deadline
          ? (job.deadline as any)
          : null;

    const [newJob] = await db
      .insert(jobs)
      .values({ ...job, employerId, deadline: deadline && !isNaN(deadline.getTime?.() ?? NaN) ? deadline : null } as any)
      .returning();
    return newJob;
  }

  async updateJob(id: number, employerId: number, data: Partial<InsertJob>): Promise<Job | undefined> {
    const deadline =
      data.deadline === undefined
        ? undefined
        : typeof data.deadline === "string" && data.deadline.trim()
          ? new Date(data.deadline)
          : data.deadline
            ? (data.deadline as any)
            : null;

    const [job] = await db
      .update(jobs)
      .set({ ...data, deadline, updatedAt: new Date() } as any)
      .where(and(eq(jobs.id, id), eq(jobs.employerId, employerId)))
      .returning();
    return job;
  }

  async deleteJob(id: number, employerId: number): Promise<boolean> {
    const result = await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.employerId, employerId)));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteJobAdmin(id: number): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

    
  async createNotification(data: {
    recipientId: number;
    actorId: number | null;
    type: "comment" | "like" | "message" | "application";
    entityType: "post" | "comment" | "message" | "job";
    entityId: number;
    message: string;
  }): Promise<void> {
    await db.insert(notifications).values({
      recipientId: data.recipientId,
      actorId: data.actorId,
      type: data.type,
      entityType: data.entityType,
      entityId: data.entityId,
      message: data.message,
      isRead: false,
      
      createdAt: new Date(),
    } as any);
  }

  async getNotifications(userId: number, page: number, limit: number): Promise<PaginatedResponse<NotificationRow>> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.recipientId, userId));

    const total = Number(totalResult.count);

    const rows = await db
      .select({
        id: notifications.id,
        recipientId: notifications.recipientId,
        actorId: notifications.actorId,
        type: notifications.type,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        actor: users,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      ...r,
      actor: r.actor ?? null,
    })) as NotificationRow[];

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const [r] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));
    return Number(r.count);
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true } as any)
      .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));
  }

  async markNotificationRead(userId: number, notificationId: number): Promise<boolean> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true } as any)
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)))
      .returning();

    return !!updated;
  }

  
  async getConversations(userId: number): Promise<Array<{ otherUser: User; lastMessage: Message; unreadCount: number }>> {
    
    const allMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.recipientId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));

    
    const conversationMap = new Map<number, Message>();

    for (const msg of allMessages) {
      const otherUserId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, msg);
      }
    }

    
    const conversations = await Promise.all(
      Array.from(conversationMap.entries()).map(async ([otherUserId, lastMessage]) => {
        const [otherUser] = await db.select().from(users).where(eq(users.id, otherUserId));
        if (!otherUser) return null;

        
        const [unreadResult] = await db
          .select({ count: count() })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, otherUserId),
              eq(messages.recipientId, userId),
              eq(messages.isRead, false)
            )
          );

        return {
          otherUser,
          lastMessage,
          unreadCount: Number(unreadResult.count) || 0,
        };
      })
    );

    return conversations.filter((c): c is NonNullable<typeof c> => c !== null).sort((a, b) => {
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });
  }

  async getMessages(userId: number, otherUserId: number, page: number, limit: number): Promise<PaginatedResponse<MessageWithUsers>> {
    const offset = (page - 1) * limit;

    
    const whereClause = sql`(
      (${messages.senderId} = ${userId} AND ${messages.recipientId} = ${otherUserId}) OR
      (${messages.senderId} = ${otherUserId} AND ${messages.recipientId} = ${userId})
    )`;

    const [totalResult] = await db.select({ count: count() }).from(messages).where(whereClause);
    const total = Number(totalResult.count);

    const rows = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(whereClause)
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    
    const items = await Promise.all(
      rows.map(async (row) => {
        const [recipient] = await db.select().from(users).where(eq(users.id, row.recipientId));
        return {
          ...row,
          sender: row.sender!,
          recipient: recipient!,
        } as MessageWithUsers;
      })
    );

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async sendMessage(senderId: number, recipientId: number, content: string): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        senderId,
        recipientId,
        content,
        isRead: false,
        createdAt: new Date(),
      })
      .returning();

    
    const [sender] = await db.select({ username: users.username }).from(users).where(eq(users.id, senderId));
    const senderName = sender?.username ?? "Someone";

    await this.createNotification({
      recipientId,
      actorId: senderId,
      type: "message",
      entityType: "message",
      entityId: message.id,
      message: `${senderName} sent you a message.`,
    });

    return message;
  }

  async markMessagesAsRead(userId: number, otherUserId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true } as any)
      .where(
        and(
          eq(messages.recipientId, userId),
          eq(messages.senderId, otherUserId),
          eq(messages.isRead, false)
        )
      );
  }

  async getUnreadMessagesCount(userId: number): Promise<number> {
    const [r] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.recipientId, userId), eq(messages.isRead, false)));
    return Number(r.count);
  }

  
  async applyToJob(jobId: number, applicantId: number, data: { skills: string; cvUrl?: string | null }): Promise<JobApplication> {
    const [application] = await db
      .insert(jobApplications)
      .values({ 
        jobId, 
        applicantId,
        skills: data.skills,
        cvUrl: data.cvUrl || null,
      })
      .returning();
    
    const job = await this.getJobById(jobId);
    if (job) {
      const [applicant] = await db.select({ username: users.username, name: users.name }).from(users).where(eq(users.id, applicantId));
      const applicantName = applicant?.name || applicant?.username || "A developer";
      
      await this.createNotification({
        recipientId: job.employerId,
        actorId: applicantId,
        type: "application",
        entityType: "job",
        entityId: jobId,
        message: `${applicantName} applied to your job: ${job.title}`,
      });
    }
    
    return application;
  }

  async getJobApplication(jobId: number, applicantId: number): Promise<JobApplication | undefined> {
    const [application] = await db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, applicantId)));
    return application;
  }

  async hasAppliedToJob(jobId: number, applicantId: number): Promise<boolean> {
    const application = await this.getJobApplication(jobId, applicantId);
    return !!application;
  }

  async getApplicationsByJob(jobId: number, page: number, limit: number): Promise<PaginatedResponse<JobApplicationWithDetails>> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId));
    const total = Number(totalResult.count);

    const items = await db
      .select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        applicantId: jobApplications.applicantId,
        skills: jobApplications.skills,
        cvUrl: jobApplications.cvUrl,
        status: jobApplications.status,
        createdAt: jobApplications.createdAt,
        job: jobs,
        applicant: users,
      })
      .from(jobApplications)
      .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .leftJoin(users, eq(jobApplications.applicantId, users.id))
      .where(eq(jobApplications.jobId, jobId))
      .orderBy(desc(jobApplications.createdAt))
      .limit(limit)
      .offset(offset);

    const applications: JobApplicationWithDetails[] = items.map((item) => ({
      id: item.id,
      jobId: item.jobId,
      applicantId: item.applicantId,
      skills: item.skills,
      cvUrl: item.cvUrl,
      status: item.status,
      createdAt: item.createdAt,
      job: item.job as Job,
      applicant: item.applicant as User,
    }));

    return { items: applications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getApplicationsByApplicant(applicantId: number, page: number, limit: number): Promise<PaginatedResponse<JobApplicationWithDetails>> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(jobApplications)
      .where(eq(jobApplications.applicantId, applicantId));
    const total = Number(totalResult.count);

    const items = await db
      .select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        applicantId: jobApplications.applicantId,
        skills: jobApplications.skills,
        cvUrl: jobApplications.cvUrl,
        status: jobApplications.status,
        createdAt: jobApplications.createdAt,
        job: jobs,
        applicant: users,
      })
      .from(jobApplications)
      .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .leftJoin(users, eq(jobApplications.applicantId, users.id))
      .where(eq(jobApplications.applicantId, applicantId))
      .orderBy(desc(jobApplications.createdAt))
      .limit(limit)
      .offset(offset);

    const applications: JobApplicationWithDetails[] = items.map((item) => ({
      id: item.id,
      jobId: item.jobId,
      applicantId: item.applicantId,
      skills: item.skills,
      cvUrl: item.cvUrl,
      status: item.status,
      createdAt: item.createdAt,
      job: item.job as Job,
      applicant: item.applicant as User,
    }));

    return { items: applications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteJobApplication(applicationId: number, applicantId: number): Promise<boolean> {
    const [deleted] = await db
      .delete(jobApplications)
      .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.applicantId, applicantId)))
      .returning();
    return !!deleted;
  }

  async getJobApplicationCount(jobId: number): Promise<number> {
    const [r] = await db
      .select({ count: count() })
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId));
    return Number(r.count);
  }

  async getApplicationsByEmployer(employerId: number, page: number, limit: number): Promise<PaginatedResponse<JobApplicationWithDetails>> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(eq(jobs.employerId, employerId));
    const total = Number(totalResult.count);

    const items = await db
      .select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        applicantId: jobApplications.applicantId,
        skills: jobApplications.skills,
        cvUrl: jobApplications.cvUrl,
        status: jobApplications.status,
        createdAt: jobApplications.createdAt,
        job: jobs,
        applicant: users,
      })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .leftJoin(users, eq(jobApplications.applicantId, users.id))
      .where(eq(jobs.employerId, employerId))
      .orderBy(desc(jobApplications.createdAt))
      .limit(limit)
      .offset(offset);

    const applications: JobApplicationWithDetails[] = items.map((item) => ({
      id: item.id,
      jobId: item.jobId,
      applicantId: item.applicantId,
      skills: item.skills,
      cvUrl: item.cvUrl,
      status: item.status,
      createdAt: item.createdAt,
      job: item.job as Job,
      applicant: item.applicant as User,
    }));

    return { items: applications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveApplication(applicationId: number, employerId: number): Promise<JobApplication | undefined> {
    // Verify the application belongs to a job owned by this employer
    const [result] = await db
      .select({
        application: jobApplications,
        job: jobs,
      })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(and(eq(jobApplications.id, applicationId), eq(jobs.employerId, employerId)));

    if (!result) return undefined;

    const [updated] = await db
      .update(jobApplications)
      .set({ status: "approved" })
      .where(eq(jobApplications.id, applicationId))
      .returning();

    // Send notification to the applicant
    const job = result.job as Job;
    const application = result.application;
    await this.createNotification({
      recipientId: application.applicantId,
      actorId: employerId,
      type: "application",
      entityType: "job",
      entityId: job.id,
      message: `Your application for "${job.title}" at ${job.company} has been approved!`,
    });

    return updated;
  }

  async rejectApplication(applicationId: number, employerId: number): Promise<JobApplication | undefined> {
    // Verify the application belongs to a job owned by this employer
    const [result] = await db
      .select({
        application: jobApplications,
        job: jobs,
      })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(and(eq(jobApplications.id, applicationId), eq(jobs.employerId, employerId)));

    if (!result) return undefined;

    const [updated] = await db
      .update(jobApplications)
      .set({ status: "rejected" })
      .where(eq(jobApplications.id, applicationId))
      .returning();

    // Send notification to the applicant
    const job = result.job as Job;
    const application = result.application;
    await this.createNotification({
      recipientId: application.applicantId,
      actorId: employerId,
      type: "application",
      entityType: "job",
      entityId: job.id,
      message: `Your application for "${job.title}" at ${job.company} has been rejected.`,
    });

    return updated;
  }
}

export const storage = new DatabaseStorage();
