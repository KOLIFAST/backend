export type DBError =
  | { type: "DatabaseError"; message: string }
  | { type: "ValidationError"; message: string }
  | { type: "DuplicateError"; message: string }
  | { type: "NotFoundError"; message: string }
