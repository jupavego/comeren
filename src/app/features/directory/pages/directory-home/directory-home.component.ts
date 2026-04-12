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

const PAGE_SIZE = 12;

@Component({
  selector: 'app-directory-home',
  standalone: true,
  imports: [CommonModule, CarouselComponent, DirectoryListComponent, SectionHeaderComponent],
  templateUrl: './directory-home.component.html',
  styleUrl: './directory-home.component.scss',
})
export class DirectoryHomeComponent implements OnInit, OnDestroy {
  private directoryService = inject(DirectoryService);
  readonly state           = inject(DirectoryStateService);

  accounts    = signal<Account[]>([]);
  loading     = signal(true);
  loadingMore = signal(false);
  hasMore     = signal(false);
  private page = 0;

  carouselSlides = signal<CarouselSlide[]>([]);

  constructor() {
    effect(async () => {
      const _search   = this.state.search();
      const _category = this.state.category();
      if (!untracked(() => this.loading())) {
        this.loading.set(true);
        await this.loadPage(true);
        this.loading.set(false);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const [, featured] = await Promise.all([
      this.loadPage(true),
      this.directoryService.getFeatured(4),
    ]);

    this.carouselSlides.set(this.buildSlides(featured));
    this.loading.set(false);
  }

  // Al salir del directorio, resetea filtros para que el header
  // no quede con una categoría marcada al volver
  ngOnDestroy(): void {
    this.state.clearFilters();
  }

  // ── Construcción de slides ──────────────────────────────────────────────────

  private buildSlides(featured: Account[]): CarouselSlide[] {
    const intro: CarouselSlide = {
      type:            'intro',
      title:           'Sabores que se sienten locales',
      description:     'Explora negocios de comida en Girardota y encuentra una opción rica, cercana y confiable.',
      primaryBtn:      'Explorar negocios',
      secondaryBtn:    'Ver destacados',
      primaryAction:   () => this.scrollToList(),
      secondaryAction: () => this.scrollToList(),
    };

    const businessSlides: CarouselSlide[] = featured.map(a => ({
      type:       'business' as const,
      background: a.cover_url
        ? `url('${a.cover_url}')`
        : a.logo_url
          ? `url('${a.logo_url}')`
          : undefined,
      category:   a.category ?? undefined,
      title:      a.name,
      subtitle:   a.slogan ?? undefined,
      linkUrl:    `/negocio/${a.id}`,
    }));

    return [intro, ...businessSlides];
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