export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export function unwrap<T, E>(res: Result<T, E>): T {
  if (res.ok) {
    return res.value
  }
  throw new Error(
    `Tried to unwrap an Err result: ${String(
      (res as { error: E }).error
    )}`
  );
}

export function unwrapOr<T, E>(res: Result<T, E>, fallback: T): T {
  return res.ok ? res.value : fallback;
}
