import {
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogItem } from '../../models/account.model';

interface OrderLine {
  item: CatalogItem;
  qty: number;
}

@Component({
  selector: 'app-whatsapp-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-order.component.html',
  styleUrl: './whatsapp-order.component.scss',
})
export class WhatsappOrderComponent {
  /** Número de WhatsApp del negocio (solo dígitos, sin +57) */
  whatsapp   = input.required<string>();
  /** Nombre del negocio para el mensaje */
  businessName = input.required<string>();
  /** Productos disponibles */
  catalog    = input.required<CatalogItem[]>();
  /** Emite cuando el usuario cierra el panel */
  closed     = output<void>();

  private lines = signal<Map<string, OrderLine>>(new Map());

  /** Cantidad actual de un producto */
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
      if (line.qty <= 1) { next.delete(item.id); }
      else { next.set(item.id, { ...line, qty: line.qty - 1 }); }
      return next;
    });
  }

  orderLines = computed(() =>
    [...this.lines().values()].filter(l => l.qty > 0)
  );

  total = computed(() =>
    this.orderLines().reduce((sum, l) => sum + l.item.price * l.qty, 0)
  );

  hasItems = computed(() => this.orderLines().length > 0);

  send(): void {
    if (!this.hasItems()) return;

    const lines = this.orderLines()
      .map(l => `• ${l.qty}x ${l.item.name} — $${l.item.price.toLocaleString('es-CO')}`)
      .join('\n');

    const msg =
      `Hola, quiero hacer un pedido en *${this.businessName()}*:\n\n` +
      `${lines}\n\n` +
      `*Total: $${this.total().toLocaleString('es-CO')}*\n\n` +
      `¿Está disponible?`;

    const phone = this.whatsapp().replace(/\D/g, '');
    window.open(
      `https://wa.me/57${phone}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );
  }

  close(): void { this.closed.emit(); }
}
