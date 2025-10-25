import sql from "../db/index.js";
import type { DBError } from "../errors/errors.js";
import type { User } from "../models/models.js";
import { Err, Ok, type Result } from "../types/result.js";

export async function insert_user(user: { id: string, phone: string, full_name?: string }): Promise<Result<void, DBError>> {
  try {
    await sql`
      insert into users (
        id, phone, full_name
      )
      values (
        ${user.id}, ${user.phone}, ${user.full_name || ''}
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
    const [user] = await sql<User[]>`
      select * from users where id=${id}
    `
    if (user == undefined) {
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
    const [user] = await sql<User[]>`
      select * from users where phone=${phone}
    `
    if (user == undefined) {
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

export async function update_user_profile(user: User): Promise<Result<void, DBError>> {
  try {
    const { id, profile_picture, full_name } = user
    await sql`
      update users set
        profile_picture=${profile_picture},
        full_name=${full_name}
      where id=${id}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error while updating user profile: ${String(err)}`
    })
  }
}
