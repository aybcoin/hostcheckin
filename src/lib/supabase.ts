import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const APP_BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin;

export interface Host {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  profile_image_url?: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  host_id: string;
  name: string;
  address: string;
  city: string;
  postal_code?: string;
  country: string;
  description?: string;
  rooms_count: number;
  bathrooms_count: number;
  max_guests: number;
  amenities?: string[];
  check_in_time: string;
  check_out_time: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  country?: string;
  date_of_birth?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  property_id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  booking_reference: string;
  unique_link: string;
  status: 'pending' | 'checked_in' | 'checked_out' | 'completed' | 'cancelled';
  verification_type?: 'simple' | 'complete';
  smart_lock_code?: string;
  guest_rating?: number;
  cancelled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplate {
  id: string;
  host_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface IdentityVerification {
  id: string;
  reservation_id: string;
  guest_id: string;
  id_type: string;
  id_document_url: string;
  selfie_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  verified_at?: string;
  verified_by?: string;
  created_at: string;
}

export interface Contract {
  id: string;
  reservation_id: string;
  property_id: string;
  contract_type: string;
  pdf_url: string;
  signed_by_guest: boolean;
  signed_by_host: boolean;
  guest_signature_url?: string;
  host_signature_url?: string;
  signed_at?: string;
  template_id?: string;
  pdf_storage_path?: string;
  content_hash?: string;
  created_at: string;
}
