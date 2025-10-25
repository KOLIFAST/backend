export type User = {
  id: string
  phone: string
  profile_picture: string
  full_name: string
  user_type: 'client' | 'driver' | 'admin'
  is_driver: boolean
  driver_verified: boolean
  created_at: Date
}

export type OtpCode = {
  id: string
  code: string
  generated_at: Date,
  generated_for: string,
  used: boolean
}

export type Session = {
  id: string
  user_id: string
  created_at: Date
}

// KYC Types
export type KYCDocument = {
  id: string
  user_id: string
  document_type: 'identity' | 'address' | 'selfie'
  identity_document_type?: 'cni' | 'passport' | 'permit'
  front_image_path?: string
  back_image_path?: string
  file_size?: number
  mime_type?: string
  status: 'pending' | 'verified' | 'rejected'
  verification_notes?: string
  verified_by?: string
  verified_at?: Date
  rejection_reason?: string
  rejected_at?: Date
  uploaded_at: Date
  updated_at: Date
}

export type KYCReference = {
  id: string
  user_id: string
  full_name: string
  phone: string
  relation: string
  verification_status: 'pending' | 'verified' | 'failed' | 'not_contacted'
  verification_notes?: string
  verified_at?: Date
  created_at: Date
  updated_at: Date
}

export type KYCStatus = {
  user_id: string
  identity_status: 'not_submitted' | 'pending' | 'verified' | 'rejected'
  address_status: 'not_submitted' | 'pending' | 'verified' | 'rejected'
  selfie_status: 'not_submitted' | 'pending' | 'verified' | 'rejected'
  references_status: 'not_submitted' | 'pending' | 'verified' | 'rejected' | 'skipped'
  overall_status: 'not_started' | 'in_progress' | 'pending_review' | 'verified' | 'rejected'
  completion_percentage: number
  started_at?: Date
  submitted_at?: Date
  verified_at?: Date
  rejected_at?: Date
  rejection_reason?: string
  can_resubmit: boolean
  created_at: Date
  updated_at: Date
}

// Parcel Types
export type Parcel = {
  id: string
  user_id: string
  tracking_number: string
  type: 'send' | 'receive'
  parcel_type: 'light' | 'medium' | 'ultra_heavy'
  weight?: number
  description: string
  parcel_count: number
  delivery_type: 'grouped' | 'express'
  waiting_hours?: number
  status: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
  estimated_cost?: number
  final_cost?: number
  savings_amount?: number
  is_paid: boolean
  driver_id?: string
  assigned_at?: Date
  pickup_completed_at?: Date
  delivery_started_at?: Date
  delivered_at?: Date
  cancelled_at?: Date
  cancellation_reason?: string
  created_at: Date
  updated_at: Date
}

export type ParcelAddress = {
  id: string
  parcel_id: string
  type: 'pickup' | 'delivery'
  address: string
  latitude?: number
  longitude?: number
  contact_name: string
  contact_number: string
  is_completed: boolean
  completed_at?: Date
  order_index: number
  notes?: string
  created_at: Date
}

export type ParcelTimeline = {
  id: string
  parcel_id: string
  status: string
  description?: string
  latitude?: number
  longitude?: number
  triggered_by?: string
  created_at: Date
}
