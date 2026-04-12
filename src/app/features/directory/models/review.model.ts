export interface Review {
  id: string;
  account_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;        // 1–10
  comment: string | null;
  created_at: string;
}

export interface ReviewFormData {
  author_name: string;
  rating: number;
  comment: string;
}
