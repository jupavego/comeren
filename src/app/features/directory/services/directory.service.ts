import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Account, CatalogItem, CatalogSection } from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private supabase = inject(SupabaseService);

  // SEC-008 | OWASP A03: Injection
  // Previene que caracteres especiales de PostgREST alteren el filtro .or().
  private sanitizeQuery(query: string): string {
    return query.trim().slice(0, 100).replace(/[(),']/g, '');
  }

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
      .select('id, name, logo_url, category, schedule_json, slogan, description, address, zone, schedule, active, status')
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
    const safe = this.sanitizeQuery(query);
    const from = page * pageSize;
    const to   = from + pageSize;

    const { data, error } = await this.supabase
      .from('accounts')
      .select('id, name, logo_url, category, schedule_json, slogan, description, address, zone, schedule, active, status')
      .eq('active', true)
      .eq('status', 'approved')
      .or(
        `name.ilike.%${safe}%,` +
        `description.ilike.%${safe}%,` +
        `zone.ilike.%${safe}%,` +
        `category.ilike.%${safe}%,` +
        `slogan.ilike.%${safe}%`
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
      .select('id, name, logo_url, category, schedule_json, slogan, description, address, zone, schedule, active, status')
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

  // Obtiene un negocio por ID incluyendo sus secciones y productos activos
  async getById(id: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select(`
        *,
        catalog_sections (
          id,
          name,
          position
        ),
        catalog_items (
          id,
          name,
          description,
          price,
          image_url,
          active,
          approval_status,
          section_id,
          position
        )
      `)
      .eq('id', id)
      .eq('active', true)
      .eq('status', 'approved')
      .eq('catalog_items.active', true)
      .eq('catalog_items.approval_status', 'approved')
      .order('position', { referencedTable: 'catalog_sections', ascending: true })
      .order('position', { referencedTable: 'catalog_items',    ascending: true })
      .single();

    if (error) {
      console.error('Error fetching account:', error.message);
      return null;
    }

    const account = data as Account;

    // Poblar items dentro de cada sección para facilitar el render
    if (account.catalog_sections && account.catalog_items) {
      const allItems = account.catalog_items;
      account.catalog_sections = (account.catalog_sections as CatalogSection[])
        .sort((a, b) => a.position - b.position)
        .map(s => ({
          ...s,
          items: allItems
            .filter(i => i.section_id === s.id)
            .sort((a, b) => a.position - b.position),
        }));
    }

    return account;
  }

  // Búsqueda por texto — filtra por nombre, zona, categoría, descripción
  async search(query: string): Promise<Account[]> {
    const safe = this.sanitizeQuery(query);
    const { data, error } = await this.supabase
      .from('accounts')
      .select('id, name, logo_url, category, schedule_json, slogan, description, address, zone, schedule, active, status')
      .eq('active', true)
      .eq('status', 'approved')
      .or(
        `name.ilike.%${safe}%,` +
        `description.ilike.%${safe}%,` +
        `zone.ilike.%${safe}%,` +
        `category.ilike.%${safe}%,` +
        `slogan.ilike.%${safe}%`
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
      .select('id, name, logo_url, category, schedule_json, slogan, description, address, zone, schedule, active, status')
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
      .select('id, name, cover_url, logo_url, category, slogan')
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