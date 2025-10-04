import { randomInt } from "crypto"
import type { ZodIssue } from "zod/v3"

export function generate_otp_code() {
  return randomInt(10000, 1000000).toString()
}

export function parse_invalid_fields(issues: ZodIssue[]) {
  let invalid_fields: string[] = []
  issues.map(issue => {
    issue.path.map(p => {
      invalid_fields.push(String(p))
    })
  })
  return invalid_fields
}

export function generate_uuid(): string {
  return crypto.randomUUID().toString()
}

export const query_by_phone = "phone"
export const query_by_id = "id"
