export interface Review {
  id: string;
  account_id:      string | null;  // null en reseñas de producto
  catalog_item_id: string | null;  // null en reseñas de negocio
  user_id:         string | null;
  author_name:     string;
  rating:          number;
  comment:         string | null;
  created_at:      string;
}

/** Para reseñas de negocio (1–5 estrellas) */
export interface ReviewFormData {
  author_name: string;
  rating:      number;
  comment:     string;
}

/** Para reseñas de producto (1–10) */
export interface ProductReviewFormData {
  author_name: string;
  rating:      number; // 1–10
  comment:     string;
}

/** Fila enriquecida para tablas de dashboard */
export interface ProductRatingRow {
  id:              string;
  user_id:         string | null;
  author_name:     string;
  rating:          number;
  created_at:      string;
  catalog_item_id: string;
  product_name:    string;
  business_name:   string; // disponible en la vista admin
}
