import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { StorageService } from '../../../core/services/storage.service';
import { Account } from '../../directory/models/account.model';

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface HomeConfig {
  slide1_title:        string;
  slide1_description:  string;
  slide1_primary_btn:  string;
  slide1_secondary_btn: string;
  slide1_image_url:    string | null;
}

export interface HomeFeatured {
  account_id:  string;
  order_index: number;
  name:        string;
  logo_url:    string | null;
  cover_url:   string | null;
  category:    string | null;
  slogan:      string | null;
}

export const DEFAULT_HOME_CONFIG: HomeConfig = {
  slide1_title:        'Sabores que se sienten locales',
  slide1_description:  'Explora negocios de comida en Girardota y encuentra una opción rica, cercana y confiable.',
  slide1_primary_btn:  'Explorar negocios',
  slide1_secondary_btn: 'Ver destacados',
  slide1_image_url:    null,
};

// ── Servicio ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class HomeConfigService {
  private supabase = inject(SupabaseService);
  private storage  = inject(StorageService);

  // ── Slide de bienvenida ──────────────────────────────────────────────────────

  async getConfig(): Promise<HomeConfig> {
    const { data, error } = await this.supabase.client
      .from('home_config')
      .select('slide1_title, slide1_description, slide1_primary_btn, slide1_secondary_btn, slide1_image_url')
      .single();

    if (error || !data) return { ...DEFAULT_HOME_CONFIG };
    return data as HomeConfig;
  }

  async upsertConfig(config: HomeConfig): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client
      .from('home_config')
      .upsert({ id: true, ...config, updated_at: new Date().toISOString() });
    return { error: error?.message ?? null };
  }

  // ── Negocios destacados ──────────────────────────────────────────────────────

  async getFeaturedWithDetails(): Promise<HomeFeatured[]> {
    const { data, error } = await this.supabase.client
      .from('home_featured')
      .select(`
        account_id,
        order_index,
        accounts ( name, logo_url, cover_url, category, slogan )
      `)
      .order('order_index', { ascending: true });

    if (error || !data) return [];

    return (data as any[]).map(row => ({
      account_id:  row.account_id,
      order_index: row.order_index,
      name:        row.accounts?.name      ?? '',
      logo_url:    row.accounts?.logo_url  ?? null,
      cover_url:   row.accounts?.cover_url ?? null,
      category:    row.accounts?.category  ?? null,
      slogan:      row.accounts?.slogan    ?? null,
    }));
  }

  /**
   * Reemplaza los negocios destacados con el nuevo orden.
   * Borra todos los actuales e inserta la nueva lista.
   */
  async saveFeatured(accountIds: string[]): Promise<{ error: string | null }> {
    // Eliminar todos los actuales (NOT NULL account_id → filtramos con is not null)
    const { error: delErr } = await this.supabase.client
      .from('home_featured')
      .delete()
      .not('account_id', 'is', null);

    if (delErr) return { error: delErr.message };
    if (accountIds.length === 0) return { error: null };

    const rows = accountIds.map((id, i) => ({ account_id: id, order_index: i }));
    const { error } = await this.supabase.client
      .from('home_featured')
      .insert(rows);

    return { error: error?.message ?? null };
  }

  /** Lista de negocios aprobados para el picker del panel admin. */
  async getApprovedAccounts(): Promise<Account[]> {
    const { data, error } = await this.supabase.client
      .from('accounts')
      .select('id, name, logo_url, cover_url, category, slogan')
      .eq('status', 'approved')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as Account[];
  }

  // ── Imagen del slide ─────────────────────────────────────────────────────────

  async uploadSlide1Image(file: File): Promise<{ url: string | null; error: string | null }> {
    const ext    = file.name.split('.').pop() ?? 'jpg';
    const result = await this.storage.uploadImage('accounts', file, `home-slide1.${ext}`);
    if (!result.success) return { url: null, error: result.error ?? 'Error al subir imagen' };
    return { url: result.url!, error: null };
  }
}
