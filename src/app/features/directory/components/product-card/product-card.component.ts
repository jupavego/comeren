import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { CurrencyPipe, NgStyle } from '@angular/common';
import { CatalogItem } from '../../models/account.model';
import { CartService } from '../../services/cart.service';
import { AuthGateService } from '../../../../core/services/auth-gate.service';

export interface ProductStyle {
  textColor:     string;
  mantleStyle:   { background: string } | null;
  descBandStyle: { background: string } | null;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NgStyle],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  private cart     = inject(CartService);
  private authGate = inject(AuthGateService);

  // ── Inputs ────────────────────────────────────────────────────────────────────
  item      = input.required<CatalogItem>();
  style     = input.required<ProductStyle>();
  avgRating = input<number | undefined>(undefined);
  accountId = input.required<string>();

  // ── Outputs hacia el padre ────────────────────────────────────────────────────
  lightboxOpen = output<string>();        // emite URL de imagen al abrir lightbox
  ratingOpen   = output<CatalogItem>();  // emite item al abrir popup de valoración
  cartConflict = output<CatalogItem>();  // emite item cuando hay conflicto de negocio

  // ── Estado reactivo del carrito — se actualiza solo cuando cambia cart.lines ──
  readonly qty = computed(() => this.cart.qty(this.item().id));

  // ── Acciones ──────────────────────────────────────────────────────────────────

  openLightbox(): void {
    const url = this.item().image_url;
    if (url) this.lightboxOpen.emit(url);
  }

  requestAdd(): void {
    this.authGate.requireAuth(() => {
      const result = this.cart.add(this.item(), this.accountId());
      if (result === 'conflict') this.cartConflict.emit(this.item());
    });
  }

  remove(): void {
    this.cart.remove(this.item());
  }

  requestRating(): void {
    this.authGate.requireAuth(() => this.ratingOpen.emit(this.item()), 'rating');
  }
}
