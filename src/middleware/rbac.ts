import type { Response, NextFunction, Request } from "express"

/**
 * Middleware to require that the user is a driver
 * Must be used after authenticate middleware
 */
export function requireDriver(req: Request, res: Response, next: NextFunction) {
  const user = req.user

  if (!user) {
    return res.status(401).json({
      error: "Unauthorized - No user found"
    })
  }

  if (user.user_type !== 'driver') {
    return res.status(403).json({
      error: "Forbidden - This endpoint is only accessible to drivers"
    })
  }

  return next()
}

/**
 * Middleware to require that the user is a client
 * Must be used after authenticate middleware
 */
export function requireClient(req: Request, res: Response, next: NextFunction) {
  const user = req.user

  if (!user) {
    return res.status(401).json({
      error: "Unauthorized - No user found"
    })
  }

  if (user.user_type !== 'client') {
    return res.status(403).json({
      error: "Forbidden - This endpoint is only accessible to clients"
    })
  }

  return next()
}

/**
 * Middleware to require that the user is an admin
 * Must be used after authenticate middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user

  if (!user) {
    return res.status(401).json({
      error: "Unauthorized - No user found"
    })
  }

  if (user.user_type !== 'admin') {
    return res.status(403).json({
      error: "Forbidden - This endpoint is only accessible to admins"
    })
  }

  return next()
}

/**
 * Middleware to require that the user is either a driver or admin
 * Useful for KYC-related endpoints
 */
export function requireDriverOrAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user

  if (!user) {
    return res.status(401).json({
      error: "Unauthorized - No user found"
    })
  }

  if (user.user_type !== 'driver' && user.user_type !== 'admin') {
    return res.status(403).json({
      error: "Forbidden - This endpoint is only accessible to drivers and admins"
    })
  }

  return next()
}

/**
 * Middleware to check if driver has completed KYC verification
 * Must be used after authenticate and requireDriver middlewares
 */
export function requireVerifiedDriver(req: Request, res: Response, next: NextFunction) {
  const user = req.user

  if (!user) {
    return res.status(401).json({
      error: "Unauthorized - No user found"
    })
  }

  if (user.user_type !== 'driver') {
    return res.status(403).json({
      error: "Forbidden - Not a driver"
    })
  }

  if (!user.driver_verified) {
    return res.status(403).json({
      error: "Forbidden - KYC verification not completed",
      kycRequired: true
    })
  }

  return next()
}
