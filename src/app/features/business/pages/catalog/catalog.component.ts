import {
  Component, OnInit, ViewEncapsulation,
  inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CatalogService } from '../../services/catalog.service';
import { AccountsService } from '../../services/accounts.service';
import { StorageService } from '../../../../core/services/storage.service';
import { CatalogItem, CatalogSection } from '../../../directory/models/account.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DragDropModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CatalogComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private catalog  = inject(CatalogService);
  private accounts = inject(AccountsService);
  private storage  = inject(StorageService);

  accountId  = signal<string | null>(null);
  sections   = signal<CatalogSection[]>([]);   // secciones con sus items poblados
  freeItems  = signal<CatalogItem[]>([]);       // productos sin sección
  loading    = signal(true);
  saving     = signal(false);
  uploading  = signal(false);
  errorMsg   = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Estado del formulario de producto ─────────────────────────────────────────
  showForm       = signal(false);
  editingItem    = signal<CatalogItem | null>(null);
  imagePreview   = signal<string | null>(null);
  imageFile      = signal<File | null>(null);
  formSectionId  = signal<string | null>(null);  // sección preseleccionada al abrir modal

  // ── Estado del formulario de sección ──────────────────────────────────────────
  showSectionForm   = signal(false);
  editingSection    = signal<CatalogSection | null>(null);
  sectionNameInput  = signal('');
  sectionSaving     = signal(false);
  sectionError      = signal<string | null>(null);

  // ── IDs de drop lists (para conectarlos entre sí) ────────────────────────────
  readonly sectionDropListIds = computed(() =>
    ['free-items', ...this.sections().map(s => `section-${s.id}`)]
  );

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price:       [0, [Validators.required, Validators.min(0)]],
    active:      [true],
    section_id:  [null as string | null],
  });

  get name()  { return this.form.controls.name; }
  get price() { return this.form.controls.price; }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const account = await this.accounts.getMyAccount();
    if (account) {
      this.accountId.set(account.id);
      await this.loadData(account.id);
    }
    this.loading.set(false);
  }

  /** Carga secciones e items y los cruza en memoria */
  private async loadData(accountId: string): Promise<void> {
    const [rawSections, allItems] = await Promise.all([
      this.catalog.getSections(accountId),
      this.catalog.getByAccount(accountId),
    ]);

    // Poblar items dentro de cada sección
    const sectionsWithItems: CatalogSection[] = rawSections.map(s => ({
      ...s,
      items: allItems
        .filter(i => i.section_id === s.id)
        .sort((a, b) => a.position - b.position),
    }));

    // Items sin sección
    const free = allItems
      .filter(i => i.section_id === null)
      .sort((a, b) => a.position - b.position);

    this.sections.set(sectionsWithItems);
    this.freeItems.set(free);
  }

  // ── Drag & Drop — Secciones ───────────────────────────────────────────────────

  dropSection(event: CdkDragDrop<CatalogSection[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const secs = [...this.sections()];
    moveItemInArray(secs, event.previousIndex, event.currentIndex);

    // Actualizar posiciones localmente
    secs.forEach((s, i) => (s.position = i));
    this.sections.set(secs);

    // Persistir en background
    const accountId = this.accountId();
    if (accountId) {
      this.catalog.reorderSections(accountId, secs.map((s, i) => ({ id: s.id, position: i })));
    }
  }

  // ── Drag & Drop — Productos (dentro y entre secciones / área libre) ───────────

  dropProduct(event: CdkDragDrop<CatalogItem[]>, targetSectionId: string | null): void {
    const accountId = this.accountId();
    if (!accountId) return;

    if (event.previousContainer === event.container) {
      // Reorden dentro del mismo contenedor
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Movimiento entre contenedores
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      // Actualizar section_id del item movido
      event.container.data[event.currentIndex] = {
        ...event.container.data[event.currentIndex],
        section_id: targetSectionId,
      };
    }

    // Recalcular posiciones y persistir
    this.persistItemOrder(accountId);
  }

  /** Recalcula posiciones de todos los items y llama a la RPC */
  private persistItemOrder(accountId: string): void {
    const payload: { id: string; section_id: string | null; position: number }[] = [];

    // Items libres
    this.freeItems().forEach((item, i) => {
      item.position  = i;
      item.section_id = null;
      payload.push({ id: item.id, section_id: null, position: i });
    });

    // Items en secciones
    this.sections().forEach(sec => {
      (sec.items ?? []).forEach((item, i) => {
        item.position   = i;
        item.section_id = sec.id;
        payload.push({ id: item.id, section_id: sec.id, position: i });
      });
    });

    this.catalog.reorderItems(accountId, payload);
  }

  // ── Formulario de producto ─────────────────────────────────────────────────────

  openCreate(sectionId: string | null = null): void {
    this.editingItem.set(null);
    this.imagePreview.set(null);
    this.imageFile.set(null);
    this.formSectionId.set(sectionId);
    this.form.reset({ name: '', description: '', price: 0, active: true, section_id: sectionId });
    this.showForm.set(true);
    this.errorMsg.set(null);
  }

  openEdit(item: CatalogItem): void {
    this.editingItem.set(item);
    this.imagePreview.set(item.image_url);
    this.imageFile.set(null);
    this.formSectionId.set(item.section_id);
    this.form.patchValue({
      name:        item.name,
      description: item.description ?? '',
      price:       item.price,
      active:      item.active,
      section_id:  item.section_id,
    });
    this.showForm.set(true);
    this.errorMsg.set(null);
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
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const accountId = this.accountId();
    if (!accountId) return;

    this.saving.set(true);
    this.errorMsg.set(null);

    // Subir imagen si hay nueva
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

    const sectionId = this.form.value.section_id ?? null;
    const formData = {
      name:        this.form.value.name!,
      description: this.form.value.description ?? '',
      price:       Number(this.form.value.price),
      active:      this.form.value.active ?? true,
      image_url:   imageUrl,
      section_id:  sectionId,
    };

    const editing = this.editingItem();

    if (editing) {
      const result = await this.catalog.update(editing.id, formData);
      this.saving.set(false);
      if (!result.success) { this.errorMsg.set(result.error ?? 'Error al guardar'); return; }

      // Actualizar en listas locales
      if (result.data) this.replaceItemInLists(result.data);

    } else {
      // Determinar posición: al final de la lista destino
      const targetList = sectionId
        ? (this.sections().find(s => s.id === sectionId)?.items ?? [])
        : this.freeItems();
      const position = targetList.length;

      const result = await this.catalog.create(accountId, { ...formData, position });
      this.saving.set(false);
      if (!result.success) { this.errorMsg.set(result.error ?? 'Error al crear'); return; }

      // Insertar en la lista correspondiente
      if (result.data) this.insertItemInList(result.data);
    }

    this.successMsg.set(editing ? 'Producto actualizado' : 'Producto creado');
    setTimeout(() => this.successMsg.set(null), 2500);
    this.closeForm();
  }

  async onDelete(item: CatalogItem): Promise<void> {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    const result = await this.catalog.delete(item.id);
    if (result.success) {
      this.removeItemFromLists(item.id);
    } else {
      this.errorMsg.set(result.error ?? 'Error al eliminar');
    }
  }

  async onToggleActive(item: CatalogItem): Promise<void> {
    const result = await this.catalog.toggleActive(item.id, !item.active);
    if (result.success && result.data) {
      this.replaceItemInLists(result.data);
    }
  }

  // ── Helpers de listas locales ─────────────────────────────────────────────────

  private replaceItemInLists(updated: CatalogItem): void {
    if (updated.section_id) {
      this.sections.update(secs => secs.map(s =>
        s.id === updated.section_id
          ? { ...s, items: (s.items ?? []).map(i => i.id === updated.id ? updated : i) }
          : s
      ));
    } else {
      this.freeItems.update(items => items.map(i => i.id === updated.id ? updated : i));
    }
  }

  private insertItemInList(item: CatalogItem): void {
    if (item.section_id) {
      this.sections.update(secs => secs.map(s =>
        s.id === item.section_id
          ? { ...s, items: [...(s.items ?? []), item] }
          : s
      ));
    } else {
      this.freeItems.update(items => [...items, item]);
    }
  }

  private removeItemFromLists(id: string): void {
    this.freeItems.update(items => items.filter(i => i.id !== id));
    this.sections.update(secs => secs.map(s => ({
      ...s,
      items: (s.items ?? []).filter(i => i.id !== id),
    })));
  }

  // ── Formulario de sección ─────────────────────────────────────────────────────

  openCreateSection(): void {
    this.editingSection.set(null);
    this.sectionNameInput.set('');
    this.sectionError.set(null);
    this.showSectionForm.set(true);
  }

  openEditSection(section: CatalogSection): void {
    this.editingSection.set(section);
    this.sectionNameInput.set(section.name);
    this.sectionError.set(null);
    this.showSectionForm.set(true);
  }

  closeSectionForm(): void {
    this.showSectionForm.set(false);
    this.editingSection.set(null);
    this.sectionError.set(null);
  }

  async onSectionSubmit(): Promise<void> {
    const name = this.sectionNameInput().trim();
    if (!name) { this.sectionError.set('El nombre es obligatorio'); return; }

    const accountId = this.accountId();
    if (!accountId) return;

    this.sectionSaving.set(true);
    this.sectionError.set(null);

    const editing = this.editingSection();

    if (editing) {
      const result = await this.catalog.updateSection(editing.id, name);
      this.sectionSaving.set(false);
      if (!result.success) { this.sectionError.set(result.error ?? 'Error al guardar'); return; }
      if (result.data) {
        this.sections.update(secs => secs.map(s =>
          s.id === editing.id ? { ...s, name: result.data!.name } : s
        ));
      }
    } else {
      const position = this.sections().length;
      const result = await this.catalog.createSection(accountId, name, position);
      this.sectionSaving.set(false);
      if (!result.success) { this.sectionError.set(result.error ?? 'Error al crear'); return; }
      if (result.data) {
        this.sections.update(secs => [...secs, { ...result.data!, items: [] }]);
      }
    }

    this.successMsg.set(editing ? 'Sección actualizada' : 'Sección creada');
    setTimeout(() => this.successMsg.set(null), 2500);
    this.closeSectionForm();
  }

  async onDeleteSection(section: CatalogSection): Promise<void> {
    const itemCount = section.items?.length ?? 0;
    const msg = itemCount > 0
      ? `¿Eliminar la sección "${section.name}"? Los ${itemCount} producto(s) quedarán sin sección.`
      : `¿Eliminar la sección "${section.name}"?`;

    if (!confirm(msg)) return;

    const result = await this.catalog.deleteSection(section.id);
    if (result.success) {
      // Mover los productos de la sección al área libre
      const orphans = (section.items ?? []).map(i => ({ ...i, section_id: null }));
      this.freeItems.update(items => [...items, ...orphans]);
      this.sections.update(secs => secs.filter(s => s.id !== section.id));
    } else {
      this.errorMsg.set(result.error ?? 'Error al eliminar la sección');
    }
  }
}
