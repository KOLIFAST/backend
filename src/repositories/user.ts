import sql from "../db/index.js";
import type { DBError } from "../errors/errors.js";
import type { User } from "../models/models.js";
import { Err, Ok, type Result } from "../types/result.js";
import { query_by_id } from "../utils/utils.js";

export async function insert_user(user: { id: string, phone: string }): Promise<Result<void, DBError>> {
  try {
    await sql`
      insert into users (
        id, phone
      )
      values (
        ${user.id}, ${user.phone}
      )
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error while inserting user: ${String(err)}`
    })
  }
}

async function get_user(by: string, value: string): Promise<User | undefined> {
  const [user] = await sql<User[]>`
    select * from users where ${by}=${value}
  `
  return user
}

export async function check_user_existance_by_phone(phone: string): Promise<Result<String | undefined, DBError>> {
  try {
    const [result] = await sql<{ id: string }[]>`
      select id from users where phone=${phone}
    `
    return Ok(result?.id)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error while checking or user existance: ${String(err)}`
    })
  }
}

export async function get_user_by_id(id: string): Promise<Result<User, DBError>> {
  try {
    const user = await get_user(query_by_id, id)
    if (!user) {
      return Err({
        type: "NotFoundError",
        message: `User with id ${id} was not found`
      })
    }
    return Ok(user)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError", message: `Error while getting user by ID: ${String(err)}`
    })
  }
}

export async function get_user_by_phone_number(phone: string): Promise<Result<User, DBError>> {
  try {
    const user = await get_user("phone", phone)
    if (!user) {
      return Err({
        type: "NotFoundError",
        message: `User with phone ${phone} was not found`
      })
    }
    return Ok(user)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError", message: `Error while getting user by phone number: ${String(err)}`
    })
  }
}
