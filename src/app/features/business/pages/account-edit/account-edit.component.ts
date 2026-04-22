import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountsService } from '../../services/accounts.service';
import { StorageService } from '../../../../core/services/storage.service';
import {
  Account, AccountFormData, DIRECTORY_CATEGORIES,
  BusinessHours, DayKey, DAY_KEYS, DAY_LABELS, DAY_SHORT_LABELS, DEFAULT_HOURS,
} from '../../../directory/models/account.model';
import { MapPickerComponent } from '../../../../shared/components/map-picker/map-picker.component';

export type EditSection = 'general' | 'location' | 'social' | 'hero' | 'catalog';

const SECTION_FIELDS: Record<EditSection, string[]> = {
  general:  ['name', 'category', 'slogan', 'description', 'history'],
  location: ['address', 'zone', 'phone', 'schedule'],
  social:   ['whatsapp', 'instagram', 'facebook'],
  hero:     [],
  catalog:  [],
};

const MAX_ALBUM = 10;

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MapPickerComponent],
  templateUrl: './account-edit.component.html',
  styleUrl: './account-edit.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccountEditComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private accounts = inject(AccountsService);
  private storage  = inject(StorageService);

  readonly maxAlbum = MAX_ALBUM;

  account       = signal<Account | null>(null);
  loading       = signal(true);
  savingImg     = signal(false);
  saving        = signal(false);
  successMsg    = signal<string | null>(null);
  errorMsg      = signal<string | null>(null);
  imgSuccessMsg = signal<string | null>(null);
  imgErrorMsg   = signal<string | null>(null);

  pendingLogo  = signal<File | null>(null);
  pendingCover = signal<File | null>(null);
  previewLogo  = signal<string | null>(null);
  previewCover = signal<string | null>(null);

  readonly hasPendingImages = computed(() =>
    !!this.pendingLogo() || !!this.pendingCover()
  );

  activeSections = signal<Set<EditSection>>(new Set());

  pendingLat = signal<number | null>(null);
  pendingLng = signal<number | null>(null);

  onLocationChange(coords: { lat: number; lng: number }): void {
    this.pendingLat.set(coords.lat);
    this.pendingLng.set(coords.lng);
  }

  businessHours = signal<BusinessHours>({ ...DEFAULT_HOURS });

  readonly dayKeys        = DAY_KEYS;
  readonly dayLabels      = DAY_LABELS;
  readonly dayShortLabels = DAY_SHORT_LABELS;

  toggleDay(key: DayKey, enabled: boolean): void {
    this.businessHours.update(h => ({ ...h, [key]: { ...h[key], enabled } }));
  }

  setTime(key: DayKey, field: 'open' | 'close', value: string): void {
    this.businessHours.update(h => ({ ...h, [key]: { ...h[key], [field]: value } }));
  }

  // ── Personalización del HERO ──────────────────────────────────────────────────
  heroPanelBg      = signal('#ffffff');
  heroPanelText    = signal('#1a0a00');
  savingHero       = signal(false);
  heroSuccessMsg   = signal<string | null>(null);
  heroErrorMsg     = signal<string | null>(null);

  async saveHeroPersonalization(): Promise<void> {
    const id = this.account()?.id;
    if (!id) return;

    this.savingHero.set(true);
    this.heroErrorMsg.set(null);

    const result = await this.accounts.update(id, {
      hero_panel_bg:   this.heroPanelBg(),
      hero_panel_text: this.heroPanelText(),
    } as any);

    this.savingHero.set(false);

    if (!result.success) {
      this.heroErrorMsg.set(result.error ?? 'Error al guardar');
      return;
    }

    this.account.update(a => a ? {
      ...a,
      hero_panel_bg:   this.heroPanelBg(),
      hero_panel_text: this.heroPanelText(),
    } : a);
    this.toggleSection('hero');
    this.heroSuccessMsg.set('Apariencia del hero guardada');
    setTimeout(() => this.heroSuccessMsg.set(null), 3000);
  }

  // ── Álbum del negocio ─────────────────────────────────────────────────────────
  albumUrls          = signal<string[]>([]);
  pendingAlbumFiles  = signal<File[]>([]);
  albumPreviews      = signal<string[]>([]);
  savingAlbum        = signal(false);
  albumSuccessMsg    = signal<string | null>(null);
  albumErrorMsg      = signal<string | null>(null);

  readonly totalAlbumCount = computed(() =>
    this.albumUrls().length + this.pendingAlbumFiles().length
  );

  onAlbumFilesSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;

    const remaining = MAX_ALBUM - this.totalAlbumCount();
    const selected  = files.slice(0, remaining);

    this.pendingAlbumFiles.update(p => [...p, ...selected]);
    selected.forEach(f => {
      this.albumPreviews.update(p => [...p, URL.createObjectURL(f)]);
    });

    (event.target as HTMLInputElement).value = '';
  }

  removePendingAlbumFile(index: number): void {
    this.pendingAlbumFiles.update(p => p.filter((_, i) => i !== index));
    this.albumPreviews.update(p => p.filter((_, i) => i !== index));
  }

  async removeAlbumUrl(index: number): Promise<void> {
    const id = this.account()?.id;
    if (!id) return;

    const updated = this.albumUrls().filter((_, i) => i !== index);
    const result  = await this.accounts.update(id, { album_urls: updated } as any);
    if (!result.success) return;

    this.albumUrls.set(updated);
    this.account.update(a => a ? { ...a, album_urls: updated } : a);
  }

  async saveAlbum(): Promise<void> {
    const id = this.account()?.id;
    if (!id) return;

    const pending = this.pendingAlbumFiles();
    if (!pending.length) return;

    this.savingAlbum.set(true);
    this.albumErrorMsg.set(null);

    const uploaded: string[] = [];

    for (const file of pending) {
      const slug   = Math.random().toString(36).slice(2, 8);
      const result = await this.storage.uploadImage('accounts', file, `album_${Date.now()}_${slug}.jpg`);
      if (result.success && result.url) {
        uploaded.push(result.url);
      } else {
        this.albumErrorMsg.set(result.error ?? 'Error al subir foto');
        this.savingAlbum.set(false);
        return;
      }
    }

    const allUrls = [...this.albumUrls(), ...uploaded];
    const result  = await this.accounts.update(id, { album_urls: allUrls } as any);

    this.savingAlbum.set(false);

    if (!result.success) {
      this.albumErrorMsg.set(result.error ?? 'Error al guardar álbum');
      return;
    }

    this.albumUrls.set(allUrls);
    this.pendingAlbumFiles.set([]);
    this.albumPreviews.set([]);
    this.account.update(a => a ? { ...a, album_urls: allUrls } : a);
    this.albumSuccessMsg.set('Álbum actualizado correctamente');
    setTimeout(() => this.albumSuccessMsg.set(null), 3000);
  }

  // ── Personalización del CATÁLOGO ──────────────────────────────────────────────
  brandColors       = signal<string[]>([]);
  catalogTextColor  = signal('#ffffff');
  savingCatalog     = signal(false);
  catalogSuccessMsg = signal<string | null>(null);
  catalogErrorMsg   = signal<string | null>(null);

  addBrandColor(): void {
    if (this.brandColors().length < 4) {
      this.brandColors.update(c => [...c, '#5e49d6']);
    }
  }

  removeBrandColor(index: number): void {
    this.brandColors.update(c => c.filter((_, i) => i !== index));
  }

  updateBrandColor(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.brandColors.update(c => c.map((col, i) => i === index ? value : col));
  }

  async saveCatalogPersonalization(): Promise<void> {
    const id = this.account()?.id;
    if (!id) return;

    this.savingCatalog.set(true);
    this.catalogErrorMsg.set(null);

    const result = await this.accounts.update(id, {
      brand_colors:       this.brandColors(),
      catalog_text_color: this.catalogTextColor(),
    } as any);

    this.savingCatalog.set(false);

    if (!result.success) {
      this.catalogErrorMsg.set(result.error ?? 'Error al guardar');
      return;
    }

    this.account.update(a => a ? {
      ...a,
      brand_colors:       this.brandColors(),
      catalog_text_color: this.catalogTextColor(),
    } : a);
    this.toggleSection('catalog');
    this.catalogSuccessMsg.set('Colores del catálogo guardados');
    setTimeout(() => this.catalogSuccessMsg.set(null), 3000);
  }

  readonly categories = DIRECTORY_CATEGORIES.filter(c => c !== 'Todos');

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    category:    ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(20)]],
    slogan:      [''],
    history:     [''],
    address:     ['', Validators.required],
    zone:        [''],
    phone:       ['', Validators.required],
    schedule:    [''],
    facebook:    [''],
    instagram:   [''],
    whatsapp:    [''],
  });

  isEditing(section: EditSection): boolean {
    return this.activeSections().has(section);
  }

  toggleSection(section: EditSection): void {
    const current = new Set(this.activeSections());

    if (current.has(section)) {
      current.delete(section);
      this.disableSectionFields(section);
      this.resetSectionFields(section);
      if (section === 'hero') {
        this.heroPanelBg.set(this.account()?.hero_panel_bg ?? '#ffffff');
        this.heroPanelText.set(this.account()?.hero_panel_text ?? '#1a0a00');
      }
      if (section === 'catalog') {
        this.brandColors.set(this.account()?.brand_colors ?? []);
        this.catalogTextColor.set(this.account()?.catalog_text_color ?? '#ffffff');
      }
    } else {
      current.add(section);
      this.enableSectionFields(section);
    }

    this.activeSections.set(current);
  }

  private enableSectionFields(section: EditSection): void {
    for (const field of SECTION_FIELDS[section]) {
      this.form.get(field)?.enable();
    }
  }

  private disableSectionFields(section: EditSection): void {
    for (const field of SECTION_FIELDS[section]) {
      this.form.get(field)?.disable();
    }
  }

  private resetSectionFields(section: EditSection): void {
    const account = this.account();
    if (!account) return;

    const values: Record<string, string> = {
      name:        account.name,
      category:    account.category ?? '',
      description: account.description ?? '',
      slogan:      account.slogan ?? '',
      history:     account.history ?? '',
      address:     account.address ?? '',
      zone:        account.zone ?? '',
      phone:       account.phone ?? '',
      schedule:    account.schedule ?? '',
      facebook:    account.facebook ?? '',
      instagram:   account.instagram ?? '',
      whatsapp:    account.whatsapp ?? '',
    };

    const patch: Record<string, string> = {};
    for (const field of SECTION_FIELDS[section]) {
      patch[field] = values[field];
    }
    this.form.patchValue(patch);
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.form.disable();

    const account = await this.accounts.getMyAccount();

    if (account) {
      const t = Date.now();
      this.account.set({
        ...account,
        logo_url:  account.logo_url  ? `${account.logo_url}?t=${t}`  : account.logo_url,
        cover_url: account.cover_url ? `${account.cover_url}?t=${t}` : account.cover_url,
      });
      this.pendingLat.set(account.latitude ?? null);
      this.pendingLng.set(account.longitude ?? null);
      this.businessHours.set(account.schedule_json ?? { ...DEFAULT_HOURS });
      this.brandColors.set(account.brand_colors ?? []);
      this.heroPanelBg.set(account.hero_panel_bg ?? '#ffffff');
      this.heroPanelText.set(account.hero_panel_text ?? '#1a0a00');
      this.catalogTextColor.set(account.catalog_text_color ?? '#ffffff');
      this.albumUrls.set(account.album_urls ?? []);

      this.form.patchValue({
        name:        account.name,
        category:    account.category ?? '',
        description: account.description ?? '',
        slogan:      account.slogan ?? '',
        history:     account.history ?? '',
        address:     account.address ?? '',
        zone:        account.zone ?? '',
        phone:       account.phone ?? '',
        schedule:    account.schedule ?? '',
        facebook:    account.facebook ?? '',
        instagram:   account.instagram ?? '',
        whatsapp:    account.whatsapp ?? '',
      });
    }

    this.loading.set(false);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.account()?.id;
    if (!id) return;

    this.saving.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const formData = this.form.getRawValue() as AccountFormData;
    const result = await this.accounts.update(id, {
      ...formData,
      latitude:      this.pendingLat(),
      longitude:     this.pendingLng(),
      schedule_json: this.businessHours(),
    } as any);

    this.saving.set(false);

    if (!result.success) {
      this.errorMsg.set(result.error ?? 'Error al guardar');
      return;
    }

    this.activeSections.set(new Set());
    this.form.disable();

    const currentAccount = this.account();
    this.account.set({
      ...result.data!,
      logo_url:  currentAccount?.logo_url  ?? result.data!.logo_url,
      cover_url: currentAccount?.cover_url ?? result.data!.cover_url,
    });

    this.successMsg.set('Información actualizada correctamente');
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  async onSaveImages(): Promise<void> {
    const id = this.account()?.id;
    if (!id) return;

    this.savingImg.set(true);
    this.imgErrorMsg.set(null);
    this.imgSuccessMsg.set(null);

    try {
      if (this.pendingLogo()) {
        const result = await this.storage.uploadImage('accounts', this.pendingLogo()!, 'logo.jpg');
        if (result.success && result.url) {
          await this.accounts.updateLogo(id, result.url);
          const freshUrl = `${result.url}?t=${Date.now()}`;
          this.account.update(a => a ? { ...a, logo_url: freshUrl } : a);
          this.pendingLogo.set(null);
          this.previewLogo.set(null);
        } else {
          this.imgErrorMsg.set(result.error ?? 'Error al subir el logo');
          return;
        }
      }

      if (this.pendingCover()) {
        const result = await this.storage.uploadImage('accounts', this.pendingCover()!, 'cover.jpg');
        if (result.success && result.url) {
          await this.accounts.updateCover(id, result.url);
          const freshUrl = `${result.url}?t=${Date.now()}`;
          this.account.update(a => a ? { ...a, cover_url: freshUrl } : a);
          this.pendingCover.set(null);
          this.previewCover.set(null);
        } else {
          this.imgErrorMsg.set(result.error ?? 'Error al subir la portada');
          return;
        }
      }

      this.imgSuccessMsg.set('Imágenes actualizadas correctamente');
      setTimeout(() => this.imgSuccessMsg.set(null), 3000);

    } finally {
      this.savingImg.set(false);
    }
  }

  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.pendingLogo.set(file);
    this.previewLogo.set(URL.createObjectURL(file));
  }

  onCoverChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.pendingCover.set(file);
    this.previewCover.set(URL.createObjectURL(file));
  }

  discardLogo(): void  { this.pendingLogo.set(null);  this.previewLogo.set(null); }
  discardCover(): void { this.pendingCover.set(null); this.previewCover.set(null); }
}
