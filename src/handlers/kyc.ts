import type { Request, Response } from "express"
import type { MulterRequest } from "../types/request.js"
import z from "zod"
import { generate_uuid, parse_invalid_fields } from "../utils/utils.js"
import {
  insert_kyc_document,
  get_kyc_documents_by_user,
  insert_kyc_references,
  get_kyc_references_by_user,
  get_kyc_status,
  update_kyc_document_status,
  recalculate_kyc_completion,
  submit_kyc_for_review
} from "../repositories/kyc.js"
import { getRelativeFilePath } from "../utils/fileUpload.js"
import type { ZodIssue } from "zod/v3"

/**
 * Handler: Upload identity document (CNI, Passport, Permit)
 * POST /kyc/identity-upload
 */
export async function handle_identity_upload(req: MulterRequest, res: Response) {
  try {
    const user_id = req.user!.id

    // Validate request body
    const parseResult = z.object({
      documentType: z.enum(['cni', 'passport', 'permit'])
    }).safeParse(req.body)

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid document type",
        invalid_fields: parse_invalid_fields(parseResult.error.issues as ZodIssue[])
      })
    }

    const { documentType } = parseResult.data

    // Check if files were uploaded
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        error: "No files uploaded. Please upload front image (and back image if required)."
      })
    }

    const files = req.files as Express.Multer.File[]
    const frontFile = files.find(f => f.fieldname === 'frontImage')
    const backFile = files.find(f => f.fieldname === 'backImage')

    if (!frontFile) {
      return res.status(400).json({
        error: "Front image is required"
      })
    }

    // CNI requires both front and back
    if (documentType === 'cni' && !backFile) {
      return res.status(400).json({
        error: "CNI requires both front and back images"
      })
    }

    // Create document record
    const document_id = generate_uuid()
    const front_path = getRelativeFilePath(frontFile.path)
    const back_path = backFile ? getRelativeFilePath(backFile.path) : undefined

    const insert_result = await insert_kyc_document({
      id: document_id,
      user_id: user_id,
      document_type: 'identity',
      identity_document_type: documentType,
      front_image_path: front_path,
      back_image_path: back_path || undefined,
      file_size: frontFile.size + (backFile?.size || 0),
      mime_type: frontFile.mimetype
    })

    if (!insert_result.ok) {
      console.error(insert_result.error.message)
      return res.status(500).json({
        error: "Failed to save document"
      })
    }

    // Update KYC status
    await update_kyc_document_status(user_id, 'identity', 'pending')
    await recalculate_kyc_completion(user_id)

    return res.status(200).json({
      message: "Identity document uploaded successfully",
      data: {
        documentId: document_id,
        documentType: documentType,
        frontImage: front_path,
        backImage: back_path,
        status: "pending"
      }
    })
  } catch (err: unknown) {
    console.error('Error uploading identity document:', err)
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

/**
 * Handler: Upload address proof document
 * POST /kyc/address-upload
 */
export async function handle_address_upload(req: MulterRequest, res: Response) {
  try {
    const user_id = req.user!.id

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded. Please upload an address proof document."
      })
    }

    const file = req.file

    // Create document record
    const document_id = generate_uuid()
    const file_path = getRelativeFilePath(file.path)

    const insert_result = await insert_kyc_document({
      id: document_id,
      user_id: user_id,
      document_type: 'address',
      front_image_path: file_path,
      file_size: file.size,
      mime_type: file.mimetype
    })

    if (!insert_result.ok) {
      console.error(insert_result.error.message)
      return res.status(500).json({
        error: "Failed to save document"
      })
    }

    // Update KYC status
    await update_kyc_document_status(user_id, 'address', 'pending')
    await recalculate_kyc_completion(user_id)

    return res.status(200).json({
      message: "Address proof uploaded successfully",
      data: {
        documentId: document_id,
        filePath: file_path,
        status: "pending"
      }
    })
  } catch (err: unknown) {
    console.error('Error uploading address proof:', err)
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

/**
 * Handler: Upload selfie with identity document
 * POST /kyc/selfie-upload
 */
export async function handle_selfie_upload(req: MulterRequest, res: Response) {
  try {
    const user_id = req.user!.id

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded. Please upload a selfie with your identity document."
      })
    }

    const file = req.file

    // Validate it's an image
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        error: "Invalid file type. Only images are allowed for selfie."
      })
    }

    // Create document record
    const document_id = generate_uuid()
    const file_path = getRelativeFilePath(file.path)

    const insert_result = await insert_kyc_document({
      id: document_id,
      user_id: user_id,
      document_type: 'selfie',
      front_image_path: file_path,
      file_size: file.size,
      mime_type: file.mimetype
    })

    if (!insert_result.ok) {
      console.error(insert_result.error.message)
      return res.status(500).json({
        error: "Failed to save selfie"
      })
    }

    // Update KYC status
    await update_kyc_document_status(user_id, 'selfie', 'pending')
    await recalculate_kyc_completion(user_id)

    return res.status(200).json({
      message: "Selfie uploaded successfully",
      data: {
        documentId: document_id,
        filePath: file_path,
        status: "pending"
      }
    })
  } catch (err: unknown) {
    console.error('Error uploading selfie:', err)
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

/**
 * Handler: Submit personal references
 * POST /kyc/references
 */
export async function handle_references_submit(req: Request, res: Response) {
  try {
    const user_id = req.user!.id

    // Validate request body
    const parseResult = z.object({
      references: z.array(
        z.object({
          fullName: z.string().nonempty(),
          phone: z.string().nonempty(),
          relation: z.string().nonempty()
        })
      ).min(0).max(3).optional()
    }).safeParse(req.body)

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid references data",
        invalid_fields: parse_invalid_fields(parseResult.error.issues as ZodIssue[])
      })
    }

    const { references } = parseResult.data

    // If no references provided, mark as skipped
    if (!references || references.length === 0) {
      await update_kyc_document_status(user_id, 'references', 'skipped')
      await recalculate_kyc_completion(user_id)

      return res.status(200).json({
        message: "References skipped (optional)",
        data: {
          status: "skipped"
        }
      })
    }

    // Transform and save references
    const references_with_ids = references.map(ref => ({
      id: generate_uuid(),
      full_name: ref.fullName,
      phone: ref.phone,
      relation: ref.relation
    }))

    const insert_result = await insert_kyc_references(user_id, references_with_ids)

    if (!insert_result.ok) {
      console.error(insert_result.error.message)
      return res.status(500).json({
        error: "Failed to save references"
      })
    }

    // Update KYC status
    await update_kyc_document_status(user_id, 'references', 'pending')
    await recalculate_kyc_completion(user_id)

    return res.status(200).json({
      message: "References submitted successfully",
      data: {
        count: references.length,
        status: "pending"
      }
    })
  } catch (err: unknown) {
    console.error('Error submitting references:', err)
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

/**
 * Handler: Get KYC status
 * GET /kyc/status
 */
export async function handle_get_kyc_status(req: Request, res: Response) {
  try {
    const user_id = req.user!.id

    // Get KYC status
    const status_result = await get_kyc_status(user_id)
    if (!status_result.ok) {
      console.error(status_result.error.message)
      return res.status(500).json({
        error: "Failed to fetch KYC status"
      })
    }

    // Get all documents
    const documents_result = await get_kyc_documents_by_user(user_id)
    if (!documents_result.ok) {
      console.error(documents_result.error.message)
      return res.status(500).json({
        error: "Failed to fetch documents"
      })
    }

    // Get references
    const references_result = await get_kyc_references_by_user(user_id)
    if (!references_result.ok) {
      console.error(references_result.error.message)
      return res.status(500).json({
        error: "Failed to fetch references"
      })
    }

    const status = status_result.value
    const documents = documents_result.value
    const references = references_result.value

    // Organize documents by type
    const identity_doc = documents.find(d => d.document_type === 'identity')
    const address_doc = documents.find(d => d.document_type === 'address')
    const selfie_doc = documents.find(d => d.document_type === 'selfie')

    return res.status(200).json({
      data: {
        overallStatus: status.overall_status,
        completionPercentage: status.completion_percentage,
        canResubmit: status.can_resubmit,
        rejectionReason: status.rejection_reason,
        documents: {
          identity: {
            status: status.identity_status,
            uploadedAt: identity_doc?.uploaded_at,
            documentType: identity_doc?.identity_document_type,
            verificationNotes: identity_doc?.verification_notes
          },
          address: {
            status: status.address_status,
            uploadedAt: address_doc?.uploaded_at,
            verificationNotes: address_doc?.verification_notes
          },
          selfie: {
            status: status.selfie_status,
            uploadedAt: selfie_doc?.uploaded_at,
            verificationNotes: selfie_doc?.verification_notes
          },
          references: {
            status: status.references_status,
            count: references.length,
            references: references.map(ref => ({
              name: ref.full_name,
              phone: ref.phone,
              relation: ref.relation,
              verificationStatus: ref.verification_status
            }))
          }
        },
        dates: {
          startedAt: status.started_at,
          submittedAt: status.submitted_at,
          verifiedAt: status.verified_at,
          rejectedAt: status.rejected_at
        }
      }
    })
  } catch (err: unknown) {
    console.error('Error getting KYC status:', err)
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

/**
 * Handler: Submit KYC for review
 * POST /kyc/submit
 */
export async function handle_kyc_submit(req: Request, res: Response) {
  try {
    const user_id = req.user!.id

    // Get current status
    const status_result = await get_kyc_status(user_id)
    if (!status_result.ok) {
      console.error(status_result.error.message)
      return res.status(500).json({
        error: "Failed to fetch KYC status"
      })
    }

    const status = status_result.value

    // Check if all required documents are submitted
    const all_submitted =
      (status.identity_status === 'pending' || status.identity_status === 'verified') &&
      (status.address_status === 'pending' || status.address_status === 'verified') &&
      (status.selfie_status === 'pending' || status.selfie_status === 'verified')

    if (!all_submitted) {
      return res.status(400).json({
        error: "Cannot submit KYC. Please upload all required documents first.",
        missing: {
          identity: status.identity_status === 'not_submitted',
          address: status.address_status === 'not_submitted',
          selfie: status.selfie_status === 'not_submitted'
        }
      })
    }

    // Submit for review
    const submit_result = await submit_kyc_for_review(user_id)
    if (!submit_result.ok) {
      console.error(submit_result.error.message)
      return res.status(500).json({
        error: "Failed to submit KYC for review"
      })
    }

    return res.status(200).json({
      message: "KYC submitted for review successfully. You will be notified once the review is complete.",
      data: {
        status: "pending_review",
        submittedAt: new Date().toISOString()
      }
    })
  } catch (err: unknown) {
    console.error('Error submitting KYC:', err)
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}
