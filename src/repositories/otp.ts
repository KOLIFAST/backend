import sql from "../db/index.js";
import type { DBError } from "../errors/errors.js";
import type { OtpCode } from "../models/models.js";
import { Err, Ok, type Result } from "../types/result.js";
import { generate_uuid } from "../utils/utils.js";


export async function insert_otp_code(code: string, generated_for: string): Promise<Result<void, DBError>> {
  try {
    const otp_code = {
      id: generate_uuid(),
      code: code,
      generated_for: generated_for,
    }
    await sql`
    insert into otp_codes (
      id, code, generated_for
    )
    values (
      ${otp_code.id}, ${otp_code.code},
      ${generated_for}
    );
  `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err(
      {
        type: "DatabaseError",
        message: `Failed to insert OTP code: ${String(err)}`
      }
    )
  }
}

export async function get_otp_code(
  code: string, generated_for: string
): Promise<Result<OtpCode, DBError>> {
  try {
    const [otp_code] = await sql<OtpCode[]>`
      select * from otp_codes where
      code=${code} and generated_for=${generated_for}
      and used=false
      and generated_at > now() - interval '15 minutes'
    `
    if (!otp_code) {
      return Err({ type: "NotFoundError", message: `No valid OTP code ${code} found for ${generated_for}` })
    }
    return Ok(otp_code)
  } catch (err: unknown) {
    return Err(
      {
        type: "DatabaseError",
        message: `Failed to retrieve OTP code: ${String(err)}`
      }
    )
  }
}

export async function set_otp_to_used(
  id: string
): Promise<Result<void, DBError>> {
  try {
    await sql`update otp_codes set used=true where id=${id}`
    return Ok(undefined)
  } catch (err: unknown) {
    return Err(
      {
        type: "DatabaseError",
        message: `Failed to set OTP code status: ${String(err)}`
      }
    )
  }
}
