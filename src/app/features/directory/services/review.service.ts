import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Review, ReviewFormData, ProductReviewFormData, ProductRatingRow } from '../models/review.model';

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

  async update(
    id: string,
    formData: Pick<ReviewFormData, 'rating' | 'comment'>
  ): Promise<{ success: boolean; data?: Review; error?: string }> {
    const { data, error } = await this.supabase
      .from('reviews')
      .update({ rating: formData.rating, comment: formData.comment.trim() || null })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Review };
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
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

  /** Promedio de calificaciones (0 si no tiene reseñas) */
  average(reviews: Review[]): number {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  /** Promedios por catalog_item_id para una lista de productos (una sola query) */
  async getAveragesForItems(itemIds: string[]): Promise<Record<string, number>> {
    if (!itemIds.length) return {};

    const { data, error } = await this.supabase
      .from('reviews')
      .select('catalog_item_id, rating')
      .in('catalog_item_id', itemIds);

    if (error || !data) return {};

    const totals: Record<string, { sum: number; count: number }> = {};
    for (const r of data as { catalog_item_id: string; rating: number }[]) {
      if (!r.catalog_item_id) continue;
      if (!totals[r.catalog_item_id]) totals[r.catalog_item_id] = { sum: 0, count: 0 };
      totals[r.catalog_item_id].sum += r.rating;
      totals[r.catalog_item_id].count++;
    }

    const result: Record<string, number> = {};
    for (const [id, { sum, count }] of Object.entries(totals)) {
      result[id] = Math.round((sum / count) * 10) / 10;
    }
    return result;
  }

  // ── Reseñas de producto ───────────────────────────────────────────────────

  async getByProduct(catalogItemId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('catalog_item_id', catalogItemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product reviews:', error.message);
      return [];
    }
    return data as Review[];
  }

  /** Valoraciones de productos de un negocio (para el dashboard del negocio) */
  async getProductRatingsForAccount(accountId: string): Promise<ProductRatingRow[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select(`
        id, user_id, author_name, rating, created_at, catalog_item_id,
        catalog_items ( name, account_id, accounts ( name ) )
      `)
      .not('catalog_item_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) { console.error(error.message); return []; }

    return ((data ?? []) as any[])
      .filter(r => r.catalog_items?.account_id === accountId)
      .map(r => ({
        id:              r.id,
        user_id:         r.user_id,
        author_name:     r.author_name,
        rating:          r.rating,
        created_at:      r.created_at,
        catalog_item_id: r.catalog_item_id,
        product_name:    r.catalog_items?.name ?? '—',
        business_name:   r.catalog_items?.accounts?.name ?? '—',
      }));
  }

  /** Todas las valoraciones de productos (para el admin) */
  async getAllProductRatings(): Promise<ProductRatingRow[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select(`
        id, user_id, author_name, rating, created_at, catalog_item_id,
        catalog_items ( name, accounts ( name ) )
      `)
      .not('catalog_item_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) { console.error(error.message); return []; }

    return ((data ?? []) as any[]).map(r => ({
      id:              r.id,
      user_id:         r.user_id,
      author_name:     r.author_name,
      rating:          r.rating,
      created_at:      r.created_at,
      catalog_item_id: r.catalog_item_id,
      product_name:    r.catalog_items?.name ?? '—',
      business_name:   r.catalog_items?.accounts?.name ?? '—',
    }));
  }

  async createForProduct(
    catalogItemId: string,
    userId: string | null,
    formData: ProductReviewFormData
  ): Promise<{ success: boolean; data?: Review; error?: string }> {
    const { data, error } = await this.supabase
      .from('reviews')
      .insert({
        catalog_item_id: catalogItemId,
        account_id:      null,
        user_id:         userId,
        author_name:     formData.author_name.trim(),
        rating:          formData.rating,
        comment:         formData.comment.trim() || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Review };
  }
}
