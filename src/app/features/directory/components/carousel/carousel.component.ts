import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// ── Tipos de slide públicos ───────────────────────────────────────────────────
// El padre arma los slides; el carrusel solo los anima y navega.

export interface CarouselSlideIntro {
  type: 'intro';
  background?: string;        // CSS: url(...) o gradient
  title: string;
  description?: string;
  primaryBtn?: string;
  secondaryBtn?: string;
  primaryAction?: () => void;
  secondaryAction?: () => void;
}

export interface CarouselSlideBusiness {
  type: 'business';
  background?: string;        // CSS: url(...) o gradient
  category?: string;
  title: string;              // nombre del negocio
  subtitle?: string;          // slogan
  linkUrl?: string;           // routerLink destino
  linkLabel?: string;
}

export interface CarouselSlideHero {
  type: 'hero';
  background?: string;
  eyebrow?: string;           // texto pequeño encima del título (ej: categoría)
  title: string;
  description?: string;
}

export type CarouselSlide =
  | CarouselSlideIntro
  | CarouselSlideBusiness
  | CarouselSlideHero;

// ── Componente ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.scss',
})
export class CarouselComponent implements OnInit, OnChanges, OnDestroy {

  /** Slides ya construidos por el padre */
  @Input() slides: CarouselSlide[] = [];

  /** Intervalo del autoplay en ms. 0 = desactivado */
  @Input() autoplayMs = 9000;

  /** Altura mínima del carrusel */
  @Input() minHeight = '440px';

  // ── Estado interno ──────────────────────────────────────────────────────────
  currentIndex = signal(0);
  // currentSlide se deriva — una sola fuente de verdad
  currentSlide = computed(() => this.slides[this.currentIndex()] ?? null);
  animating    = signal(false);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slides'] && !changes['slides'].firstChange) {
      this.currentIndex.set(0);
      this.stopAutoplay();
      this.startAutoplay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  // ── Navegación ──────────────────────────────────────────────────────────────

  goToSlide(index: number): void {
    if (!this.slides.length || index === this.currentIndex()) return;
    this.currentIndex.set(index);
    this.animating.set(true);
    setTimeout(() => this.animating.set(false), 500);
  }

  prev(): void {
    const len = this.slides.length;
    if (!len) return;
    this.goToSlide((this.currentIndex() - 1 + len) % len);
  }

  next(): void {
    if (!this.slides.length) return;
    this.goToSlide((this.currentIndex() + 1) % this.slides.length);
  }

  // ── Autoplay ─────────────────────────────────────────────────────────────────

  startAutoplay(): void {
    if (!this.autoplayMs) return;
    this.intervalId = setInterval(() => this.next(), this.autoplayMs);
  }

  stopAutoplay(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  slideBackground(slide: CarouselSlide): string {
    return slide.background ?? 'linear-gradient(90deg, #2b120d 0%, #3a170f 45%, #1f0e0a 100%)';
  }
}