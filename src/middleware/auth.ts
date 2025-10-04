import type { Response, NextFunction, Request } from "express";
import { get_session_by_id } from "../repositories/session.js";
import { get_user_by_id } from "../repositories/user.js";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const session_id = req.headers.authorization
  if (!session_id) {
    return res.status(401).json()
  }
  const result = await get_session_by_id(session_id)
  if (!result.ok) {
    console.error(result.error.message)
    return res.status(401).json()
  }
  const get_user_result = await get_user_by_id(result.value.user_id)
  if (!get_user_result.ok) {
    console.error(get_user_result.error.message)
    return res.status(401).json()
  }
  req.user = get_user_result.value
  req.session_id = session_id
  return next()
}

