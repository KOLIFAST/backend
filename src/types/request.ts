import type { User } from "../models/models.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session_id?: string;
    }
  }
}
