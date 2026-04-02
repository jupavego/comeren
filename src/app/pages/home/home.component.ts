import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Establecimiento } from '../../models/establecimiento';
import { EstablecimientosService } from '../../services/establecimientos.service';

interface SlideCarrusel {
  tipo: 'intro' | 'negocio';
  titulo?: string;
  descripcion?: string;
  botonPrincipal?: string;
  botonSecundario?: string;
  data?: Establecimiento;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  establecimientos: Establecimiento[] = [];
  establecimientosFiltrados: Establecimiento[] = [];
  destacados: Establecimiento[] = [];
  slides: SlideCarrusel[] = [];

  animandoListado = false;
  slideActual!: SlideCarrusel;
  slideAnterior!: SlideCarrusel;
  animando = false;

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
  indiceCarrusel = 0;

  private intervalId: any;
  private subscriptions = new Subscription();

  constructor(private establecimientosService: EstablecimientosService) {}

  get mostrarCarrusel(): boolean {
    return this.categoriaActiva === 'Todos' && !this.textoBusqueda.trim();
  }

  get mostrarAccesosRapidos(): boolean {
    return this.categoriaActiva === 'Todos' && !this.textoBusqueda.trim();
  }

  ngOnInit(): void {
    this.establecimientos = this.establecimientosService.obtenerTodos();
    this.establecimientosFiltrados = [...this.establecimientos];
    this.destacados = this.establecimientos.slice(0, 4);

    this.slides = [
      {
        tipo: 'intro',
        titulo: 'Sabores que se sienten locales',
        descripcion:
          'Explora negocios de comida en Girardota y encuentra una opción rica, cercana y confiable.',
        botonPrincipal: 'Explorar negocios',
        botonSecundario: 'Ver destacados'
      },
      ...this.destacados.map((negocio) => ({
        tipo: 'negocio' as const,
        data: negocio
      }))
    ];

    if (this.slides.length) {
      this.slideActual = this.slides[0];
      this.slideAnterior = this.slides[0];
    }

    this.intervalId = setInterval(() => {
      this.siguiente();
    }, 9000);

    this.subscriptions.add(
      this.establecimientosService.busqueda$.subscribe((texto) => {
        this.textoBusqueda = texto;
        this.aplicarFiltros();
        this.animarListado();
      })
    );

    this.subscriptions.add(
      this.establecimientosService.categoria$.subscribe((categoria) => {
        this.categoriaActiva = categoria;
        this.aplicarFiltros();
        this.animarListado();
      })
    );
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.subscriptions.unsubscribe();
  }

  animarListado(): void {
    this.animandoListado = false;

    requestAnimationFrame(() => {
      this.animandoListado = true;

      setTimeout(() => {
        this.animandoListado = false;
      }, 1050);
    });
  }

  obtenerFondo(slide: SlideCarrusel): string {
    if (slide.tipo === 'negocio') {
      const imagen = slide.data?.portada || slide.data?.imagen || '';
      return `url('${imagen}')`;
    }

    return 'linear-gradient(90deg, #2b120d 0%, #3a170f 45%, #1f0e0a 100%)';
  }

  cambiarSlide(nuevoIndice: number): void {
    if (!this.slides.length || nuevoIndice === this.indiceCarrusel) {
      return;
    }

    this.slideAnterior = this.slideActual;
    this.indiceCarrusel = nuevoIndice;
    this.slideActual = this.slides[nuevoIndice];
    this.animando = true;

    setTimeout(() => {
      this.animando = false;
    }, 1200);
  }

  irSlide(index: number): void {
    this.cambiarSlide(index);
  }

  anterior(): void {
    if (!this.slides.length || !this.mostrarCarrusel) {
      return;
    }

    const nuevo =
      (this.indiceCarrusel - 1 + this.slides.length) % this.slides.length;

    this.cambiarSlide(nuevo);
  }

  siguiente(): void {
    if (!this.slides.length || !this.mostrarCarrusel) {
      return;
    }

    const nuevo = (this.indiceCarrusel + 1) % this.slides.length;
    this.cambiarSlide(nuevo);
  }

  aplicarFiltros(): void {
    const texto = this.textoBusqueda.toLowerCase().trim();
    const hayBusqueda = texto.length > 0;

    this.establecimientosFiltrados = this.establecimientos.filter((item) => {
      const coincideTexto =
        item.nombre.toLowerCase().includes(texto) ||
        item.zona.toLowerCase().includes(texto) ||
        item.categoria.toLowerCase().includes(texto) ||
        item.descripcion.toLowerCase().includes(texto) ||
        (item.slogan?.toLowerCase().includes(texto) ?? false) ||
        (item.historia?.toLowerCase().includes(texto) ?? false);

      if (hayBusqueda) {
        return coincideTexto;
      }

      return (
        this.categoriaActiva === 'Todos' ||
        item.categoria === this.categoriaActiva
      );
    });
  }

  irAListado(): void {
    document.getElementById('listado-negocios')?.scrollIntoView({
      behavior: 'smooth'
    });
  }

  verDestacados(): void {
    document.getElementById('listado-negocios')?.scrollIntoView({
      behavior: 'smooth'
    });
  }
}