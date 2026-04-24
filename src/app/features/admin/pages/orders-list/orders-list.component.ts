import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OrderService, OrderLog } from '../../../directory/services/order.service';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class OrdersListComponent implements OnInit {
  private orderService = inject(OrderService);

  orders     = signal<OrderLog[]>([]);
  loading    = signal(true);
  searchText = signal('');

  filtered = computed(() => {
    const text = this.searchText().toLowerCase().trim();
    if (!text) return this.orders();
    return this.orders().filter(o =>
      o.business_name?.toLowerCase().includes(text) ||
      o.buyer_name?.toLowerCase().includes(text)
    );
  });

  async ngOnInit(): Promise<void> {
    this.orders.set(await this.orderService.getAllOrders());
    this.loading.set(false);
  }
}
