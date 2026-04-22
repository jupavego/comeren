import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Account, CatalogItem } from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private supabase = inject(SupabaseService);

  // Obtiene todos los negocios aprobados y activos para el directorio público
  // Carga paginada — devuelve una página de negocios y si hay más.
  // page: número de página (0-based), pageSize: cuántos por página.
  async getPaginated(
    page: number,
    pageSize = 12
  ): Promise<{ data: Account[]; hasMore: boolean }> {
    const from = page * pageSize;
    const to   = from + pageSize; // pedir uno extra para saber si hay más

    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('active', true)
      .eq('status', 'approved')
      .order('name', { ascending: true })
      .range(from, to); // to inclusivo en Supabase = pageSize + 1 resultados max

    if (error) {
      console.error('Error fetching accounts:', error.message);
      return { data: [], hasMore: false };
    }

    const items   = (data ?? []) as Account[];
    const hasMore = items.length > pageSize;

    // Devolver solo los pageSize items, el extra era solo para detectar hasMore
    return { data: items.slice(0, pageSize), hasMore };
  }

  // Búsqueda paginada por texto
  async searchPaginated(
    query: string,
    page: number,
    pageSize = 12
  ): Promise<{ data: Account[]; hasMore: boolean }> {
    const from = page * pageSize;
    const to   = from + pageSize;

    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('active', true)
      .eq('status', 'approved')
      .or(
        `name.ilike.%${query}%,` +
        `description.ilike.%${query}%,` +
        `zone.ilike.%${query}%,` +
        `category.ilike.%${query}%,` +
        `slogan.ilike.%${query}%`
      )
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Error searching accounts:', error.message);
      return { data: [], hasMore: false };
    }

    const items   = (data ?? []) as Account[];
    const hasMore = items.length > pageSize;
    return { data: items.slice(0, pageSize), hasMore };
  }

  // Filtro por categoría paginado
  async getByCategoryPaginated(
    category: string,
    page: number,
    pageSize = 12
  ): Promise<{ data: Account[]; hasMore: boolean }> {
    const from = page * pageSize;
    const to   = from + pageSize;

    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('active', true)
      .eq('status', 'approved')
      .eq('category', category)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Error filtering by category:', error.message);
      return { data: [], hasMore: false };
    }

    const items   = (data ?? []) as Account[];
    const hasMore = items.length > pageSize;
    return { data: items.slice(0, pageSize), hasMore };
  }

  // Obtiene un negocio por ID incluyendo sus productos activos
  async getById(id: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select(`
        *,
        catalog_items (
          id,
          name,
          description,
          price,
          image_url,
          active,
          approval_status
        )
      `)
      .eq('id', id)
      .eq('active', true)
      .eq('status', 'approved')
      .eq('catalog_items.active', true)
      .eq('catalog_items.approval_status', 'approved')
      .single();

    if (error) {
      console.error('Error fetching account:', error.message);
      return null;
    }

    return data as Account;
  }

  // Búsqueda por texto — filtra por nombre, zona, categoría, descripción
  async search(query: string): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('active', true)
      .eq('status', 'approved')
      .or(
        `name.ilike.%${query}%,` +
        `description.ilike.%${query}%,` +
        `zone.ilike.%${query}%,` +
        `category.ilike.%${query}%,` +
        `slogan.ilike.%${query}%`
      )
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching accounts:', error.message);
      return [];
    }

    return data as Account[];
  }

  // Filtra por categoría
  async getByCategory(category: string): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('active', true)
      .eq('status', 'approved')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error filtering by category:', error.message);
      return [];
    }

    return data as Account[];
  }

  // Obtiene los primeros N negocios para el carrusel destacado
  async getFeatured(limit = 4): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('active', true)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured:', error.message);
      return [];
    }

    return data as Account[];
  }
}