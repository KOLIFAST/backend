import type { Request, Response } from "express"
import z from "zod"
import { generate_otp_code, generate_uuid, parse_invalid_fields } from "../utils/utils.js"
import { get_otp_code, insert_otp_code } from "../repositories/otp.js"
import type { ZodIssue } from "zod/v3"
import { check_user_existance_by_phone, insert_user, get_user_by_id } from "../repositories/user.js"
import { send_otp_via_whatsapp } from "../providers/whatsapp.js"
import { generate_jwt_token } from "../utils/jwt.js"

export async function handle_otp_request(req: Request, res: Response) {
  const parseResult = z.object({
    phone: z.string().nonempty()
  }).safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({
      invalid_fields: ["phone"]
    })
  }
  const { phone } = parseResult.data
  const otp_code = generate_otp_code()
  const result = await insert_otp_code(otp_code, phone)
  if (!result.ok) {
    return res.status(500).json()
  }
  const send_otp_result = await send_otp_via_whatsapp(otp_code, phone)
  if (!send_otp_result.ok) {
    console.error(send_otp_result.error.message)
    return res.status(500).json()
  }
  return res.status(200).json()
}

//TODO: Potential refactoring
export async function handle_otp_verification(req: Request, res: Response) {
  const parseResult = z.object({
    phone: z.string().nonempty(),
    code: z.string().nonempty(),
    fullName: z.string().nonempty().optional()
  }).safeParse(req.body)
  if (!parseResult.success) {
    const invalid_fields = parse_invalid_fields(parseResult.error.issues as ZodIssue[])
    return res.status(400).json({
      invalid_fields
    })
  }
  const { phone, code, fullName } = parseResult.data
  const result = await get_otp_code(code, phone)
  if (!result.ok) {
    console.error(result.error.message)
    if (result.error.type == "NotFoundError") {
      return res.status(422).json({
        error: "invalid_otp"
      })
    }
    return res.status(500).json()
  }
  const user_exists_result = await check_user_existance_by_phone(phone)
  if (!user_exists_result.ok) {
    console.error(user_exists_result.error.message)
    return res.status(500).json()
  }
  let user_id = user_exists_result.value
  if (user_id == undefined) {
    const new_user = {
      id: generate_uuid(),
      phone: phone,
      full_name: fullName
    }
    const user_creation_result = await insert_user(new_user)
    if (!user_creation_result.ok) {
      console.error(user_creation_result.error.message)
      return res.status(500).json()
    }
    user_id = new_user.id
  }

  // Generate JWT token
  const token = generate_jwt_token(user_id.toString(), phone)

  // Get user data to return
  const user_result = await get_user_by_id(user_id.toString())
  if (!user_result.ok) {
    console.error(user_result.error.message)
    return res.status(500).json()
  }

  return res.status(200).json({
    data: {
      token: token,
      user: user_result.value
    }
  })
}

export async function handle_logout(req: Request, res: Response) {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint can be used for tracking/analytics or blacklisting tokens if needed
  return res.status(200).json({
    message: "Logged out successfully"
  })
}
