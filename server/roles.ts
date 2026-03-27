import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Login required" },
    });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (user.role === "admin") return next(); 

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not allowed" },
      });
    }
    next();
  };
}
