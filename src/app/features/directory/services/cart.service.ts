import { Injectable, computed, signal } from '@angular/core';
import { CatalogItem } from '../models/account.model';

export interface OrderLine {
  item: CatalogItem;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private lines          = signal<Map<string, OrderLine>>(new Map());
  readonly accountId     = signal<string | null>(null);

  qty(itemId: string): number {
    return this.lines().get(itemId)?.qty ?? 0;
  }

  /**
   * Intenta agregar un ítem al carrito.
   * Retorna:
   *  - 'added'    → ítem agregado con normalidad
   *  - 'conflict' → el carrito ya tiene ítems de otro negocio (no se agrega)
   */
  add(item: CatalogItem, forAccountId: string): 'added' | 'conflict' {
    const current = this.accountId();

    // Conflicto: hay ítems de un negocio distinto
    if (current !== null && current !== forAccountId && this.hasItems()) {
      return 'conflict';
    }

    this.accountId.set(forAccountId);
    this.lines.update(map => {
      const next = new Map(map);
      const line = next.get(item.id);
      next.set(item.id, { item, qty: (line?.qty ?? 0) + 1 });
      return next;
    });

    return 'added';
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

  /** Vacía el carrito completamente */
  clear(): void {
    this.lines.set(new Map());
    this.accountId.set(null);
  }

  /** Vacía el carrito y agrega el ítem como inicio de un nuevo pedido */
  clearAndAdd(item: CatalogItem, forAccountId: string): void {
    this.clear();
    this.add(item, forAccountId);
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
