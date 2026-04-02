import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { EstablecimientosService } from '../../../services/establecimientos.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  categorias: string[] = [
    'Todos',
    'Restaurante',
    'Comida rápida',
    'Panadería',
    'Cafetería',
    'Heladería',
    'Asadero',
    'Frutería',
    'Postres'
  ];

  categoriaActiva = 'Todos';
  textoBusqueda = '';
  private subscriptions = new Subscription();

  constructor(private establecimientosService: EstablecimientosService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.establecimientosService.busqueda$.subscribe((texto) => {
        this.textoBusqueda = texto;
      })
    );

    this.subscriptions.add(
      this.establecimientosService.categoria$.subscribe((categoria) => {
        this.categoriaActiva = categoria;
      })
    );
  }

  onBuscar(): void {
    this.establecimientosService.setBusqueda(this.textoBusqueda);
  }

  seleccionarCategoria(categoria: string): void {
    this.categoriaActiva = categoria;
    this.establecimientosService.setCategoria(categoria);

    if (categoria === 'Todos') {
      this.textoBusqueda = '';
      this.establecimientosService.setBusqueda('');
    }
  }
}