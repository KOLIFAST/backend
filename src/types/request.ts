import type { User } from "../models/models.js";
import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session_id?: string;
    }
  }
}

// Multer Request type for file uploads
export interface MulterRequest extends Request {
  file?: Express.Multer.File | undefined;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined;
}
