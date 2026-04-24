import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountsService } from '../../services/accounts.service';
import { OrderService, OrderLog, OrderStats } from '../../../directory/services/order.service';

@Component({
  selector: 'app-business-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './business-orders.component.html',
  styleUrl: './business-orders.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BusinessOrdersComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private orderService    = inject(OrderService);

  orders    = signal<OrderLog[]>([]);
  stats     = signal<OrderStats>({ total: 0, thisMonth: 0 });
  loading   = signal(true);

  filtered = computed(() => this.orders());

  async ngOnInit(): Promise<void> {
    const account = await this.accountsService.getMyAccount();
    if (account) {
      const [orders, stats] = await Promise.all([
        this.orderService.getOrders(),
        this.orderService.getOrderStats(account.id),
      ]);
      this.orders.set(orders);
      this.stats.set(stats);
    }
    this.loading.set(false);
  }
}
