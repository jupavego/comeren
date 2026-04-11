import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { AccountsService } from '../../services/accounts.service';
import { StorageService } from '../../../../core/services/storage.service';
import { CatalogItem } from '../../../directory/models/account.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CatalogComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private catalog  = inject(CatalogService);
  private accounts = inject(AccountsService);
  private storage  = inject(StorageService);

  accountId    = signal<string | null>(null);
  items        = signal<CatalogItem[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  uploading    = signal(false);
  errorMsg     = signal<string | null>(null);
  successMsg   = signal<string | null>(null);

  // Control del formulario modal
  showForm     = signal(false);
  editingItem  = signal<CatalogItem | null>(null);
  imagePreview = signal<string | null>(null);
  imageFile    = signal<File | null>(null);

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price:       [0, [Validators.required, Validators.min(0)]],
    active:      [true],
  });

  get name()  { return this.form.controls.name; }
  get price() { return this.form.controls.price; }

  async ngOnInit(): Promise<void> {
    const account = await this.accounts.getMyAccount();
    if (account) {
      this.accountId.set(account.id);
      const items = await this.catalog.getByAccount(account.id);
      this.items.set(items);
    }
    this.loading.set(false);
  }

  openCreate(): void {
    this.editingItem.set(null);
    this.imagePreview.set(null);
    this.imageFile.set(null);
    this.form.reset({ name: '', description: '', price: 0, active: true });
    this.showForm.set(true);
  }

  openEdit(item: CatalogItem): void {
    this.editingItem.set(item);
    this.imagePreview.set(item.image_url);
    this.imageFile.set(null);
    this.form.patchValue({
      name:        item.name,
      description: item.description ?? '',
      price:       item.price,
      active:      item.active,
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingItem.set(null);
    this.errorMsg.set(null);
  }

  onImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const accountId = this.accountId();
    if (!accountId) return;

    this.saving.set(true);
    this.errorMsg.set(null);

    // Sube imagen si hay una nueva
    let imageUrl = this.editingItem()?.image_url ?? undefined;
    const file = this.imageFile();
    if (file) {
      this.uploading.set(true);
      const itemId = this.editingItem()?.id ?? crypto.randomUUID();
      const upload = await this.storage.uploadImage('catalog', file, `${itemId}.jpg`);
      this.uploading.set(false);
      if (upload.success) {
        imageUrl = upload.url;
      } else {
        this.errorMsg.set(upload.error ?? 'Error al subir la imagen');
        this.saving.set(false);
        return;
      }
    }

    const formData = {
      ...this.form.value,
      price:     Number(this.form.value.price),
      image_url: imageUrl,
    };

    const editing = this.editingItem();
    let success = false;
    let errorMsg: string | undefined;

    if (editing) {
      const result = await this.catalog.update(editing.id, formData as any);
      success = result.success;
      errorMsg = result.error;
      if (result.success && result.data) {
        const updated = result.data;
        this.items.update(items =>
          items.map(i => i.id === editing.id ? updated : i)
        );
      }
    } else {
      const result = await this.catalog.create(accountId, formData as any);
      success = result.success;
      errorMsg = result.error;
      if (result.success && result.data) {
        const created = result.data;
        this.items.update(items => [created, ...items]);
      }
    }

    this.saving.set(false);

    if (!success) {
      this.errorMsg.set(errorMsg ?? 'Error al guardar');
      return;
    }

    this.successMsg.set(editing ? 'Producto actualizado' : 'Producto creado');
    setTimeout(() => this.successMsg.set(null), 2500);
    this.closeForm();
  }

  async onDelete(item: CatalogItem): Promise<void> {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;

    const result = await this.catalog.delete(item.id);
    if (result.success) {
      this.items.update(items => items.filter(i => i.id !== item.id));
    } else {
      this.errorMsg.set(result.error ?? 'Error al eliminar');
    }
  }

  async onToggleActive(item: CatalogItem): Promise<void> {
    const result = await this.catalog.toggleActive(item.id, !item.active);
    if (result.success && result.data) {
      const updated = result.data;
      this.items.update(items =>
        items.map(i => i.id === item.id ? updated : i)
      );
    }
  }
}