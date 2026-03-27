import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import passport from "passport";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { setupAuth, hashPassword, requireAuth, requireRole } from "./auth";
import { uploadCV, uploadAvatar, deleteCVFile, deleteAvatarFile, getCVPath, getAvatarPath } from "./upload";
import path from "path";
import fs from "fs";
import {
  insertUserSchema,
  insertPostSchema,
  insertJobSchema,
  updateUserSchema,
  updatePostSchema,
  updateJobSchema,
  loginSchema,
  UserRole,
} from "@shared/schema";
import { ZodError } from "zod";

function sendSuccess<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}

function sendError(res: Response, code: string, message: string, status = 400) {
  res.status(status).json({ success: false, error: { code, message } });
}

function handleZodError(res: Response, error: ZodError) {
  const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
  sendError(res, "VALIDATION_ERROR", message, 400);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
  });

  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests, slow down" } },
  });

  app.get("/api/health", (_req, res) => {
    sendSuccess(res, { status: "ok" });
  });

  app.post("/api/register", authLimiter, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) return sendError(res, "USERNAME_EXISTS", "Username already taken", 409);

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) return sendError(res, "EMAIL_EXISTS", "Email already registered", 409);

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({ ...data, password: hashedPassword });

      const { password, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) return sendError(res, "LOGIN_ERROR", "Registration successful but login failed", 500);
        sendSuccess(res, userWithoutPassword, 201);
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      console.error("Register error:", error);
      sendError(res, "SERVER_ERROR", "Registration failed", 500);
    }
  });

  app.post("/api/login", authLimiter, (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
    }

    passport.authenticate(
      "local",
      (err: Error | null, user: Express.User | false, info: { message: string }) => {
        if (err) return sendError(res, "SERVER_ERROR", "Login failed", 500);
        if (!user) return sendError(res, "INVALID_CREDENTIALS", info?.message || "Invalid credentials", 401);

        req.login(user, (err) => {
          if (err) return sendError(res, "SERVER_ERROR", "Login failed", 500);
          const { password, ...userWithoutPassword } = user as any;
          sendSuccess(res, userWithoutPassword);
        });
      },
    )(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) return sendError(res, "SERVER_ERROR", "Logout failed", 500);
      sendSuccess(res, { message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return sendSuccess(res, null);
    const { password, ...userWithoutPassword } = req.user as any;
    sendSuccess(res, userWithoutPassword);
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        
        const user = await storage.getUserByUsername(req.params.id);
        if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);
        const { password, ...userWithoutPassword } = user;
        return sendSuccess(res, userWithoutPassword);
      }
      
      const user = await storage.getUser(id);
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);
      
      const { password, ...userWithoutPassword } = user;
      sendSuccess(res, userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get user", 500);
    }
  });

  

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(req.user!.id, data);
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);

      const { password, ...userWithoutPassword } = user;
      sendSuccess(res, userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      console.error("Profile update error:", error);
      sendError(res, "SERVER_ERROR", "Profile update failed", 500);
    }
  });

  

  app.post("/api/profile/cv", requireAuth, uploadCV.single("cv") as any, async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, "VALIDATION_ERROR", "No file uploaded", 400);
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);

      
      if (user.cvUrl) {
        const oldFilename = path.basename(user.cvUrl);
        deleteCVFile(oldFilename);
      }

      
      const cvUrl = `/api/cvs/${req.file.filename}`;
      const updatedUser = await storage.updateUser(req.user!.id, { cvUrl });
      if (!updatedUser) return sendError(res, "SERVER_ERROR", "Failed to update CV", 500);

      const { password, ...userWithoutPassword } = updatedUser;
      sendSuccess(res, userWithoutPassword, 201);
    } catch (error: any) {
      console.error("CV upload error:", error);
      if (error.message === "Only PDF, DOC, and DOCX files are allowed") {
        return sendError(res, "VALIDATION_ERROR", error.message, 400);
      }
      if (error.code === "LIMIT_FILE_SIZE") {
        return sendError(res, "VALIDATION_ERROR", "File size exceeds 5MB limit", 400);
      }
      sendError(res, "SERVER_ERROR", "CV upload failed", 500);
    }
  });

  app.delete("/api/profile/cv", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);

      if (user.cvUrl) {
        const filename = path.basename(user.cvUrl);
        deleteCVFile(filename);
        await storage.updateUser(req.user!.id, { cvUrl: null });
      }

      sendSuccess(res, { message: "CV deleted successfully" });
    } catch (error) {
      console.error("CV delete error:", error);
      sendError(res, "SERVER_ERROR", "Failed to delete CV", 500);
    }
  });

  

  app.get("/api/cvs/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = getCVPath(filename);

      if (!fs.existsSync(filePath)) {
        return sendError(res, "NOT_FOUND", "CV not found", 404);
      }

      
      const ext = path.extname(filename).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

      res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("CV download error:", error);
      sendError(res, "SERVER_ERROR", "Failed to download CV", 500);
    }
  });

  

  app.post("/api/profile/avatar", requireAuth, uploadAvatar.single("avatar") as any, async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, "VALIDATION_ERROR", "No file uploaded", 400);
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);

      
      if (user.avatarUrl) {
        const oldFilename = path.basename(user.avatarUrl);
        deleteAvatarFile(oldFilename);
      }

      
      const avatarUrl = `/api/avatars/${req.file.filename}`;
      const updatedUser = await storage.updateUser(req.user!.id, { avatarUrl });
      if (!updatedUser) return sendError(res, "SERVER_ERROR", "Failed to update avatar", 500);

      const { password, ...userWithoutPassword } = updatedUser;
      sendSuccess(res, userWithoutPassword, 201);
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      if (error.message?.includes("Only image files")) {
        return sendError(res, "VALIDATION_ERROR", error.message, 400);
      }
      if (error.code === "LIMIT_FILE_SIZE") {
        return sendError(res, "VALIDATION_ERROR", "File size exceeds 2MB limit", 400);
      }
      sendError(res, "SERVER_ERROR", "Avatar upload failed", 500);
    }
  });

  app.delete("/api/profile/avatar", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);

      if (user.avatarUrl) {
        const filename = path.basename(user.avatarUrl);
        deleteAvatarFile(filename);
        await storage.updateUser(req.user!.id, { avatarUrl: null });
      }

      sendSuccess(res, { message: "Avatar deleted successfully" });
    } catch (error) {
      console.error("Avatar delete error:", error);
      sendError(res, "SERVER_ERROR", "Failed to delete avatar", 500);
    }
  });

  

  app.get("/api/avatars/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = getAvatarPath(filename);

      if (!fs.existsSync(filePath)) {
        return sendError(res, "NOT_FOUND", "Avatar not found", 404);
      }

      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000"); 
      res.sendFile(filePath);
    } catch (error) {
      console.error("Avatar download error:", error);
      sendError(res, "SERVER_ERROR", "Failed to load avatar", 500);
    }
  });

  

  app.get("/api/users", requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const role = req.query.role as string | undefined;
      const status = req.query.status as string | undefined; 
      
      const result = await storage.getAllUsers(page, limit, search, role, status);
      const items = result.items.map(({ password, ...user }) => user);
      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get users error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get users", 500);
    }
  });

  app.post("/api/users/:id/disable", requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (id === req.user!.id) return sendError(res, "FORBIDDEN", "Cannot disable your own account", 403);

      const user = await storage.disableUser(id);
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);

      const { password, ...userWithoutPassword } = user;
      sendSuccess(res, userWithoutPassword);
    } catch (error) {
      console.error("Disable user error:", error);
      sendError(res, "SERVER_ERROR", "Failed to disable user", 500);
    }
  });

  app.post("/api/users/:id/enable", requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.enableUser(id);
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);

      const { password, ...userWithoutPassword } = user;
      sendSuccess(res, userWithoutPassword);
    } catch (error) {
      console.error("Enable user error:", error);
      sendError(res, "SERVER_ERROR", "Failed to enable user", 500);
    }
  });

  app.post("/api/users/:id/role", requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || !Object.values(UserRole).includes(role)) {
        return sendError(res, "VALIDATION_ERROR", "Invalid role", 400);
      }

      if (id === req.user!.id && role !== UserRole.ADMIN) {
        return sendError(res, "FORBIDDEN", "Cannot remove admin role from your own account", 403);
      }

      const user = await storage.updateUser(id, { role });
      if (!user) return sendError(res, "NOT_FOUND", "User not found", 404);

      const { password, ...userWithoutPassword } = user;
      sendSuccess(res, userWithoutPassword);
    } catch (error) {
      console.error("Update user role error:", error);
      sendError(res, "SERVER_ERROR", "Failed to update user role", 500);
    }
  });

  function omitPassword<T extends { password?: string }>(obj: T): Omit<T, "password"> {
    const { password, ...rest } = obj;
    return rest;
  }

  

  app.get("/api/posts", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const q = (req.query.q as string) || undefined;
      const tag = (req.query.tag as string) || undefined;
      
      const result = await storage.getPosts(page, limit, q, tag);

      const items = result.items.map((post) => ({
        ...post,
        author: post.author ? omitPassword(post.author) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get posts error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get posts", 500);
    }
  });

  app.get("/api/posts/my", requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await storage.getPostsByAuthor(req.user!.id, page, limit);

      const items = result.items.map((post) => ({
        ...post,
        author: post.author ? omitPassword(post.author) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get my posts error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get posts", 500);
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPostById(id);
      if (!post) return sendError(res, "NOT_FOUND", "Post not found", 404);

      const result = {
        ...post,
        author: post.author ? omitPassword(post.author) : null,
      };

      sendSuccess(res, result);
    } catch (error) {
      console.error("Get post error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get post", 500);
    }
  });

  app.post("/api/posts", requireAuth, writeLimiter, async (req, res) => {
    try {
      const data = insertPostSchema.parse(req.body);
      const post = await storage.createPost(req.user!.id, data);
      sendSuccess(res, post, 201);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      console.error("Create post error:", error);
      sendError(res, "SERVER_ERROR", "Failed to create post", 500);
    }
  });

  app.patch("/api/posts/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = updatePostSchema.parse(req.body);
      const post = await storage.updatePost(id, req.user!.id, data);
      if (!post) return sendError(res, "NOT_FOUND", "Post not found or not authorized", 404);
      sendSuccess(res, post);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      console.error("Update post error:", error);
      sendError(res, "SERVER_ERROR", "Failed to update post", 500);
    }
  });

  app.delete("/api/posts/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const success =
        req.user!.role === UserRole.ADMIN
          ? await storage.deletePostAdmin(id)
          : await storage.deletePost(id, req.user!.id);

      if (!success) return sendError(res, "NOT_FOUND", "Post not found or not authorized", 404);
      sendSuccess(res, { message: "Post deleted successfully" });
    } catch (error) {
      console.error("Delete post error:", error);
      sendError(res, "SERVER_ERROR", "Failed to delete post", 500);
    }
  });

  

  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await storage.getCommentsByPost(postId, page, limit);
      const items = result.items.map((c: any) => ({
        ...c,
        author: c.author ? omitPassword(c.author) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get comments error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get comments", 500);
    }
  });

  app.post("/api/posts/:id/comments", requireAuth, writeLimiter, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const content = (req.body?.content || "").toString().trim();
      if (!content) return sendError(res, "VALIDATION_ERROR", "content is required", 400);

      const parentCommentId = req.body?.parentCommentId ? parseInt(req.body.parentCommentId) : null;
      if (parentCommentId !== null && isNaN(parentCommentId)) {
        return sendError(res, "VALIDATION_ERROR", "Invalid parentCommentId", 400);
      }

      const comment = await storage.createComment(postId, req.user!.id, { content, parentCommentId });
      sendSuccess(res, comment, 201);
    } catch (error) {
      console.error("Create comment error:", error);
      sendError(res, "SERVER_ERROR", "Failed to create comment", 500);
    }
  });

  app.patch("/api/comments/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const content = (req.body?.content || "").toString().trim();
      if (!content) return sendError(res, "VALIDATION_ERROR", "content is required", 400);

      const updated =
        req.user!.role === UserRole.ADMIN
          ? await storage.updateCommentAdmin(id, { content })
          : await storage.updateComment(id, req.user!.id, { content });

      if (!updated) return sendError(res, "NOT_FOUND", "Comment not found or not authorized", 404);
      sendSuccess(res, updated);
    } catch (error) {
      console.error("Update comment error:", error);
      sendError(res, "SERVER_ERROR", "Failed to update comment", 500);
    }
  });

  app.delete("/api/comments/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const ok =
        req.user!.role === UserRole.ADMIN
          ? await storage.deleteCommentAdmin(id)
          : await storage.deleteComment(id, req.user!.id);

      if (!ok) return sendError(res, "NOT_FOUND", "Comment not found or not authorized", 404);
      sendSuccess(res, { message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Delete comment error:", error);
      sendError(res, "SERVER_ERROR", "Failed to delete comment", 500);
    }
  });

  

  app.post("/api/posts/:id/like", requireAuth, writeLimiter, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const result = await storage.likePost(postId, req.user!.id);
      sendSuccess(res, result, 201);
    } catch (error) {
      console.error("Like post error:", error);
      sendError(res, "SERVER_ERROR", "Failed to like post", 500);
    }
  });

  app.post("/api/posts/:id/unlike", requireAuth, writeLimiter, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const result = await storage.unlikePost(postId, req.user!.id);
      sendSuccess(res, result);
    } catch (error) {
      console.error("Unlike post error:", error);
      sendError(res, "SERVER_ERROR", "Failed to unlike post", 500);
    }
  });

  app.get("/api/posts/:id/likes", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.isAuthenticated() ? (req.user as any).id : null;
      const result = await storage.getPostLikesInfo(postId, userId);
      sendSuccess(res, result);
    } catch (error) {
      console.error("Get likes info error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get likes info", 500);
    }
  });

  

  app.get("/api/jobs/:id/comments", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await storage.getCommentsByJob(jobId, page, limit);
      const items = result.items.map((c: any) => ({
        ...c,
        author: c.author ? omitPassword(c.author) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get job comments error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get comments", 500);
    }
  });

  app.post("/api/jobs/:id/comments", requireAuth, writeLimiter, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const content = (req.body?.content || "").toString().trim();
      if (!content) return sendError(res, "VALIDATION_ERROR", "content is required", 400);

      const parentCommentId = req.body?.parentCommentId ? parseInt(req.body.parentCommentId) : null;
      if (parentCommentId !== null && isNaN(parentCommentId)) {
        return sendError(res, "VALIDATION_ERROR", "Invalid parentCommentId", 400);
      }

      const comment = await storage.createJobComment(jobId, req.user!.id, { content, parentCommentId });
      sendSuccess(res, comment, 201);
    } catch (error) {
      console.error("Create job comment error:", error);
      sendError(res, "SERVER_ERROR", "Failed to create comment", 500);
    }
  });

  app.patch("/api/jobs/comments/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const content = (req.body?.content || "").toString().trim();
      if (!content) return sendError(res, "VALIDATION_ERROR", "content is required", 400);

      const updated =
        req.user!.role === UserRole.ADMIN
          ? await storage.updateJobCommentAdmin(id, { content })
          : await storage.updateJobComment(id, req.user!.id, { content });

      if (!updated) return sendError(res, "NOT_FOUND", "Comment not found or not authorized", 404);
      sendSuccess(res, updated);
    } catch (error) {
      console.error("Update job comment error:", error);
      sendError(res, "SERVER_ERROR", "Failed to update comment", 500);
    }
  });

  app.delete("/api/jobs/comments/:id", requireAuth, writeLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const ok =
        req.user!.role === UserRole.ADMIN
          ? await storage.deleteJobCommentAdmin(id)
          : await storage.deleteJobComment(id, req.user!.id);

      if (!ok) return sendError(res, "NOT_FOUND", "Comment not found or not authorized", 404);
      sendSuccess(res, { message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Delete job comment error:", error);
      sendError(res, "SERVER_ERROR", "Failed to delete comment", 500);
    }
  });

  

  app.get("/api/jobs", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const activeOnly = req.query.active !== "false";

      
      const isAccessible =
        req.query.isAccessible === undefined ? undefined : req.query.isAccessible === "true";

      const q = req.query.q as string | undefined;
      const jobType = req.query.jobType as string | undefined;
      const location = req.query.location as string | undefined;
      const includeExpired = req.query.includeExpired === "true";

      const result = await storage.getJobs(page, limit, activeOnly, isAccessible, q, jobType, location, includeExpired);

      const items = result.items.map((job) => ({
        ...job,
        employer: job.employer ? omitPassword(job.employer) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get jobs error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get jobs", 500);
    }
  });

  app.get("/api/jobs/my", requireRole(UserRole.EMPLOYER, UserRole.ADMIN), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await storage.getJobsByEmployer(req.user!.id, page, limit);

      const items = result.items.map((job) => ({
        ...job,
        employer: job.employer ? omitPassword(job.employer) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get my jobs error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get jobs", 500);
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJobById(id);
      if (!job) return sendError(res, "NOT_FOUND", "Job not found", 404);

      const result = {
        ...job,
        employer: job.employer ? omitPassword(job.employer) : null,
      };

      sendSuccess(res, result);
    } catch (error) {
      console.error("Get job error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get job", 500);
    }
  });

  app.post("/api/jobs", requireRole(UserRole.EMPLOYER, UserRole.ADMIN), writeLimiter, async (req, res) => {
    try {
      const data = insertJobSchema.parse(req.body);
      const job = await storage.createJob(req.user!.id, data);
      sendSuccess(res, job, 201);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      console.error("Create job error:", error);
      sendError(res, "SERVER_ERROR", "Failed to create job", 500);
    }
  });

  app.patch("/api/jobs/:id", requireRole(UserRole.EMPLOYER, UserRole.ADMIN), writeLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = updateJobSchema.parse(req.body);
      const job = await storage.updateJob(id, req.user!.id, data);
      if (!job) return sendError(res, "NOT_FOUND", "Job not found or not authorized", 404);
      sendSuccess(res, job);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      console.error("Update job error:", error);
      sendError(res, "SERVER_ERROR", "Failed to update job", 500);
    }
  });

  app.delete("/api/jobs/:id", requireRole(UserRole.EMPLOYER, UserRole.ADMIN), writeLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const success =
        req.user!.role === UserRole.ADMIN
          ? await storage.deleteJobAdmin(id)
          : await storage.deleteJob(id, req.user!.id);

      if (!success) return sendError(res, "NOT_FOUND", "Job not found or not authorized", 404);
      sendSuccess(res, { message: "Job deleted successfully" });
    } catch (error) {
      console.error("Delete job error:", error);
      sendError(res, "SERVER_ERROR", "Failed to delete job", 500);
    }
  });

  
  app.post("/api/jobs/:id/apply", requireAuth, writeLimiter, uploadCV.single("cv") as any, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) return sendError(res, "VALIDATION_ERROR", "Invalid job ID", 400);

      const job = await storage.getJobById(jobId);
      if (!job) return sendError(res, "NOT_FOUND", "Job not found", 404);
      if (!job.isActive) return sendError(res, "VALIDATION_ERROR", "Cannot apply to inactive job", 400);

      const hasApplied = await storage.hasAppliedToJob(jobId, req.user!.id);
      if (hasApplied) return sendError(res, "VALIDATION_ERROR", "You have already applied to this job", 409);

      const skills = (req.body.skills || "").toString().trim();
      if (!skills) return sendError(res, "VALIDATION_ERROR", "Skills are required", 400);
      if (skills.length > 500) return sendError(res, "VALIDATION_ERROR", "Skills too long (max 500 characters)", 400);

      let cvUrl: string | null = null;
      if (req.file) {
        cvUrl = `/api/cvs/${req.file.filename}`;
      }

      const application = await storage.applyToJob(jobId, req.user!.id, { skills, cvUrl });
      sendSuccess(res, application, 201);
    } catch (error: any) {
      console.error("Apply to job error:", error);
      if (error.code === "23505") {
        return sendError(res, "VALIDATION_ERROR", "You have already applied to this job", 409);
      }
      if (error.message?.includes("Only PDF, DOC, and DOCX files")) {
        return sendError(res, "VALIDATION_ERROR", error.message, 400);
      }
      if (error.code === "LIMIT_FILE_SIZE") {
        return sendError(res, "VALIDATION_ERROR", "File size exceeds 5MB limit", 400);
      }
      sendError(res, "SERVER_ERROR", "Failed to apply to job", 500);
    }
  });

  app.get("/api/jobs/:id/applications", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) return sendError(res, "VALIDATION_ERROR", "Invalid job ID", 400);

      const job = await storage.getJobById(jobId);
      if (!job) return sendError(res, "NOT_FOUND", "Job not found", 404);

      const isOwner = job.employerId === req.user!.id;
      const isAdmin = req.user!.role === UserRole.ADMIN;
      if (!isOwner && !isAdmin) {
        return sendError(res, "FORBIDDEN", "Only job owner or admin can view applications", 403);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await storage.getApplicationsByJob(jobId, page, limit);
      const items = result.items.map((app) => ({
        ...app,
        applicant: app.applicant ? omitPassword(app.applicant) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get job applications error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get applications", 500);
    }
  });

  app.get("/api/jobs/:id/applied", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) return sendError(res, "VALIDATION_ERROR", "Invalid job ID", 400);

      const hasApplied = await storage.hasAppliedToJob(jobId, req.user!.id);
      sendSuccess(res, { applied: hasApplied });
    } catch (error) {
      console.error("Check applied status error:", error);
      sendError(res, "SERVER_ERROR", "Failed to check application status", 500);
    }
  });

  app.get("/api/applications/my", requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await storage.getApplicationsByApplicant(req.user!.id, page, limit);
      const items = result.items.map((app) => ({
        ...app,
        applicant: app.applicant ? omitPassword(app.applicant) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get my applications error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get applications", 500);
    }
  });

  app.get("/api/applications/employer", requireRole(UserRole.EMPLOYER, UserRole.ADMIN), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await storage.getApplicationsByEmployer(req.user!.id, page, limit);
      const items = result.items.map((app) => ({
        ...app,
        applicant: app.applicant ? omitPassword(app.applicant) : null,
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get employer applications error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get applications", 500);
    }
  });

  app.delete("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (isNaN(applicationId)) return sendError(res, "VALIDATION_ERROR", "Invalid application ID", 400);

      const success = await storage.deleteJobApplication(applicationId, req.user!.id);
      if (!success) return sendError(res, "NOT_FOUND", "Application not found or not authorized", 404);

      sendSuccess(res, { message: "Application withdrawn successfully" });
    } catch (error) {
      console.error("Delete application error:", error);
      sendError(res, "SERVER_ERROR", "Failed to withdraw application", 500);
    }
  });

  app.post("/api/applications/:id/approve", requireRole(UserRole.EMPLOYER, UserRole.ADMIN), async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (isNaN(applicationId)) return sendError(res, "VALIDATION_ERROR", "Invalid application ID", 400);

      const application = await storage.approveApplication(applicationId, req.user!.id);
      if (!application) return sendError(res, "NOT_FOUND", "Application not found or not authorized", 404);

      sendSuccess(res, application);
    } catch (error) {
      console.error("Approve application error:", error);
      sendError(res, "SERVER_ERROR", "Failed to approve application", 500);
    }
  });

  app.post("/api/applications/:id/reject", requireRole(UserRole.EMPLOYER, UserRole.ADMIN), async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      if (isNaN(applicationId)) return sendError(res, "VALIDATION_ERROR", "Invalid application ID", 400);

      const application = await storage.rejectApplication(applicationId, req.user!.id);
      if (!application) return sendError(res, "NOT_FOUND", "Application not found or not authorized", 404);

      sendSuccess(res, application);
    } catch (error) {
      console.error("Reject application error:", error);
      sendError(res, "SERVER_ERROR", "Failed to reject application", 500);
    }
  });

  

  app.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.user!.id);
      const result = conversations.map((conv) => ({
        ...conv,
        otherUser: omitPassword(conv.otherUser),
      }));
      sendSuccess(res, result);
    } catch (error) {
      console.error("Get conversations error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get conversations", 500);
    }
  });

  app.get("/api/messages/:userId", requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) return sendError(res, "VALIDATION_ERROR", "Invalid user ID", 400);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await storage.getMessages(req.user!.id, otherUserId, page, limit);
      const items = result.items.map((msg) => ({
        ...msg,
        sender: omitPassword(msg.sender),
        recipient: omitPassword(msg.recipient),
      }));

      sendSuccess(res, { ...result, items });
    } catch (error) {
      console.error("Get messages error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get messages", 500);
    }
  });

  app.post("/api/messages", requireAuth, writeLimiter, async (req, res) => {
    try {
      const { recipientId, content } = req.body;
      if (!recipientId || !content) {
        return sendError(res, "VALIDATION_ERROR", "recipientId and content are required", 400);
      }

      const recipientIdNum = parseInt(recipientId);
      if (isNaN(recipientIdNum)) return sendError(res, "VALIDATION_ERROR", "Invalid recipient ID", 400);

      if (recipientIdNum === req.user!.id) {
        return sendError(res, "VALIDATION_ERROR", "Cannot send message to yourself", 400);
      }

      const message = await storage.sendMessage(req.user!.id, recipientIdNum, content);
      sendSuccess(res, message, 201);
    } catch (error) {
      console.error("Send message error:", error);
      sendError(res, "SERVER_ERROR", "Failed to send message", 500);
    }
  });

  app.post("/api/messages/:userId/read", requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) return sendError(res, "VALIDATION_ERROR", "Invalid user ID", 400);

      await storage.markMessagesAsRead(req.user!.id, otherUserId);
      sendSuccess(res, { message: "Messages marked as read" });
    } catch (error) {
      console.error("Mark messages as read error:", error);
      sendError(res, "SERVER_ERROR", "Failed to mark messages as read", 500);
    }
  });

  app.get("/api/messages/unread/count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadMessagesCount(req.user!.id);
      sendSuccess(res, { count });
    } catch (error) {
      console.error("Get unread messages count error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get unread count", 500);
    }
  });

  

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getNotifications(req.user!.id, page, limit);
      sendSuccess(res, result);
    } catch (error) {
      console.error("Get notifications error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get notifications", 500);
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationsCount(req.user!.id);
      sendSuccess(res, { count });
    } catch (error) {
      console.error("Get unread notifications count error:", error);
      sendError(res, "SERVER_ERROR", "Failed to get unread count", 500);
    }
  });

  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      sendSuccess(res, { message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      sendError(res, "SERVER_ERROR", "Failed to mark all as read", 500);
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return sendError(res, "VALIDATION_ERROR", "Invalid notification ID", 400);

      const success = await storage.markNotificationRead(req.user!.id, id);
      if (!success) return sendError(res, "NOT_FOUND", "Notification not found", 404);

      sendSuccess(res, { message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      sendError(res, "SERVER_ERROR", "Failed to mark notification as read", 500);
    }
  });

  return httpServer;
}
