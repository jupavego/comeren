import {
  Component,
  OnInit,
  OnDestroy,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Account } from '../../models/account.model';
import { DirectoryService } from '../../services/directory.service';
import { DirectoryStateService } from '../../services/directory-state.service';
import { CarouselComponent, CarouselSlide } from '../../components/carousel/carousel.component';
import { DirectoryListComponent } from '../../components/directory-list/directory-list.component';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';
import { HomeConfigService, HomeConfig, HomeFeatured, DEFAULT_HOME_CONFIG } from '../../../../features/admin/services/home-config.service';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-directory-home',
  standalone: true,
  imports: [CommonModule, CarouselComponent, DirectoryListComponent, SectionHeaderComponent],
  templateUrl: './directory-home.component.html',
  styleUrl: './directory-home.component.scss',
})
export class DirectoryHomeComponent implements OnInit, OnDestroy {
  private directoryService  = inject(DirectoryService);
  private homeConfigService = inject(HomeConfigService);
  readonly state            = inject(DirectoryStateService);

  accounts    = signal<Account[]>([]);
  loading     = signal(true);
  loadingMore = signal(false);
  hasMore     = signal(false);
  private page = 0;

  carouselSlides = signal<CarouselSlide[]>([]);

  // Flag que indica que llegó un cambio de estado mientras había una carga
  // en progreso. El loop interno de la carga lo detecta y relanza loadPage
  // con los valores más recientes (loadPage lee el estado directamente).
  private pendingLoad = false;

  constructor() {
    effect(async () => {
      // Suscribirse a cambios (reactivo)
      this.state.search();
      this.state.category();

      if (untracked(() => this.loading())) {
        // Hay una carga en curso → marcar como pendiente y salir.
        // El loop de la carga activa lo recogerá al terminar.
        this.pendingLoad = true;
        return;
      }

      // Iniciar carga y repetir mientras lleguen cambios durante la espera
      this.pendingLoad = false;
      this.loading.set(true);

      do {
        this.pendingLoad = false;
        await this.loadPage(true); // loadPage lee state.search/category en tiempo real
      } while (this.pendingLoad);

      this.loading.set(false);
    });
  }

  async ngOnInit(): Promise<void> {
    const [, config, featuredDB] = await Promise.all([
      this.loadPage(true),
      this.homeConfigService.getConfig(),
      this.homeConfigService.getFeaturedWithDetails(),
    ]);

    // Si hay negocios configurados en BD, usarlos; si no, cargar los 4 más recientes
    if (featuredDB.length > 0) {
      this.carouselSlides.set(this.buildSlidesFromDB(config, featuredDB));
    } else {
      const featured = await this.directoryService.getFeatured(4);
      this.carouselSlides.set(this.buildSlides(config, featured));
    }

    this.loading.set(false);
  }

  // Al salir del directorio, resetea filtros para que el header
  // no quede con una categoría marcada al volver
  ngOnDestroy(): void {
    this.state.clearFilters();
  }

  // ── Construcción de slides ──────────────────────────────────────────────────

  /** Slide intro desde config de BD + negocios desde Account[] (fallback). */
  private buildSlides(config: HomeConfig, featured: Account[]): CarouselSlide[] {
    const intro = this.buildIntroSlide(config);

    const businessSlides: CarouselSlide[] = featured.map(a => ({
      type:       'business' as const,
      background: a.cover_url
        ? `url('${a.cover_url}')`
        : a.logo_url
          ? `url('${a.logo_url}')`
          : undefined,
      category:   a.category ?? undefined,
      title:      a.name,
      subtitle:   (a as any).slogan ?? undefined,
      linkUrl:    `/negocio/${a.id}`,
    }));

    return [intro, ...businessSlides];
  }

  /** Slide intro desde config de BD + negocios desde home_featured. */
  private buildSlidesFromDB(config: HomeConfig, featured: HomeFeatured[]): CarouselSlide[] {
    const intro = this.buildIntroSlide(config);

    const businessSlides: CarouselSlide[] = featured.map(f => ({
      type:       'business' as const,
      background: f.cover_url
        ? `url('${f.cover_url}')`
        : f.logo_url
          ? `url('${f.logo_url}')`
          : undefined,
      category:   f.category ?? undefined,
      title:      f.name,
      subtitle:   f.slogan ?? undefined,
      linkUrl:    `/negocio/${f.account_id}`,
    }));

    return [intro, ...businessSlides];
  }

  private buildIntroSlide(config: HomeConfig): CarouselSlide {
    return {
      type:            'intro',
      background:      config.slide1_image_url ? `url('${config.slide1_image_url}')` : undefined,
      title:           config.slide1_title,
      description:     config.slide1_description,
      primaryBtn:      config.slide1_primary_btn,
      secondaryBtn:    config.slide1_secondary_btn,
      primaryAction:   () => this.scrollToList(),
      secondaryAction: () => this.scrollToList(),
    };
  }

  private scrollToList(): void {
    document.getElementById('listado-negocios')?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Paginación ──────────────────────────────────────────────────────────────

  private async loadPage(reset: boolean): Promise<void> {
    if (reset) { this.page = 0; this.accounts.set([]); }

    const search   = this.state.search().trim();
    const category = this.state.category();

    let result: { data: Account[]; hasMore: boolean };

    if (search) {
      result = await this.directoryService.searchPaginated(search, this.page, PAGE_SIZE);
    } else if (category !== 'Todos') {
      result = await this.directoryService.getByCategoryPaginated(category, this.page, PAGE_SIZE);
    } else {
      result = await this.directoryService.getPaginated(this.page, PAGE_SIZE);
    }

    this.accounts.update(prev => reset ? result.data : [...prev, ...result.data]);
    this.hasMore.set(result.hasMore);
  }

  async onLoadMore(): Promise<void> {
    if (!this.hasMore() || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.page++;
    await this.loadPage(false);
    this.loadingMore.set(false);
  }

  onClearFilters(): void { this.state.clearFilters(); }
}