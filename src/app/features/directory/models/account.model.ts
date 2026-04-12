export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type CatalogApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CatalogItem {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
  approval_status: CatalogApprovalStatus;
  created_at: string;
}

export interface Account {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  slogan: string | null;
  history: string | null;
  address: string | null;
  zone: string | null;
  phone: string | null;
  schedule: string | null;
  category: string | null;
  logo_url: string | null;
  cover_url: string | null;
  facebook: string | null;
  instagram: string | null;
  whatsapp: string | null;
  active: boolean;
  status: AccountStatus;
  created_at: string;

  // Relación opcional — se carga con join cuando se necesita
  catalog_items?: CatalogItem[];
}

// DTO para crear o editar un negocio
export interface AccountFormData {
  name: string;
  description: string;
  slogan: string;
  history: string;
  address: string;
  zone: string;
  phone: string;
  schedule: string;
  category: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
}

// Categorías disponibles en el directorio
export const DIRECTORY_CATEGORIES = [
  'Todos',
  'Restaurante',
  'Comida rápida',
  'Panadería',
  'Cafetería',
  'Heladería',
  'Asadero',
  'Frutería',
  'Postres',
] as const;

export type DirectoryCategory = typeof DIRECTORY_CATEGORIES[number];