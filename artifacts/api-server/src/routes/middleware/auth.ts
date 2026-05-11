import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AdminTokenPayload {
  adminId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "Server misconfigured: missing SESSION_SECRET" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
