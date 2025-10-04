export type User = {
  id: string
  phone: string
  profile_picture: string
  first_name: string
  last_name: string
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
