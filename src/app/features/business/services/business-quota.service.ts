import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface BusinessUsage {
  planTier: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  storagePercent: number;
  productCount: number;
  productLimit: number;
  productPercent: number;
}

export interface UpgradeRequestResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BusinessQuotaService {
  private supabase = inject(SupabaseService);

  // Cuota consumida del negocio del usuario logueado — get_business_usage()
  // valida en el servidor que el caller es el dueño (o admin).
  async getUsage(accountId: string): Promise<BusinessUsage | null> {
    const { data, error } = await this.supabase.rpc('get_business_usage', {
      p_account_id: accountId,
    });

    if (error) {
      console.error('Error fetching business usage:', error.message);
      return null;
    }

    return data as BusinessUsage;
  }

  // Dispara la Edge Function que guarda la solicitud y notifica a los admins.
  async requestUpgrade(accountId: string, message: string): Promise<UpgradeRequestResult> {
    const { data, error } = await this.supabase.functions.invoke('send-upgrade-request', {
      body: { accountId, message },
    });

    if (error) {
      // FunctionsHttpError expone el Response original en .context — así
      // distinguimos el 429 (rate-limit: 1 solicitud/24h) de un fallo real.
      const status = (error as any).context?.status;
      if (status === 429) {
        return {
          success: false,
          rateLimited: true,
          error: 'Ya enviaste una solicitud en las últimas 24 horas. Te contactaremos pronto.',
        };
      }
      return { success: false, error: error.message };
    }
    if (data && data.success === false) return { success: false, error: data.error };
    return { success: true };
  }
}
