import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Review, ReviewFormData } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private supabase = inject(SupabaseService);

  async getByAccount(accountId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error.message);
      return [];
    }
    return data as Review[];
  }

  async create(
    accountId: string,
    userId: string | null,
    formData: ReviewFormData
  ): Promise<{ success: boolean; data?: Review; error?: string }> {
    const { data, error } = await this.supabase
      .from('reviews')
      .insert({
        account_id:  accountId,
        user_id:     userId,
        author_name: formData.author_name.trim(),
        rating:      formData.rating,
        comment:     formData.comment.trim() || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Review };
  }

  /** Promedio de calificaciones para un negocio (0 si no tiene reseñas) */
  average(reviews: Review[]): number {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }
}
