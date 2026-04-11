import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../app/core/services/supabase.service';
import { CatalogItem } from '../../../features/directory/models/account.model';

export interface CatalogItemFormData {
  name: string;
  description: string;
  price: number;
  image_url?: string;
  active?: boolean;
}

export interface CatalogResult {
  success: boolean;
  data?: CatalogItem;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private supabase = inject(SupabaseService);

  // Obtiene todos los productos de un negocio
  async getByAccount(accountId: string): Promise<CatalogItem[]> {
    const { data, error } = await this.supabase
      .from('catalog_items')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching catalog:', error.message);
      return [];
    }

    return data as CatalogItem[];
  }

  // Crea un producto nuevo
  async create(accountId: string, formData: CatalogItemFormData): Promise<CatalogResult> {
    const { data, error } = await this.supabase
      .from('catalog_items')
      .insert({
        account_id: accountId,
        ...formData,
        active: formData.active ?? true,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as CatalogItem };
  }

  // Actualiza un producto
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

  // Elimina un producto
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('catalog_items')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // Activa o desactiva un producto
  async toggleActive(id: string, active: boolean): Promise<CatalogResult> {
    return this.update(id, { active });
  }
}