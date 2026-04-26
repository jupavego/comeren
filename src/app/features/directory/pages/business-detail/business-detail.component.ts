import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit, OnDestroy, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private actionsObserver?: IntersectionObserver;
  private dragMoved = false;

  constructor() {
    effect(() => {
      const loaded = !!this.account();
      if (!loaded) return;
      setTimeout(() => {
        this.setupShimmerObserver();
        this.setupActionsObserver();
      }, 0);
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

  // Reemplaza el onScroll listener: cero querySelector por evento de scroll.
  private setupActionsObserver(): void {
    this.actionsObserver?.disconnect();
    const el = document.querySelector<HTMLElement>('.biz-hero__panel-actions');
    if (!el) return;
    this.actionsObserver = new IntersectionObserver(
      ([entry]) => this.zone.run(() => this.heroWaHidden.set(!entry.isIntersecting)),
      { threshold: 0 }
    );
    this.actionsObserver.observe(el);
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
    this.actionsObserver?.disconnect();
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

  readonly heroPanelBg   = computed(() => this.account()?.hero_panel_bg  ?? '#ffffff');
  readonly heroPanelText = computed(() => this.account()?.hero_panel_text ?? '#1a0a00');

  readonly heroPanelRgb = computed(() => {
    const rgb = this.hexToRgb(this.account()?.hero_panel_bg ?? '#ffffff');
    return rgb ? `${rgb.r},${rgb.g},${rgb.b}` : '255,255,255';
  });

  readonly albumPhotos = computed(() => this.account()?.album_urls ?? []);

  // ── Estilos de producto precalculados — se computan UNA sola vez al cargar account ──
  readonly productStyles = computed(() => {
    const account = this.account();
    if (!account) return [];

    const items  = account.catalog_items ?? [];
    const colors = account.brand_colors  ?? [];

    // Parsear colores de texto una sola vez
    let textColorArray: string[] | null = null;
    let textColorFixed: string | null   = null;
    const stored = account.catalog_text_color;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) textColorArray = parsed;
      } catch {
        textColorFixed = stored; // hex directo (formato antiguo)
      }
    }

    return items.map((_, i) => {
      const hex = colors.length ? colors[i % colors.length] : null;
      const rgb = hex ? this.hexToRgb(hex) : null;

      let textColor: string;
      if (textColorArray) {
        textColor = textColorArray[i % textColorArray.length];
      } else if (textColorFixed) {
        textColor = textColorFixed;
      } else if (rgb) {
        const luma = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        textColor = luma > 0.5 ? '#000000' : '#ffffff';
      } else {
        textColor = '#ffffff';
      }

      const mantleStyle = rgb ? {
        background:
          `linear-gradient(90deg,` +
          `rgba(${rgb.r},${rgb.g},${rgb.b},1.00)  0%,` +
          `rgba(${rgb.r},${rgb.g},${rgb.b},0.92) 16%,` +
          `rgba(${rgb.r},${rgb.g},${rgb.b},0.70) 38%,` +
          `rgba(${rgb.r},${rgb.g},${rgb.b},0.32) 64%,` +
          `rgba(${rgb.r},${rgb.g},${rgb.b},0.14) 84%,` +
          `rgba(${rgb.r},${rgb.g},${rgb.b},0.00) 100%)`,
      } : null;

      const descBandStyle = rgb ? {
        background:
          `radial-gradient(circle at 10% 20%,rgba(255,255,255,.16) 0%,transparent 26%),` +
          `radial-gradient(circle at 80% 15%,rgba(255,255,255,.07) 0%,transparent 22%),` +
          `linear-gradient(90deg,rgba(255,255,255,.05) 0%,transparent 60%),` +
          `rgb(${rgb.r},${rgb.g},${rgb.b})`,
      } : null;

      return { textColor, mantleStyle, descBandStyle };
    });
  });

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : null;
  }

  openRatingPopup(item: CatalogItem): void  { this.ratingPopupItem.set(item); }

  closeRatingPopup(): void {
    const id = this.ratingPopupItem()?.id;
    this.ratingPopupItem.set(null);
    void id;
  }

  onProductAvgLoaded(itemId: string, avg: number): void {
    this.productAvgRatings.update(r => ({ ...r, [itemId]: avg }));
  }

  async ngOnInit(): Promise<void> {
    const saved = sessionStorage.getItem('cart_bubble_pos');
    const defaultPos = { x: window.innerWidth - 80, y: window.innerHeight - 100 };
    try {
      this.bubblePos.set(saved ? JSON.parse(saved) : defaultPos);
    } catch {
      this.bubblePos.set(defaultPos);
    }

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    const data = await this.directoryService.getById(id);

    if (!data) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    // Mostrar contenido de inmediato — no esperar las valoraciones
    this.account.set(data);
    this.loading.set(false);

    // Valoraciones en segundo plano — no bloquean el render ni el scroll
    const itemIds = (data.catalog_items ?? []).map(i => i.id);
    if (itemIds.length) {
      const avgs = await this.reviewService.getAveragesForItems(itemIds);
      this.productAvgRatings.set(avgs);
    }
  }

  // ── Auth-gated entry points ──────────────────────────────────────────────────

  requestOrder(a: Account): void {
    this.authGate.requireAuth(() =>
      a.catalog_items?.length ? this.showOrder.set(true) : this.openWhatsapp(a.whatsapp ?? '')
    );
  }

  conflictItem = signal<CatalogItem | null>(null);

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

  confirmClearCart(): void {
    const item      = this.conflictItem();
    const accountId = this.account()?.id;
    if (!item || !accountId) return;
    this.cart.clearAndAdd(item, accountId);
    this.conflictItem.set(null);
  }

  cancelClearCart(): void { this.conflictItem.set(null); }

  requestRatingPopup(item: CatalogItem): void {
    this.authGate.requireAuth(() => this.ratingPopupItem.set(item), 'rating');
  }

  // Delega al browser: off-main-thread, respeta scroll-margin-top del CSS
  scrollToProducts(): void {
    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openWhatsapp(phone: string): void {
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/57${clean}`, '_blank');
  }
}
