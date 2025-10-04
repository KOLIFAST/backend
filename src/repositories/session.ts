import sql from "../db/index.js";
import type { DBError } from "../errors/errors.js";
import { Err, Ok, type Result } from "../types/result.js";

export async function insert_session(
  session: { id: string, user_id: string }
): Promise<Result<void, DBError>> {
  try {
    await sql`
      insert into sessions(
        id, user_id 
      ) values (
        ${session.id}, ${session.user_id}
      )
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Failed to insert session: ${String(err)}`
    })
  }
}

// export async function get_session_by_id(id: string) { }
// export async function invalidate_session(id: string) { }
