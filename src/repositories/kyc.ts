import sql from "../db/index.js"
import type { DBError } from "../errors/errors.js"
import type { KYCDocument, KYCReference, KYCStatus } from "../models/models.js"
import { Err, Ok, type Result } from "../types/result.js"

// ==================== KYC DOCUMENTS ====================

/**
 * Insert a new KYC document
 */
export async function insert_kyc_document(doc: {
  id: string
  user_id: string
  document_type: 'identity' | 'address' | 'selfie'
  identity_document_type?: 'cni' | 'passport' | 'permit' | undefined
  front_image_path: string
  back_image_path?: string | undefined
  file_size: number
  mime_type: string
}): Promise<Result<void, DBError>> {
  try {
    await sql`
      INSERT INTO kyc_documents (
        id, user_id, document_type, identity_document_type,
        front_image_path, back_image_path, file_size, mime_type, status
      ) VALUES (
        ${doc.id}, ${doc.user_id}, ${doc.document_type}, ${doc.identity_document_type || null},
        ${doc.front_image_path}, ${doc.back_image_path || null}, ${doc.file_size}, ${doc.mime_type}, 'pending'
      )
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error inserting KYC document: ${String(err)}`
    })
  }
}

/**
 * Get all documents for a user
 */
export async function get_kyc_documents_by_user(user_id: string): Promise<Result<KYCDocument[], DBError>> {
  try {
    const documents = await sql<KYCDocument[]>`
      SELECT * FROM kyc_documents
      WHERE user_id = ${user_id}
      ORDER BY uploaded_at DESC
    `
    return Ok(documents)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching KYC documents: ${String(err)}`
    })
  }
}

/**
 * Get a specific document by ID
 */
export async function get_kyc_document_by_id(document_id: string): Promise<Result<KYCDocument, DBError>> {
  try {
    const [document] = await sql<KYCDocument[]>`
      SELECT * FROM kyc_documents WHERE id = ${document_id}
    `
    if (!document) {
      return Err({
        type: "NotFoundError",
        message: `KYC document with id ${document_id} not found`
      })
    }
    return Ok(document)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching KYC document: ${String(err)}`
    })
  }
}

/**
 * Get documents by type for a user
 */
export async function get_kyc_document_by_type(
  user_id: string,
  document_type: 'identity' | 'address' | 'selfie'
): Promise<Result<KYCDocument | undefined, DBError>> {
  try {
    const [document] = await sql<KYCDocument[]>`
      SELECT * FROM kyc_documents
      WHERE user_id = ${user_id} AND document_type = ${document_type}
      ORDER BY uploaded_at DESC
      LIMIT 1
    `
    return Ok(document)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching KYC document by type: ${String(err)}`
    })
  }
}

/**
 * Update document verification status
 */
export async function update_document_verification_status(
  document_id: string,
  status: 'pending' | 'verified' | 'rejected',
  notes?: string,
  verified_by?: string
): Promise<Result<void, DBError>> {
  try {
    await sql`
      UPDATE kyc_documents
      SET status = ${status},
          verification_notes = ${notes || null},
          verified_by = ${verified_by || null},
          verified_at = CASE WHEN ${status} = 'verified' THEN NOW() ELSE NULL END,
          rejected_at = CASE WHEN ${status} = 'rejected' THEN NOW() ELSE NULL END,
          rejection_reason = CASE WHEN ${status} = 'rejected' THEN ${notes || null} ELSE NULL END
      WHERE id = ${document_id}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error updating document status: ${String(err)}`
    })
  }
}

/**
 * Delete a KYC document (for resubmission)
 */
export async function delete_kyc_document(document_id: string): Promise<Result<void, DBError>> {
  try {
    await sql`DELETE FROM kyc_documents WHERE id = ${document_id}`
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error deleting KYC document: ${String(err)}`
    })
  }
}

// ==================== KYC REFERENCES ====================

/**
 * Insert KYC references
 */
export async function insert_kyc_references(
  user_id: string,
  references: Array<{ id: string; full_name: string; phone: string; relation: string }>
): Promise<Result<void, DBError>> {
  try {
    // Delete existing references first
    await sql`DELETE FROM kyc_references WHERE user_id = ${user_id}`

    // Insert new references
    if (references.length > 0) {
      const rows = references.map(ref => ({
        id: ref.id,
        user_id: user_id,
        full_name: ref.full_name,
        phone: ref.phone,
        relation: ref.relation
      }))

      await sql`
        INSERT INTO kyc_references ${sql(rows)}
      `
    }

    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error inserting KYC references: ${String(err)}`
    })
  }
}

/**
 * Get all references for a user
 */
export async function get_kyc_references_by_user(user_id: string): Promise<Result<KYCReference[], DBError>> {
  try {
    const references = await sql<KYCReference[]>`
      SELECT * FROM kyc_references
      WHERE user_id = ${user_id}
      ORDER BY created_at ASC
    `
    return Ok(references)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching KYC references: ${String(err)}`
    })
  }
}

// ==================== KYC STATUS ====================

/**
 * Initialize KYC status for a user
 */
export async function initialize_kyc_status(user_id: string): Promise<Result<void, DBError>> {
  try {
    await sql`
      INSERT INTO kyc_status (user_id, started_at)
      VALUES (${user_id}, NOW())
      ON CONFLICT (user_id) DO NOTHING
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error initializing KYC status: ${String(err)}`
    })
  }
}

/**
 * Get KYC status for a user
 */
export async function get_kyc_status(user_id: string): Promise<Result<KYCStatus, DBError>> {
  try {
    const [status] = await sql<KYCStatus[]>`
      SELECT * FROM kyc_status WHERE user_id = ${user_id}
    `

    if (!status) {
      // Initialize if doesn't exist
      await initialize_kyc_status(user_id)
      const [newStatus] = await sql<KYCStatus[]>`
        SELECT * FROM kyc_status WHERE user_id = ${user_id}
      `
      if (!newStatus) {
        return Err({
          type: "DatabaseError",
          message: "Failed to create KYC status"
        })
      }
      return Ok(newStatus)
    }

    return Ok(status)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching KYC status: ${String(err)}`
    })
  }
}

/**
 * Update individual document status in KYC status
 */
export async function update_kyc_document_status(
  user_id: string,
  document_type: 'identity' | 'address' | 'selfie' | 'references',
  status: 'not_submitted' | 'pending' | 'verified' | 'rejected' | 'skipped'
): Promise<Result<void, DBError>> {
  try {
    // Use conditional updates based on document type
    if (document_type === 'identity') {
      await sql`UPDATE kyc_status SET identity_status = ${status} WHERE user_id = ${user_id}`
    } else if (document_type === 'address') {
      await sql`UPDATE kyc_status SET address_status = ${status} WHERE user_id = ${user_id}`
    } else if (document_type === 'selfie') {
      await sql`UPDATE kyc_status SET selfie_status = ${status} WHERE user_id = ${user_id}`
    } else if (document_type === 'references') {
      await sql`UPDATE kyc_status SET references_status = ${status} WHERE user_id = ${user_id}`
    }

    // Recalculate completion percentage and overall status
    await recalculate_kyc_completion(user_id)

    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error updating KYC document status: ${String(err)}`
    })
  }
}

/**
 * Recalculate KYC completion percentage and overall status
 */
export async function recalculate_kyc_completion(user_id: string): Promise<Result<void, DBError>> {
  try {
    // Get current status
    const [current_status] = await sql<KYCStatus[]>`
      SELECT * FROM kyc_status WHERE user_id = ${user_id}
    `

    if (!current_status) {
      return Err({
        type: "NotFoundError",
        message: "KYC status not found"
      })
    }

    // Calculate completion percentage (3 required + 1 optional)
    let completed = 0
    const required = 3 // identity, address, selfie

    if (current_status.identity_status === 'verified') completed++
    if (current_status.address_status === 'verified') completed++
    if (current_status.selfie_status === 'verified') completed++

    const completion_percentage = Math.round((completed / required) * 100)

    // Determine overall status
    let overall_status: KYCStatus['overall_status'] = 'not_started'

    const any_submitted =
      current_status.identity_status !== 'not_submitted' ||
      current_status.address_status !== 'not_submitted' ||
      current_status.selfie_status !== 'not_submitted'

    const any_rejected =
      current_status.identity_status === 'rejected' ||
      current_status.address_status === 'rejected' ||
      current_status.selfie_status === 'rejected'

    const all_verified =
      current_status.identity_status === 'verified' &&
      current_status.address_status === 'verified' &&
      current_status.selfie_status === 'verified'

    const all_submitted =
      (current_status.identity_status === 'verified' || current_status.identity_status === 'pending') &&
      (current_status.address_status === 'verified' || current_status.address_status === 'pending') &&
      (current_status.selfie_status === 'verified' || current_status.selfie_status === 'pending')

    if (all_verified) {
      overall_status = 'verified'
    } else if (any_rejected) {
      overall_status = 'rejected'
    } else if (all_submitted) {
      overall_status = 'pending_review'
    } else if (any_submitted) {
      overall_status = 'in_progress'
    }

    // Update status
    await sql`
      UPDATE kyc_status
      SET completion_percentage = ${completion_percentage},
          overall_status = ${overall_status},
          verified_at = ${all_verified ? sql`COALESCE(verified_at, NOW())` : null},
          submitted_at = ${all_submitted && !current_status.submitted_at ? sql`NOW()` : sql`submitted_at`}
      WHERE user_id = ${user_id}
    `

    // Update user driver_verified flag if verified
    if (all_verified) {
      await sql`
        UPDATE users
        SET driver_verified = true, is_driver = true
        WHERE id = ${user_id}
      `
    }

    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error recalculating KYC completion: ${String(err)}`
    })
  }
}

/**
 * Submit KYC for review (mark as submitted)
 */
export async function submit_kyc_for_review(user_id: string): Promise<Result<void, DBError>> {
  try {
    await sql`
      UPDATE kyc_status
      SET submitted_at = COALESCE(submitted_at, NOW()),
          overall_status = 'pending_review'
      WHERE user_id = ${user_id}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error submitting KYC for review: ${String(err)}`
    })
  }
}
