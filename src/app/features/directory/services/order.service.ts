import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface OrderStats {
  total: number;
  thisMonth: number;
}

export interface OrderLog {
  id: string;
  account_id: string;
  created_at: string;
  business_name?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private supabase = inject(SupabaseService);

  async logOrder(accountId: string): Promise<void> {
    const { error } = await this.supabase
      .from('order_logs')
      .insert({ account_id: accountId });
    if (error) console.error('Error logging order:', error.message);
  }

  /** Pedidos del negocio del usuario actual (RLS filtra automáticamente) */
  async getOrders(): Promise<OrderLog[]> {
    const { data, error } = await this.supabase
      .from('order_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error.message); return []; }
    return (data ?? []) as OrderLog[];
  }

  /** Todos los pedidos con nombre de negocio (solo admin, SECURITY DEFINER) */
  async getAllOrders(): Promise<OrderLog[]> {
    const { data, error } = await this.supabase.client
      .rpc('get_all_orders_admin');
    if (error) { console.error(error.message); return []; }
    return (data ?? []) as OrderLog[];
  }

  async getOrderStats(accountId: string): Promise<OrderStats> {
    const { data, error } = await this.supabase.client
      .rpc('get_order_stats', { p_account_id: accountId });
    if (error) {
      console.error('Error fetching order stats:', error.message);
      return { total: 0, thisMonth: 0 };
    }
    return (data ?? { total: 0, thisMonth: 0 }) as OrderStats;
  }
}
