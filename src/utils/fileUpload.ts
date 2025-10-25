import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

// Maximum file size: 5MB (as specified in the frontend)
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf'
]

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']

/**
 * Generate a unique filename to avoid conflicts
 */
function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename)
  const timestamp = Date.now()
  const randomString = crypto.randomBytes(8).toString('hex')
  return `${timestamp}-${randomString}${ext}`
}

/**
 * Multer storage configuration for KYC documents
 */
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // Determine subdirectory based on field name
    let subdir = 'kyc'
    if (file.fieldname.includes('identity')) {
      subdir = 'kyc/identity'
    } else if (file.fieldname.includes('address')) {
      subdir = 'kyc/address'
    } else if (file.fieldname.includes('selfie')) {
      subdir = 'kyc/selfie'
    }

    const uploadPath = path.join(process.cwd(), 'uploads', subdir)

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }

    cb(null, uploadPath)
  },
  filename: (_req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname)
    cb(null, uniqueFilename)
  }
})

/**
 * File filter to validate file types
 */
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`))
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`))
  }

  cb(null, true)
}

/**
 * Multer upload configuration for KYC documents
 */
export const kycUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 2 // Maximum 2 files per request (for front/back of identity document)
  }
})

/**
 * Get relative file path for database storage
 */
export function getRelativeFilePath(absolutePath: string): string {
  const uploadsIndex = absolutePath.indexOf('uploads')
  if (uploadsIndex === -1) {
    return absolutePath
  }
  return absolutePath.substring(uploadsIndex)
}

/**
 * Delete a file from the filesystem
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const absolutePath = path.join(process.cwd(), filePath)
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath)
    }
  } catch (err) {
    console.error(`Error deleting file ${filePath}:`, err)
  }
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
