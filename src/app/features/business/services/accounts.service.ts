import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../app/core/services/supabase.service';
import { SessionService } from '../../../../app/core/services/session.service';
import { Account, AccountFormData } from '../../../features/directory/models/account.model';

export interface AccountResult {
  success: boolean;
  data?: Account;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private supabase = inject(SupabaseService);
  private session  = inject(SessionService);

  // Obtiene el account del negocio del usuario logueado
  async getMyAccount(): Promise<Account | null> {
    const userId = this.session.user()?.id;
    if (!userId) return null;

    const { data, error } = await this.supabase
      .from('accounts')
      .select('*, catalog_items(*)')
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching account:', error.message);
      return null;
    }

    return data as Account;
  }

  // Crea el negocio por primera vez (setup inicial)
  async create(formData: AccountFormData): Promise<AccountResult> {
    const userId = this.session.user()?.id;
    if (!userId) return { success: false, error: 'No autenticado' };

    const { data, error } = await this.supabase
      .from('accounts')
      .insert({
        owner_id: userId,
        ...formData,
        active: false,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Account };
  }

  // Actualiza los datos del negocio
  async update(id: string, formData: Partial<AccountFormData>): Promise<AccountResult> {
    const { data, error } = await this.supabase
      .from('accounts')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Account };
  }

  // Actualiza solo la URL del logo
  async updateLogo(id: string, logoUrl: string): Promise<AccountResult> {
    return this.update(id, { logo_url: logoUrl } as any);
  }

  // Actualiza solo la URL de la portada
  async updateCover(id: string, coverUrl: string): Promise<AccountResult> {
    return this.update(id, { cover_url: coverUrl } as any);
  }
}