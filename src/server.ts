import express from "express"
import "dotenv/config"
import healthHandler from "./handlers/health.js"

const app = express()

const env = process.env.ENV ?? "dev"

app.get("/health", healthHandler.getDbHealthStatus)

const PORT = process.env.PORT || "8080"

app.listen(PORT, () => {
  console.info(`Listening on PORT ${PORT}`)
  if (env == "dev") {
    console.info("Health check at http://0.0.0.0:8080/health")
  }
})
