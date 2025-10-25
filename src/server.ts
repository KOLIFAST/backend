import express, { Router } from "express"
import "dotenv/config"
import healthHandler from "./handlers/health.js"
import { handle_logout, handle_otp_request, handle_otp_verification } from "./handlers/auth.js"
import { authenticate } from "./middleware/auth.js"
import { handle_get_user_data, handle_profile_update } from "./handlers/user.js"
import { requireDriver, requireClient } from "./middleware/rbac.js"
import {
  handle_identity_upload,
  handle_address_upload,
  handle_selfie_upload,
  handle_references_submit,
  handle_get_kyc_status,
  handle_kyc_submit
} from "./handlers/kyc.js"
import {
  handle_send_parcel,
  handle_receive_parcel,
  handle_list_parcels,
  handle_parcel_details,
  handle_parcel_tracking,
  handle_update_parcel_status,
  handle_report_problem
} from "./handlers/parcel.js"
import { kycUpload } from "./utils/fileUpload.js"

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

// KYC Routes (Driver only)
// Upload identity document (front + back)
authed_router.post(
  "/kyc/identity-upload",
  requireDriver,
  kycUpload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
  ]),
  handle_identity_upload
)

// Upload address proof
authed_router.post(
  "/kyc/address-upload",
  requireDriver,
  kycUpload.single('document'),
  handle_address_upload
)

// Upload selfie with identity document
authed_router.post(
  "/kyc/selfie-upload",
  requireDriver,
  kycUpload.single('selfie'),
  handle_selfie_upload
)

// Submit personal references
authed_router.post("/kyc/references", requireDriver, handle_references_submit)

// Get KYC status
authed_router.get("/kyc/status", requireDriver, handle_get_kyc_status)

// Submit KYC for review
authed_router.post("/kyc/submit", requireDriver, handle_kyc_submit)

// Parcel Routes (Client only for send/receive, accessible to both for viewing)
// Create parcel - send
authed_router.post("/parcels/send", requireClient, handle_send_parcel)

// Create parcel - receive
authed_router.post("/parcels/receive", requireClient, handle_receive_parcel)

// List user's parcels (accessible to clients and drivers)
authed_router.get("/parcels/list", handle_list_parcels)

// Get parcel details (accessible to owner and assigned driver)
authed_router.get("/parcels/:id", handle_parcel_details)

// Track parcel in real-time (accessible to anyone with the ID)
authed_router.get("/parcels/:id/track", handle_parcel_tracking)

// Update parcel status (Driver or Admin only)
authed_router.put("/parcels/:id", handle_update_parcel_status)

// Report a problem (Owner only)
authed_router.post("/parcels/:id/report", handle_report_problem)

const PORT = process.env.PORT || "8080"

app.listen(PORT, () => {
  console.info(`Listening on PORT ${PORT}`)
  if (env == "dev") {
    console.info("Health check at http://0.0.0.0:8080/health")
  }
})
