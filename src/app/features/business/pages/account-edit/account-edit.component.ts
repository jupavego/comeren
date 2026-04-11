import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountsService } from '../../services/accounts.service';
import { StorageService } from '../../../../core/services/storage.service';
import { Account, AccountFormData, DIRECTORY_CATEGORIES } from '../../../directory/models/account.model';

export type EditSection = 'general' | 'location' | 'social';

// Campos que pertenecen a cada sección
const SECTION_FIELDS: Record<EditSection, string[]> = {
  general:  ['name', 'category', 'slogan', 'description', 'history'],
  location: ['address', 'zone', 'phone', 'schedule'],
  social:   ['whatsapp', 'instagram', 'facebook'],
};

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './account-edit.component.html',
  styleUrl: './account-edit.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccountEditComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private accounts = inject(AccountsService);
  private storage  = inject(StorageService);

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
  readonly hasActiveSection = computed(() => this.activeSections().size > 0);

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
      // Cerrar sección — deshabilitar sus campos y resetear a valores guardados
      current.delete(section);
      this.disableSectionFields(section);
      this.resetSectionFields(section);
    } else {
      // Abrir sección — habilitar sus campos
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

  // Resetea los campos de una sección a los valores guardados en DB
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

    // Deshabilitar todos los campos al inicio — ninguna sección activa
    this.form.disable();

    const account = await this.accounts.getMyAccount();

    if (account) {
      const t = Date.now();
      this.account.set({
        ...account,
        logo_url:  account.logo_url  ? `${account.logo_url}?t=${t}`  : account.logo_url,
        cover_url: account.cover_url ? `${account.cover_url}?t=${t}` : account.cover_url,
      });
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

    // Incluir valores de campos deshabilitados (disabled los excluye de form.value)
    const formData = this.form.getRawValue() as AccountFormData;
    const result = await this.accounts.update(id, formData);

    this.saving.set(false);

    if (!result.success) {
      this.errorMsg.set(result.error ?? 'Error al guardar');
      return;
    }

    // Cerrar todas las secciones y deshabilitar campos
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

  discardLogo(): void {
    this.pendingLogo.set(null);
    this.previewLogo.set(null);
  }

  discardCover(): void {
    this.pendingCover.set(null);
    this.previewCover.set(null);
  }
}