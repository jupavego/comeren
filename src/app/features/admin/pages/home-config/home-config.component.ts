import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HomeConfigService, HomeConfig, HomeFeatured } from '../../services/home-config.service';
import { Account } from '../../../directory/models/account.model';

@Component({
  selector: 'app-home-config',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home-config.component.html',
  styleUrl: './home-config.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HomeConfigComponent implements OnInit {
  private svc = inject(HomeConfigService);

  loading        = signal(true);
  saving         = signal(false);
  saveMsg        = signal<string | null>(null);
  saveError      = signal<string | null>(null);
  imageUploading = signal(false);

  // ── Campos del slide de bienvenida ───────────────────────────────────────────
  slide1Title        = signal('');
  slide1Description  = signal('');
  slide1PrimaryBtn   = signal('');
  slide1SecondaryBtn = signal('');
  slide1ImageUrl     = signal<string | null>(null);

  // ── Negocios destacados ──────────────────────────────────────────────────────
  featured    = signal<HomeFeatured[]>([]);
  allAccounts = signal<Account[]>([]);
  addSearch   = signal('');

  /** Negocios aprobados que aún no están en el carrusel, filtrados por búsqueda. */
  addResults = computed(() => {
    const usedIds = new Set(this.featured().map(f => f.account_id));
    const q = this.addSearch().toLowerCase().trim();
    return this.allAccounts()
      .filter(a => !usedIds.has(a.id))
      .filter(a =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.category ?? '').toLowerCase().includes(q)
      )
  });

  async ngOnInit(): Promise<void> {
    const [config, featured, accounts] = await Promise.all([
      this.svc.getConfig(),
      this.svc.getFeaturedWithDetails(),
      this.svc.getApprovedAccounts(),
    ]);

    this.slide1Title.set(config.slide1_title);
    this.slide1Description.set(config.slide1_description);
    this.slide1PrimaryBtn.set(config.slide1_primary_btn);
    this.slide1SecondaryBtn.set(config.slide1_secondary_btn);
    this.slide1ImageUrl.set(config.slide1_image_url);

    this.featured.set(featured);
    this.allAccounts.set(accounts);
    this.loading.set(false);
  }

  // ── Imagen del slide ─────────────────────────────────────────────────────────

  async onImageSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageUploading.set(true);
    this.saveError.set(null);
    const { url, error } = await this.svc.uploadSlide1Image(file);
    if (error) this.saveError.set(error);
    else if (url) this.slide1ImageUrl.set(url);
    this.imageUploading.set(false);
  }

  removeImage(): void { this.slide1ImageUrl.set(null); }

  // ── Gestión del carrusel ─────────────────────────────────────────────────────

  addBusiness(account: Account): void {
    this.featured.update(list => [
      ...list,
      {
        account_id:  account.id,
        order_index: list.length,
        name:        account.name,
        logo_url:    account.logo_url  ?? null,
        cover_url:   account.cover_url ?? null,
        category:    account.category  ?? null,
        slogan:      (account as any).slogan ?? null,
      },
    ]);
    this.addSearch.set('');
  }

  remove(index: number): void {
    this.featured.update(list =>
      list
        .filter((_, i) => i !== index)
        .map((f, i) => ({ ...f, order_index: i }))
    );
  }

  moveUp(index: number): void {
    if (index === 0) return;
    this.featured.update(list => {
      const copy = [...list];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy.map((f, i) => ({ ...f, order_index: i }));
    });
  }

  moveDown(index: number): void {
    if (index >= this.featured().length - 1) return;
    this.featured.update(list => {
      const copy = [...list];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy.map((f, i) => ({ ...f, order_index: i }));
    });
  }

  // ── Guardar todo ─────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    this.saving.set(true);
    this.saveMsg.set(null);
    this.saveError.set(null);

    const config: HomeConfig = {
      slide1_title:         this.slide1Title().trim(),
      slide1_description:   this.slide1Description().trim(),
      slide1_primary_btn:   this.slide1PrimaryBtn().trim(),
      slide1_secondary_btn: this.slide1SecondaryBtn().trim(),
      slide1_image_url:     this.slide1ImageUrl(),
    };

    const [configRes, featuredRes] = await Promise.all([
      this.svc.upsertConfig(config),
      this.svc.saveFeatured(this.featured().map(f => f.account_id)),
    ]);

    if (configRes.error || featuredRes.error) {
      this.saveError.set(configRes.error ?? featuredRes.error ?? 'Error desconocido');
    } else {
      this.saveMsg.set('¡Cambios guardados correctamente!');
      setTimeout(() => this.saveMsg.set(null), 3500);
    }

    this.saving.set(false);
  }
}
