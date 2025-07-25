export interface RetailerData {
  name: string
  phone_number: string
  location: string
  specialization: string
  has_been_called: boolean
  call_transcript: string
  call_audio_recording: string
  call_summary: string
  price_offered: number | null  // Match database column name
}

export interface ArbitrageSearch {
  id: string
  created_at: string
  query: string
  location: string
}
