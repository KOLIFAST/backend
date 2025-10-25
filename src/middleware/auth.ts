import type { Response, NextFunction, Request } from "express";
import { get_user_by_id } from "../repositories/user.js";
import { verify_jwt_token } from "../utils/jwt.js";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authorization_header = req.headers.authorization
  if (!authorization_header) {
    return res.status(401).json({
      error: "No authorization header"
    })
  }

  // Support both "Bearer <token>" and just "<token>"
  const token = authorization_header.startsWith('Bearer ')
    ? authorization_header.substring(7)
    : authorization_header

  // Verify JWT token
  const verify_result = verify_jwt_token(token)
  if (!verify_result.ok) {
    console.error(verify_result.error.message)
    return res.status(401).json({
      error: "Invalid or expired token"
    })
  }

  const { userId } = verify_result.value

  // Load user from database
  const get_user_result = await get_user_by_id(userId)
  if (!get_user_result.ok) {
    console.error(get_user_result.error.message)
    return res.status(401).json({
      error: "User not found"
    })
  }

  // Attach user to request
  req.user = get_user_result.value

  return next()
}

