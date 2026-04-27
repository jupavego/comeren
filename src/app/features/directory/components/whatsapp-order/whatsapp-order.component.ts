import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogItem } from '../../models/account.model';
import { SessionService } from '../../../../core/services/session.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-whatsapp-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-order.component.html',
  styleUrl: './whatsapp-order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappOrderComponent implements OnInit {
  private session      = inject(SessionService);
  private cartService  = inject(CartService);
  private orderService = inject(OrderService);

  /** Número de WhatsApp del negocio (solo dígitos, sin +57) */
  whatsapp     = input.required<string>();
  /** Nombre del negocio para el mensaje */
  businessName = input.required<string>();
  /** Productos disponibles */
  catalog      = input.required<CatalogItem[]>();
  /** ID del negocio para registrar el pedido */
  accountId    = input.required<string>();
  /** Emite cuando el usuario cierra el panel */
  closed       = output<void>();

  // Datos del cliente
  buyerName   = signal('');
  address     = signal('');
  payment     = signal<'efectivo' | 'transferencia'>('efectivo');
  errorMsg    = signal<string | null>(null);
  sent        = signal(false);

  // Delegación al servicio compartido
  qty(itemId: string)      { return this.cartService.qty(itemId); }
  add(item: CatalogItem)   { this.cartService.add(item, this.accountId()); }
  remove(item: CatalogItem){ this.cartService.remove(item); }
  orderLines = this.cartService.orderLines;
  total      = this.cartService.total;
  hasItems   = this.cartService.hasItems;

  ngOnInit(): void {
    const profile = this.session.profile();
    if (profile?.full_name) {
      this.buyerName.set(profile.full_name);
    }
  }

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

    const profile = this.session.profile();
    this.orderService.logOrder({
      accountId:   this.accountId(),
      buyerName:   this.buyerName().trim() || undefined,
      buyerPhone:  profile?.phone ?? undefined,
      userRole:    profile?.role  ?? 'anon',
      total:       this.total(),
      payment:     this.payment(),
    });

    // Limpiar carrito y mostrar confirmación
    this.cartService.clear();
    this.sent.set(true);
    setTimeout(() => this.close(), 3000);
  }

  close(): void { this.closed.emit(); }
}
