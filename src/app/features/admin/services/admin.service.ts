import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../app/core/services/supabase.service';
import { Profile, UserRole } from '../../../../app/core/models/profile.model';
import { Account, AccountStatus, CatalogApprovalStatus, CatalogItem } from '../../../../app/features/directory/models/account.model';
import { StorageService } from '../../../core/services/storage.service';

export interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  totalClients: number;
  totalAccounts: number;
  pendingAccounts: number;
  approvedAccounts: number;
  totalProducts: number;
}

export interface AdminCatalogItem extends CatalogItem {
  account_name?: string;
  account_category?: string;
}

export interface AdminCatalogResult {
  success: boolean;
  data?: AdminCatalogItem;
  error?: string;
}

export interface AdminCatalogFormData {
  account_id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  image_url?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private supabase = inject(SupabaseService);
  private storage  = inject(StorageService);

  // ── Dashboard stats ────────────────────────────────────────────────────────
  // Usa la función SQL get_admin_stats() que hace los conteos directamente
  // en PostgreSQL — una sola round-trip sin importar cuántos registros haya.
  async getStats(): Promise<AdminStats> {
    const { data, error } = await this.supabase.client
      .rpc('get_admin_stats');

    if (error) {
      console.error('Error fetching stats:', error.message);
      return {
        totalUsers: 0, totalBusinesses: 0, totalClients: 0,
        totalAccounts: 0, pendingAccounts: 0, approvedAccounts: 0,
        totalProducts: 0,
      };
    }

    return data as AdminStats;
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  async getUsers(role?: UserRole): Promise<Profile[]> {
    let query = this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) { console.error(error.message); return []; }
    return data as Profile[];
  }

  async updateUserRole(userId: string, role: UserRole): Promise<boolean> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    return !error;
  }

  // ── Accounts ───────────────────────────────────────────────────────────────
  async getAccounts(status?: AccountStatus): Promise<Account[]> {
    let query = this.supabase
      .from('accounts')
      .select('*, profiles(full_name, phone)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) { console.error(error.message); return []; }
    return data as Account[];
  }

  // Lista simplificada para el selector del formulario de producto
  async getAccountsList(): Promise<{ id: string; name: string }[]> {
    const { data } = await this.supabase
      .from('accounts')
      .select('id, name')
      .eq('status', 'approved')
      .order('name', { ascending: true });
    return (data ?? []) as { id: string; name: string }[];
  }

  async updateAccountStatus(
    accountId: string,
    status: AccountStatus
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('accounts')
      .update({ status, active: status === 'approved' })
      .eq('id', accountId);
    return !error;
  }

  // ── Catalog ────────────────────────────────────────────────────────────────
  async getAllProducts(): Promise<AdminCatalogItem[]> {
    const { data, error } = await this.supabase
      .from('catalog_items')
      .select(`
        *,
        accounts ( name, category )
      `)
      .order('created_at', { ascending: false });

    if (error) { console.error(error.message); return []; }

    return (data ?? []).map((item: any) => ({
      ...item,
      account_name:     item.accounts?.name,
      account_category: item.accounts?.category,
    })) as AdminCatalogItem[];
  }

  async createProduct(
    formData: AdminCatalogFormData,
    imageFile?: File
  ): Promise<AdminCatalogResult> {
    let imageUrl = formData.image_url;

    if (imageFile) {
      const upload = await this.storage.uploadImage(
        'catalog',
        imageFile,
        `${crypto.randomUUID()}.jpg`
      );
      if (!upload.success) return { success: false, error: upload.error };
      imageUrl = upload.url;
    }

    const { data, error } = await this.supabase
      .from('catalog_items')
      .insert({ ...formData, image_url: imageUrl })
      .select(`*, accounts(name, category)`)
      .single();

    if (error) return { success: false, error: error.message };

    const item = data as any;
    return {
      success: true,
      data: {
        ...item,
        account_name:     item.accounts?.name,
        account_category: item.accounts?.category,
      },
    };
  }

  async updateProduct(
    id: string,
    formData: Partial<AdminCatalogFormData>,
    imageFile?: File
  ): Promise<AdminCatalogResult> {
    let imageUrl = formData.image_url;

    if (imageFile) {
      const upload = await this.storage.uploadImage(
        'catalog',
        imageFile,
        `${id}.jpg`
      );
      if (!upload.success) return { success: false, error: upload.error };
      imageUrl = upload.url;
    }

    const { data, error } = await this.supabase
      .from('catalog_items')
      .update({ ...formData, image_url: imageUrl })
      .eq('id', id)
      .select(`*, accounts(name, category)`)
      .single();

    if (error) return { success: false, error: error.message };

    const item = data as any;
    return {
      success: true,
      data: {
        ...item,
        account_name:     item.accounts?.name,
        account_category: item.accounts?.category,
      },
    };
  }

  async toggleProduct(id: string, active: boolean): Promise<boolean> {
    const { error } = await this.supabase
      .from('catalog_items')
      .update({ active })
      .eq('id', id);
    return !error;
  }

  async setCatalogApproval(id: string, status: CatalogApprovalStatus): Promise<boolean> {
    const { error } = await this.supabase
      .from('catalog_items')
      .update({ approval_status: status })
      .eq('id', id);
    return !error;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('catalog_items')
      .delete()
      .eq('id', id);
    return !error;
  }

  // ── Reports export ─────────────────────────────────────────────────────────
  async exportUsers(): Promise<Profile[]> {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    return (data ?? []) as Profile[];
  }

  async exportAccounts(): Promise<Account[]> {
    const { data } = await this.supabase
      .from('accounts')
      .select('*, catalog_items(count)')
      .order('created_at', { ascending: false });
    return (data ?? []) as Account[];
  }

  async exportProducts(): Promise<AdminCatalogItem[]> {
    return this.getAllProducts();
  }

  downloadCsv(data: Record<string, any>[], filename: string): void {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h] ?? '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}