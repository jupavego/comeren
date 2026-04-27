export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

// ── Horarios estructurados ────────────────────────────────────────────────────
export interface DaySchedule {
  enabled: boolean;
  open:  string;  // "08:00"
  close: string;  // "20:00"
}

export interface BusinessHours {
  monday:    DaySchedule;
  tuesday:   DaySchedule;
  wednesday: DaySchedule;
  thursday:  DaySchedule;
  friday:    DaySchedule;
  saturday:  DaySchedule;
  sunday:    DaySchedule;
}

export const DAY_KEYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;
export type DayKey = typeof DAY_KEYS[number];

export const DAY_LABELS: Record<DayKey, string> = {
  monday:    'Lunes',
  tuesday:   'Martes',
  wednesday: 'Miércoles',
  thursday:  'Jueves',
  friday:    'Viernes',
  saturday:  'Sábado',
  sunday:    'Domingo',
};

export const DAY_SHORT_LABELS: Record<DayKey, string> = {
  monday:    'Lun',
  tuesday:   'Mar',
  wednesday: 'Mié',
  thursday:  'Jue',
  friday:    'Vie',
  saturday:  'Sáb',
  sunday:    'Dom',
};

export const DEFAULT_HOURS: BusinessHours = {
  monday:    { enabled: true,  open: '08:00', close: '20:00' },
  tuesday:   { enabled: true,  open: '08:00', close: '20:00' },
  wednesday: { enabled: true,  open: '08:00', close: '20:00' },
  thursday:  { enabled: true,  open: '08:00', close: '20:00' },
  friday:    { enabled: true,  open: '08:00', close: '20:00' },
  saturday:  { enabled: true,  open: '08:00', close: '20:00' },
  sunday:    { enabled: false, open: '08:00', close: '20:00' },
};

/** Devuelve true si el negocio está abierto en este momento */
export function isBusinessOpen(hours: BusinessHours | null | undefined): boolean {
  if (!hours) return false;

  const now  = new Date();
  const day  = DAY_KEYS[now.getDay() === 0 ? 6 : now.getDay() - 1]; // 0=Dom→6
  const slot = hours[day];
  if (!slot.enabled) return false;

  const [oh, om] = slot.open.split(':').map(Number);
  const [ch, cm] = slot.close.split(':').map(Number);
  const current  = now.getHours() * 60 + now.getMinutes();
  const openMin  = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  return current >= openMin && current < closeMin;
}

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
  // Secciones y ordenamiento
  section_id: string | null;
  position: number;
}

export interface CatalogSection {
  id: string;
  account_id: string;
  name: string;
  position: number;
  created_at: string;
  // Relación local — se puebla en el cliente, no viene de la DB
  items?: CatalogItem[];
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
  latitude: number | null;
  longitude: number | null;
  schedule_json: BusinessHours | null;
  active: boolean;
  status: AccountStatus;
  created_at: string;

  // Personalización visual
  brand_colors?: string[] | null;
  hero_panel_bg?: string | null;      // Fondo sólido del panel de info del hero
  hero_panel_text?: string | null;    // Color de texto del panel de info del hero
  catalog_text_color?: string | null; // JSON array de colores de letra por tarjeta (paralelo a brand_colors)
  album_urls?: string[] | null;       // Álbum del negocio — máx 10 fotos

  // Relaciones opcionales — se cargan con join cuando se necesitan
  catalog_items?:    CatalogItem[];
  catalog_sections?: CatalogSection[];
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