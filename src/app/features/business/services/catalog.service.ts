import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../app/core/services/supabase.service';
import { CatalogItem, CatalogSection } from '../../../features/directory/models/account.model';

export interface CatalogItemFormData {
  name: string;
  description: string;
  price: number;
  image_url?: string;
  active?: boolean;
  section_id?: string | null;
  position?: number;
}

export interface CatalogResult {
  success: boolean;
  data?: CatalogItem;
  error?: string;
}

export interface SectionResult {
  success: boolean;
  data?: CatalogSection;
  error?: string;
}

// Payload enviado a las RPC de reorder
export interface ReorderSectionPayload { id: string; position: number; }
export interface ReorderItemPayload    { id: string; section_id: string | null; position: number; }

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private supabase = inject(SupabaseService);

  // ── Productos ─────────────────────────────────────────────────────────────────

  /** Obtiene todos los productos de un negocio, ordenados por posición */
  async getByAccount(accountId: string): Promise<CatalogItem[]> {
    const { data, error } = await this.supabase
      .from('catalog_items')
      .select('*')
      .eq('account_id', accountId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching catalog:', error.message);
      return [];
    }

    return data as CatalogItem[];
  }

  /** Crea un producto nuevo */
  async create(accountId: string, formData: CatalogItemFormData): Promise<CatalogResult> {
    const { data, error } = await this.supabase
      .from('catalog_items')
      .insert({
        account_id:      accountId,
        ...formData,
        active:          formData.active    ?? true,
        section_id:      formData.section_id ?? null,
        position:        formData.position   ?? 0,
        approval_status: 'approved',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as CatalogItem };
  }

  /** Actualiza un producto */
  async update(id: string, formData: Partial<CatalogItemFormData>): Promise<CatalogResult> {
    const { data, error } = await this.supabase
      .from('catalog_items')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as CatalogItem };
  }

  /** Elimina un producto */
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('catalog_items')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /** Activa o desactiva un producto */
  async toggleActive(id: string, active: boolean): Promise<CatalogResult> {
    return this.update(id, { active });
  }

  /**
   * Reordena productos en batch mediante RPC segura.
   * Llama a la función `reorder_catalog_items` en Supabase.
   */
  async reorderItems(accountId: string, items: ReorderItemPayload[]): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.rpc('reorder_catalog_items', {
      p_account_id: accountId,
      p_items:      items as unknown as Record<string, unknown>,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // ── Secciones ─────────────────────────────────────────────────────────────────

  /** Obtiene todas las secciones de un negocio, ordenadas por posición */
  async getSections(accountId: string): Promise<CatalogSection[]> {
    const { data, error } = await this.supabase
      .from('catalog_sections')
      .select('*')
      .eq('account_id', accountId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching sections:', error.message);
      return [];
    }

    return data as CatalogSection[];
  }

  /** Crea una sección nueva */
  async createSection(accountId: string, name: string, position: number): Promise<SectionResult> {
    const { data, error } = await this.supabase
      .from('catalog_sections')
      .insert({ account_id: accountId, name, position })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as CatalogSection };
  }

  /** Actualiza el nombre de una sección */
  async updateSection(id: string, name: string): Promise<SectionResult> {
    const { data, error } = await this.supabase
      .from('catalog_sections')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as CatalogSection };
  }

  /** Elimina una sección (los productos pasan a section_id = null automáticamente) */
  async deleteSection(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('catalog_sections')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /**
   * Reordena secciones en batch mediante RPC segura.
   * Llama a la función `reorder_catalog_sections` en Supabase.
   */
  async reorderSections(accountId: string, sections: ReorderSectionPayload[]): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.rpc('reorder_catalog_sections', {
      p_account_id: accountId,
      p_items:      sections as unknown as Record<string, unknown>,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }
}
