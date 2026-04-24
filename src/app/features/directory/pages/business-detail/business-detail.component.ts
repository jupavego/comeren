import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { Account, CatalogItem } from '../../models/account.model';
import { DirectoryService } from '../../services/directory.service';
import { ReviewService } from '../../services/review.service';
import { ReviewsComponent } from '../../components/reviews/reviews.component';
import { WhatsappOrderComponent } from '../../components/whatsapp-order/whatsapp-order.component';
import { MapViewComponent } from '../../../../shared/components/map-view/map-view.component';
import { BusinessStatusBadgeComponent } from '../../../../shared/components/business-status-badge/business-status-badge.component';
import { ProductReviewsComponent } from '../../components/product-reviews/product-reviews.component';
import { AuthGateComponent } from '../../../../shared/components/auth-gate/auth-gate.component';
import { AuthGateService } from '../../../../core/services/auth-gate.service';

@Component({
  selector: 'app-business-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReviewsComponent, WhatsappOrderComponent, MapViewComponent, BusinessStatusBadgeComponent, ProductReviewsComponent, AuthGateComponent],
  templateUrl: './business-detail.component.html',
  styleUrl: './business-detail.component.scss',
})
export class BusinessDetailComponent implements OnInit, OnDestroy {
  private route            = inject(ActivatedRoute);
  private directoryService = inject(DirectoryService);
  private reviewService    = inject(ReviewService);
  private zone             = inject(NgZone);
  cart     = inject(CartService);
  authGate = inject(AuthGateService);

  private shimmerObserver?: IntersectionObserver;
  private dragMoved = false;

  private readonly onScroll = () => {
    const el = document.querySelector<HTMLElement>('.biz-hero__panel-actions');
    if (!el) return;
    const hidden = el.getBoundingClientRect().bottom < 0;
    if (hidden !== this.heroWaHidden()) {
      this.zone.run(() => this.heroWaHidden.set(hidden));
    }
  };

  constructor() {
    effect(() => {
      const loaded = !!this.account();
      if (!loaded) return;
      setTimeout(() => this.setupShimmerObserver(), 0);
    });
  }

  private setupShimmerObserver(): void {
    this.shimmerObserver?.disconnect();

    const btn = document.querySelector<HTMLElement>('.biz-hero__cta-catalog');
    if (!btn) return;

    const CSS_CLASS = 'biz-hero__cta-catalog--shimmer';

    this.shimmerObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        btn.classList.add(CSS_CLASS);
        btn.addEventListener('animationend', () => btn.classList.remove(CSS_CLASS), { once: true });
      },
      { threshold: 0.6 }
    );

    this.shimmerObserver.observe(btn);
  }

  onBubblePointerDown(e: PointerEvent): void {
    const startX   = e.clientX;
    const startY   = e.clientY;
    const startPos = { ...this.bubblePos() };
    this.dragMoved = false;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.dragMoved = true;
      this.zone.run(() => this.bubblePos.set({
        x: Math.max(8, Math.min(window.innerWidth  - 68, startPos.x + dx)),
        y: Math.max(8, Math.min(window.innerHeight - 68, startPos.y + dy)),
      }));
    };

    const up = () => {
      this.zone.run(() => {
        if (!this.dragMoved) this.authGate.requireAuth(() => this.showOrder.set(true));
        else sessionStorage.setItem('cart_bubble_pos', JSON.stringify(this.bubblePos()));
        this.dragMoved = false;
      });
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };

    this.zone.runOutsideAngular(() => {
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  }

  ngOnDestroy(): void {
    this.shimmerObserver?.disconnect();
    window.removeEventListener('scroll', this.onScroll);
  }

  account       = signal<Account | null>(null);
  loading       = signal(true);
  notFound      = signal(false);
  showOrder     = signal(false);
  heroWaHidden  = signal(false);
  bubblePos     = signal({ x: 0, y: 0 });

  ratingPopupItem   = signal<CatalogItem | null>(null);
  productAvgRatings = signal<Record<string, number>>({});
  lightboxUrl       = signal<string | null>(null);
  albumOpen         = signal(false);

  toggleAlbum(): void { this.albumOpen.update(v => !v); }

  // ── Hero: colores del panel de info ──────────────────────────────────────────

  readonly heroPanelBg  = computed(() => this.account()?.hero_panel_bg  ?? '#ffffff');
  readonly heroPanelText = computed(() => this.account()?.hero_panel_text ?? '#1a0a00');

  /** RGB del color de fondo del panel para los efectos de sombra sutil */
  readonly heroPanelRgb = computed(() => {
    const rgb = this.hexToRgb(this.account()?.hero_panel_bg ?? '#ffffff');
    return rgb ? `${rgb.r},${rgb.g},${rgb.b}` : '255,255,255';
  });

  readonly albumPhotos = computed(() => this.account()?.album_urls ?? []);

  openRatingPopup(item: CatalogItem): void  { this.ratingPopupItem.set(item); }

  // ── Colores corporativos en product cards ─────────────────────────────────────

  /** Devuelve el hex del color que le corresponde al producto según índice (cíclico). */
  getProductColor(index: number): string | null {
    const colors = this.account()?.brand_colors;
    if (!colors?.length) return null;
    return colors[index % colors.length];
  }

  /** Convierte un hex a componentes RGB. */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : null;
  }

  /**
   * Devuelve el color de letra para el producto en posición `index`.
   * Usa el color configurado por el negocio (guardado como JSON en catalog_text_color,
   * paralelo a brand_colors). Si no hay configuración, calcula blanco/negro por luminancia.
   */
  getTextColor(index: number): string {
    const account = this.account();
    const stored  = account?.catalog_text_color;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[index % parsed.length];
        }
      } catch {
        // Valor antiguo: hex directo — aplica a todas las tarjetas
        return stored;
      }
    }

    // Fallback automático por luminancia
    const hex = this.getProductColor(index);
    if (!hex) return '#ffffff';
    const rgb = this.hexToRgb(hex);
    if (!rgb) return '#ffffff';
    const luma = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luma > 0.5 ? '#000000' : '#ffffff';
  }

  /** Estilo del manto (gradiente de izq. a transparente) con el color corporativo. */
  getNameMantleStyle(index: number): Record<string, string> | null {
    const hex = this.getProductColor(index);
    if (!hex) return null;
    const rgb = this.hexToRgb(hex);
    if (!rgb) return null;
    const { r, g, b } = rgb;
    return {
      background: `linear-gradient(90deg,` +
        `rgba(${r},${g},${b},1.00)  0%,` +
        `rgba(${r},${g},${b},0.92) 16%,` +
        `rgba(${r},${g},${b},0.70) 38%,` +
        `rgba(${r},${g},${b},0.32) 64%,` +
        `rgba(${r},${g},${b},0.14) 84%,` +
        `rgba(${r},${g},${b},0.00) 100%)`,
    };
  }

  /** Estilo de la banda de descripción (fondo sólido con reflejos) con el color corporativo. */
  getDescBandStyle(index: number): Record<string, string> | null {
    const hex = this.getProductColor(index);
    if (!hex) return null;
    const rgb = this.hexToRgb(hex);
    if (!rgb) return null;
    const { r, g, b } = rgb;
    return {
      background:
        `radial-gradient(circle at 10% 20%,rgba(255,255,255,.16) 0%,transparent 26%),` +
        `radial-gradient(circle at 80% 15%,rgba(255,255,255,.07) 0%,transparent 22%),` +
        `linear-gradient(90deg,rgba(255,255,255,.05) 0%,transparent 60%),` +
        `rgb(${r},${g},${b})`,
    };
  }

  closeRatingPopup(): void {
    // Guardar referencia del id antes de limpiar el popup
    const id = this.ratingPopupItem()?.id;
    this.ratingPopupItem.set(null);
    // El promedio ya fue guardado vía onProductAvgLoaded al emitir avgUpdated
    void id; // referencia usada solo para legibilidad
  }

  onProductAvgLoaded(itemId: string, avg: number): void {
    this.productAvgRatings.update(r => ({ ...r, [itemId]: avg }));
  }

  async ngOnInit(): Promise<void> {
    const saved = sessionStorage.getItem('cart_bubble_pos');
    this.bubblePos.set(
      saved ? JSON.parse(saved) : { x: window.innerWidth - 80, y: window.innerHeight - 100 }
    );

    window.addEventListener('scroll', this.onScroll, { passive: true });

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    const data = await this.directoryService.getById(id);

    if (!data) {
      this.notFound.set(true);
    } else {
      this.account.set(data);
      const itemIds = (data.catalog_items ?? []).map(i => i.id);
      if (itemIds.length) {
        const avgs = await this.reviewService.getAveragesForItems(itemIds);
        this.productAvgRatings.set(avgs);
      }
    }

    this.loading.set(false);
  }

  // ── Auth-gated entry points ──────────────────────────────────────────────────

  /** Botón hero "Realizar pedido" y botón final del catálogo */
  requestOrder(a: Account): void {
    this.authGate.requireAuth(() =>
      a.catalog_items?.length ? this.showOrder.set(true) : this.openWhatsapp(a.whatsapp ?? '')
    );
  }

  /** Ítem pendiente cuando hay conflicto de negocio en el carrito */
  conflictItem = signal<CatalogItem | null>(null);

  /** Botón "Agregar" y stepper + en las tarjetas de producto */
  requestAdd(item: CatalogItem): void {
    this.authGate.requireAuth(() => {
      const accountId = this.account()?.id;
      if (!accountId) return;
      const result = this.cart.add(item, accountId);
      if (result === 'conflict') {
        this.conflictItem.set(item);
      }
    });
  }

  /** Usuario confirma vaciar carrito y empezar pedido del nuevo negocio */
  confirmClearCart(): void {
    const item      = this.conflictItem();
    const accountId = this.account()?.id;
    if (!item || !accountId) return;
    this.cart.clearAndAdd(item, accountId);
    this.conflictItem.set(null);
  }

  cancelClearCart(): void { this.conflictItem.set(null); }

  /** Badge de valoración en las tarjetas de producto */
  requestRatingPopup(item: CatalogItem): void {
    this.authGate.requireAuth(() => this.ratingPopupItem.set(item), 'rating');
  }

  scrollToProducts(): void {
    const el = document.getElementById('productos');
    if (!el) return;

    const startY    = window.scrollY;
    const targetY   = el.getBoundingClientRect().top + window.scrollY - 16;
    const distance  = targetY - startY;
    const duration  = 1400;
    const startTime = performance.now();

    // easeInOutCubic — arranque y frenado suaves
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now: number) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * ease(progress));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  openWhatsapp(phone: string): void {
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/57${clean}`, '_blank');
  }
}
