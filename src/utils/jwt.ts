import jwt from 'jsonwebtoken'
import type { Result } from '../types/result.js'
import { Err, Ok } from '../types/result.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const JWT_EXPIRATION = '365d' // 1 year - user stays logged in until manual logout

export type JWTPayload = {
  userId: string
  phone: string
}

export type JWTError = {
  type: 'JWTError'
  message: string
}

/**
 * Generate a JWT token for a user
 */
export function generate_jwt_token(userId: string, phone: string): string {
  const payload: JWTPayload = {
    userId,
    phone
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION
  })
}

/**
 * Verify and decode a JWT token
 */
export function verify_jwt_token(token: string): Result<JWTPayload, JWTError> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return Ok(decoded)
  } catch (err: unknown) {
    return Err({
      type: 'JWTError',
      message: `Invalid or expired token: ${String(err)}`
    })
  }
}
