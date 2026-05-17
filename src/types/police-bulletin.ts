export interface PoliceBulletin {
  id: string;
  reservation_id: string;
  host_id: string;
  property_id: string | null;
  appart_no: string | null;
  ordre_no: number | null;
  full_name: string | null;
  first_name: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  nationality: string | null;
  profession: string | null;
  coming_from: string | null;
  going_to: string | null;
  arrival_date: string | null;
  home_address: string | null;
  passport_no: string | null;
  signature_url: string | null;
  pdf_storage_path: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PoliceBulletinDraft {
  reservation_id: string;
  host_id: string;
  property_id: string | null;
  appart_no: string | null;
  full_name: string;
  first_name: string;
  date_of_birth: string | null;
  place_of_birth: string;
  nationality: string;
  profession: string;
  coming_from: string;
  going_to: string;
  arrival_date: string | null;
  home_address: string;
  passport_no: string;
}
