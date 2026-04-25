export type Zone = 'temara' | 'rabat' | 'harhoura' | 'skhirat' | 'sale' | 'oujda';

export type ListingPositioning = 'budget' | 'standard' | 'premium' | 'luxe';

export interface Listing {
  id: string;
  name: string;
  zone: Zone;
  capacity: number;
  bedrooms: number;
  positioning: ListingPositioning;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  cleaningFee: number;
  amenities: string[];
  currentPrice?: number;
  createdAt: string;
  updatedAt: string;
}
