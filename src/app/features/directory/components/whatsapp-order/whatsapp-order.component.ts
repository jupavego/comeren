import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogItem } from '../../models/account.model';
import { SessionService } from '../../../../core/services/session.service';

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
export class WhatsappOrderComponent implements OnInit {
  private session = inject(SessionService);

  /** Número de WhatsApp del negocio (solo dígitos, sin +57) */
  whatsapp     = input.required<string>();
  /** Nombre del negocio para el mensaje */
  businessName = input.required<string>();
  /** Productos disponibles */
  catalog      = input.required<CatalogItem[]>();
  /** Emite cuando el usuario cierra el panel */
  closed       = output<void>();

  // Datos del cliente
  buyerName   = signal('');
  address     = signal('');
  payment     = signal<'efectivo' | 'transferencia'>('efectivo');
  errorMsg    = signal<string | null>(null);

  private lines = signal<Map<string, OrderLine>>(new Map());

  ngOnInit(): void {
    const profile = this.session.profile();
    if (profile?.full_name) {
      this.buyerName.set(profile.full_name);
    }
  }

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
    this.errorMsg.set(null);
    if (!this.hasItems()) return;
    if (!this.buyerName().trim()) { this.errorMsg.set('Escribe tu nombre para continuar.'); return; }
    if (!this.address().trim())   { this.errorMsg.set('Escribe la dirección de entrega.'); return; }

    const lines = this.orderLines()
      .map(l => `• ${l.qty}x ${l.item.name} — $${l.item.price.toLocaleString('es-CO')}`)
      .join('\n');

    const paymentLabel = this.payment() === 'transferencia' ? 'Transferencia' : 'Efectivo';

    const msg =
      `Hola, quiero hacer un pedido en *${this.businessName()}*:\n\n` +
      `*Productos:*\n${lines}\n\n` +
      `*Total: $${this.total().toLocaleString('es-CO')}*\n\n` +
      `*Nombre:* ${this.buyerName().trim()}\n` +
      `*Dirección:* ${this.address().trim()}\n` +
      `*Pago:* ${paymentLabel}\n\n` +
      `¿Está disponible?\n\n` +
      `_Pedido realizado desde Come en Girardota 📍 comeengirardota.com_`;

    const phone = this.whatsapp().replace(/\D/g, '');
    window.open(
      `https://wa.me/57${phone}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );
  }

  close(): void { this.closed.emit(); }
}
