import { CommonModule } from '@angular/common';
import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DirectoryStateService } from '../../../features/directory/services/directory-state.service';
import { SessionService } from '../../../core/services/session.service';
import { UserWidgetComponent } from '../user-widget/user-widget.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UserWidgetComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly state   = inject(DirectoryStateService);
  readonly session = inject(SessionService);
  private  router  = inject(Router);

  searchText  = '';
  menuAbierto = signal(false);
  hidden      = signal(false);

  private lastScrollY  = 0;
  private scrollUpFrom = 0; // punto desde donde empezó a subir

  constructor() {
    // Sincroniza el input con el estado global: cuando el directorio
    // limpia filtros al destruirse, el campo de búsqueda también se vacía.
    effect(() => {
      this.searchText = this.state.search();
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const currentY  = window.scrollY;
    const topZone   = 72;   // siempre visible en la zona superior
    const showDelta = 60;   // cuántos px hacia arriba antes de mostrarse

    if (currentY < topZone) {
      // En la zona superior — siempre visible
      this.hidden.set(false);
      this.scrollUpFrom = 0;
    } else if (currentY > this.lastScrollY) {
      // Bajando → ocultar y resetear el punto de referencia de subida
      this.hidden.set(true);
      this.menuAbierto.set(false);
      this.scrollUpFrom = currentY;
    } else if (this.scrollUpFrom - currentY >= showDelta) {
      // Subió al menos showDelta px de forma intencional → mostrar
      this.hidden.set(false);
    }

    this.lastScrollY = currentY;
  }

  toggleMenu(): void {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.topbar')) {
      this.cerrarMenu();
    }
  }

  irInicio(): void {
    this.cerrarMenu();
    this.state.clearFilters();
  }

  onSearch(): void {
    if (this.searchText.trim() === '') {
      this.state.clearFilters();
    } else {
      this.state.setSearch(this.searchText);
    }
    this.cerrarMenu();
    // Si no estamos en el directorio, navegar antes de filtrar
    if (!this.isOnDirectory()) {
      this.router.navigate(['/']);
    }
  }

  onSearchInput(): void {
    if (this.searchText.trim() === '') {
      this.state.clearFilters();
    } else {
      this.state.setSearch(this.searchText);
    }
  }

  selectCategory(category: string): void {
    this.state.setCategory(category as any);
    this.searchText = '';
    this.cerrarMenu();
    // Si no estamos en el directorio, navegar al home con el filtro aplicado
    if (!this.isOnDirectory()) {
      this.router.navigate(['/']);
    }
  }

  // Verdadero cuando la URL actual es el directorio (home)
  isOnDirectory(): boolean {
    return this.router.url === '/' || this.router.url.startsWith('/?');
  }
}