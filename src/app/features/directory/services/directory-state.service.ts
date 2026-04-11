import { Injectable, computed, signal } from '@angular/core';
import { DIRECTORY_CATEGORIES, DirectoryCategory } from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class DirectoryStateService {

  // Signals de estado de UI
  private _search   = signal<string>('');
  private _category = signal<DirectoryCategory>('Todos');

  // Públicos de solo lectura
  readonly search   = this._search.asReadonly();
  readonly category = this._category.asReadonly();

  // Computed: ¿hay algún filtro activo?
  readonly hasActiveFilter = computed(() =>
    this._search().trim().length > 0 || this._category() !== 'Todos'
  );

  // Computed: ¿mostrar carrusel? Solo cuando no hay filtros
  readonly showCarousel = computed(() => !this.hasActiveFilter());

  readonly categories = DIRECTORY_CATEGORIES;

  setSearch(text: string): void {
    this._search.set(text);
  }

  setCategory(category: DirectoryCategory): void {
    this._category.set(category);
    // Al seleccionar categoría limpia la búsqueda
    if (category !== 'Todos') {
      this._search.set('');
    }
  }

  clearFilters(): void {
    this._search.set('');
    this._category.set('Todos');
  }
}