import { Injectable, computed, signal } from '@angular/core';
import { CatalogItem } from '../models/account.model';

export interface OrderLine {
  item: CatalogItem;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private lines = signal<Map<string, OrderLine>>(new Map());

  qty(itemId: string): number {
    return this.lines().get(itemId)?.qty ?? 0;
  }

  add(item: CatalogItem): void {
    this.lines.update(map => {
      const next = new Map(map);
      const line = next.get(item.id);
      next.set(item.id, { item, qty: (line?.qty ?? 0) + 1 });
      return next;
    });
  }

  remove(item: CatalogItem): void {
    this.lines.update(map => {
      const next = new Map(map);
      const line = next.get(item.id);
      if (!line) return next;
      if (line.qty <= 1) next.delete(item.id);
      else next.set(item.id, { ...line, qty: line.qty - 1 });
      return next;
    });
  }

  orderLines = computed(() =>
    [...this.lines().values()].filter(l => l.qty > 0)
  );

  total = computed(() =>
    this.orderLines().reduce((sum, l) => sum + l.item.price * l.qty, 0)
  );

  totalItems = computed(() =>
    this.orderLines().reduce((sum, l) => sum + l.qty, 0)
  );

  hasItems = computed(() => this.orderLines().length > 0);
}
