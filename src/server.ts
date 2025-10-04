import express from "express"
import "dotenv/config"
import healthHandler from "./handlers/health.js"
import { handle_logout, handle_otp_request, handle_otp_verification } from "./handlers/auth.js"
import { authenticate } from "./middleware/auth.js"

const app = express()
app.use(express.json())

const env = process.env.ENV ?? "dev"

app.get("/health", healthHandler.getDbHealthStatus)

app.post("/auth/request-otp", handle_otp_request)
app.post("/auth/verify-otp", handle_otp_verification)
app.use(authenticate).get("/auth/logout", handle_logout)

const PORT = process.env.PORT || "8080"

app.listen(PORT, () => {
  console.info(`Listening on PORT ${PORT}`)
  if (env == "dev") {
    console.info("Health check at http://0.0.0.0:8080/health")
  }
})
