import type { Request, Response } from "express";
import z from "zod";
import { parse_invalid_fields } from "../utils/utils.js";
import type { ZodIssue } from "zod/v3";
import { update_user_profile } from "../repositories/user.js";

export async function handle_profile_update(req: Request, res: Response) {
  let current_user = req.user!
  const parseResult = z.object({
    profile_picture: z.string().nonempty().nullable(),
    full_name: z.string().nonempty().nullable()
  }).safeParse(req.body)
  if (!parseResult.success) {
    const invalid_fields = parse_invalid_fields(parseResult.error.issues as ZodIssue[])
    return res.status(400).json({
      invalid_fields
    })
  }
  const { profile_picture, full_name } = parseResult.data
  if (profile_picture) {
    current_user.profile_picture = profile_picture
  }
  if (full_name) {
    current_user.full_name = full_name
  }
  const result = await update_user_profile(current_user)
  if (!result.ok) {
    console.error(result.error.message)
    return res.status(500).json()
  }
  return res.status(200).json()
}

export async function handle_get_user_data(req: Request, res: Response) {
  let current_user = req.user!
  return res.status(200).json({
    data: {
      user: current_user
    }
  })
}
