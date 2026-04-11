import { Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AdminService,
  AdminCatalogItem,
  AdminCatalogFormData,
} from '../../services/admin.service';

@Component({
  selector: 'app-catalog-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './catalog-list.component.html',
  styleUrl: './catalog-list.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CatalogListComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb           = inject(FormBuilder);

  products     = signal<AdminCatalogItem[]>([]);
  accounts     = signal<{ id: string; name: string }[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  processingId = signal<string | null>(null);
  errorMsg     = signal<string | null>(null);
  successMsg   = signal<string | null>(null);

  // Filtros
  searchText    = signal('');
  accountFilter = signal('all');
  statusFilter  = signal<'all' | 'active' | 'inactive'>('all');

  // Modal
  showForm    = signal(false);
  editingItem = signal<AdminCatalogItem | null>(null);
  imagePreview = signal<string | null>(null);
  imageFile    = signal<File | null>(null);

  form = this.fb.group({
    account_id:  ['', Validators.required],
    name:        ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price:       [0, [Validators.required, Validators.min(0)]],
    active:      [true],
  });

  get name()      { return this.form.controls.name; }
  get price()     { return this.form.controls.price; }
  get accountId() { return this.form.controls.account_id; }

  filtered = computed(() => {
    const text    = this.searchText().toLowerCase().trim();
    const account = this.accountFilter();
    const status  = this.statusFilter();

    return this.products().filter(p => {
      const matchesText    = !text ||
        p.name.toLowerCase().includes(text) ||
        p.account_name?.toLowerCase().includes(text) ||
        p.description?.toLowerCase().includes(text);
      const matchesAccount = account === 'all' || p.account_id === account;
      const matchesStatus  =
        status === 'all' ||
        (status === 'active'   && p.active) ||
        (status === 'inactive' && !p.active);
      return matchesText && matchesAccount && matchesStatus;
    });
  });

  async ngOnInit(): Promise<void> {
    const [products, accounts] = await Promise.all([
      this.adminService.getAllProducts(),
      this.adminService.getAccountsList(),
    ]);
    this.products.set(products);
    this.accounts.set(accounts);
    this.loading.set(false);
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  openCreate(): void {
    this.editingItem.set(null);
    this.imagePreview.set(null);
    this.imageFile.set(null);
    this.form.reset({ name: '', description: '', price: 0, active: true, account_id: '' });
    this.errorMsg.set(null);
    this.showForm.set(true);
  }

  openEdit(item: AdminCatalogItem): void {
    this.editingItem.set(item);
    this.imagePreview.set(item.image_url);
    this.imageFile.set(null);
    this.form.patchValue({
      account_id:  item.account_id,
      name:        item.name,
      description: item.description ?? '',
      price:       item.price,
      active:      item.active,
    });
    this.errorMsg.set(null);
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

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);

    const formData: AdminCatalogFormData = {
      account_id:  this.form.value.account_id!,
      name:        this.form.value.name!,
      description: this.form.value.description ?? '',
      price:       Number(this.form.value.price),
      active:      this.form.value.active ?? true,
    };

    const editing  = this.editingItem();
    const file     = this.imageFile() ?? undefined;
    let success    = false;
    let errorMsg: string | undefined;

    if (editing) {
      const result = await this.adminService.updateProduct(editing.id, formData, file);
      success  = result.success;
      errorMsg = result.error;
      if (result.success && result.data) {
        const updated = result.data;
        this.products.update(items =>
          items.map(i => i.id === editing.id ? updated : i)
        );
      }
    } else {
      const result = await this.adminService.createProduct(formData, file);
      success  = result.success;
      errorMsg = result.error;
      if (result.success && result.data) {
        const created = result.data;
        this.products.update(items => [created, ...items]);
      }
    }

    this.saving.set(false);

    if (!success) {
      this.errorMsg.set(errorMsg ?? 'Error al guardar');
      return;
    }

    this.showSuccess(editing ? 'Producto actualizado' : 'Producto creado');
    this.closeForm();
  }

  async onToggle(item: AdminCatalogItem): Promise<void> {
    this.processingId.set(item.id);
    const ok = await this.adminService.toggleProduct(item.id, !item.active);
    if (ok) {
      this.products.update(items =>
        items.map(i => i.id === item.id ? { ...i, active: !i.active } : i)
      );
    }
    this.processingId.set(null);
  }

  async onDelete(item: AdminCatalogItem): Promise<void> {
    if (!confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) return;

    this.processingId.set(item.id);
    const ok = await this.adminService.deleteProduct(item.id);
    if (ok) {
      this.products.update(items => items.filter(i => i.id !== item.id));
      this.showSuccess('Producto eliminado');
    } else {
      this.errorMsg.set('Error al eliminar el producto');
    }
    this.processingId.set(null);
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 2500);
  }
}