import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Account, CatalogItem } from '../../models/account.model';
import { DirectoryService } from '../../services/directory.service';
import { ReviewService } from '../../services/review.service';
import { ReviewsComponent } from '../../components/reviews/reviews.component';
import { WhatsappOrderComponent } from '../../components/whatsapp-order/whatsapp-order.component';
import { MapViewComponent } from '../../../../shared/components/map-view/map-view.component';
import { BusinessStatusBadgeComponent } from '../../../../shared/components/business-status-badge/business-status-badge.component';
import { ProductReviewsComponent } from '../../components/product-reviews/product-reviews.component';

@Component({
  selector: 'app-business-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReviewsComponent, WhatsappOrderComponent, MapViewComponent, BusinessStatusBadgeComponent, ProductReviewsComponent],
  templateUrl: './business-detail.component.html',
  styleUrl: './business-detail.component.scss',
})
export class BusinessDetailComponent implements OnInit, OnDestroy {
  private route            = inject(ActivatedRoute);
  private directoryService = inject(DirectoryService);
  private reviewService    = inject(ReviewService);

  private shimmerObserver?: IntersectionObserver;

  constructor() {
    // Cuando la cuenta carga, esperar un frame para que el DOM renderice el botón
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

  ngOnDestroy(): void {
    this.shimmerObserver?.disconnect();
  }

  account   = signal<Account | null>(null);
  loading   = signal(true);
  notFound  = signal(false);
  showOrder = signal(false);

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
   * Determina si el texto sobre ese color debe ser blanco o negro.
   * Usa la fórmula NTSC de luminancia relativa (0.299R + 0.587G + 0.114B).
   */
  getTextColor(index: number): string {
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
