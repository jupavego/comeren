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

  private lastScrollY = 0;

  constructor() {
    // Sincroniza el input con el estado global: cuando el directorio
    // limpia filtros al destruirse, el campo de búsqueda también se vacía.
    effect(() => {
      this.searchText = this.state.search();
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const currentY = window.scrollY;
    const threshold = 72; // altura aprox. de la barra superior

    if (currentY < threshold) {
      // Siempre visible en la zona superior de la página
      this.hidden.set(false);
    } else if (currentY > this.lastScrollY) {
      // Bajando → ocultar
      this.hidden.set(true);
      this.menuAbierto.set(false);
    } else {
      // Subiendo → mostrar
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

  onSearch(): void {
    this.state.setSearch(this.searchText);
    this.cerrarMenu();
    // Si no estamos en el directorio, navegar antes de filtrar
    if (!this.isOnDirectory()) {
      this.router.navigate(['/']);
    }
  }

  onSearchInput(): void {
    this.state.setSearch(this.searchText);
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