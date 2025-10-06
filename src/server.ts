import express, { Router } from "express"
import "dotenv/config"
import healthHandler from "./handlers/health.js"
import { handle_logout, handle_otp_request, handle_otp_verification } from "./handlers/auth.js"
import { authenticate } from "./middleware/auth.js"
import { handle_get_user_data, handle_profile_update } from "./handlers/user.js"

const app = express()
const authed_router = Router().use(authenticate)
app.use(express.json())
app.use(authed_router)

const env = process.env.ENV ?? "dev"

app.get("/health", healthHandler.getDbHealthStatus)

app.post("/auth/request-otp", handle_otp_request)
app.post("/auth/verify-otp", handle_otp_verification)
authed_router.get("/auth/logout", handle_logout)

authed_router.patch("/users", handle_profile_update)
authed_router.get("/users", handle_get_user_data)

const PORT = process.env.PORT || "8080"

app.listen(PORT, () => {
  console.info(`Listening on PORT ${PORT}`)
  if (env == "dev") {
    console.info("Health check at http://0.0.0.0:8080/health")
  }
})
