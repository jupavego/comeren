import {
  ChangeDetectionStrategy,
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

export interface CarouselSlideIntro {
  type: 'intro';
  background?: string;
  title: string;
  description?: string;
  primaryBtn?: string;
  secondaryBtn?: string;
  primaryAction?: () => void;
  secondaryAction?: () => void;
}

export interface CarouselSlideBusiness {
  type: 'business';
  background?: string;
  category?: string;
  title: string;
  subtitle?: string;
  linkUrl?: string;
  linkLabel?: string;
}

export interface CarouselSlideHero {
  type: 'hero';
  background?: string;
  eyebrow?: string;
  title: string;
  description?: string;
}

export type CarouselSlide =
  | CarouselSlideIntro
  | CarouselSlideBusiness
  | CarouselSlideHero;

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent implements OnInit, OnChanges, OnDestroy {

  @Input() slides: CarouselSlide[] = [];
  @Input() autoplayMs = 9000;
  @Input() minHeight = '440px';

  // ── Estado interno ──────────────────────────────────────────────────────────
  // displayedIndex: qué slide se muestra en pantalla (cambia en mitad de transición)
  // currentIndex:  qué dot está activo (sigue a displayedIndex)
  displayedIndex = signal(0);
  currentIndex   = signal(0);

  // Fase de la transición — controla las clases CSS que disparan los @keyframes
  phase = signal<'idle' | 'exit' | 'enter'>('idle');

  // El slide que se renderiza deriva de displayedIndex
  currentSlide = computed(() => this.slides[this.displayedIndex()] ?? null);

  private inTransition = false;
  private intervalId:  ReturnType<typeof setInterval> | null = null;
  private exitTimeout: ReturnType<typeof setTimeout> | null = null;
  private enterTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.startAutoplay(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slides'] && !changes['slides'].firstChange) {
      this.displayedIndex.set(0);
      this.currentIndex.set(0);
      this.phase.set('idle');
      this.inTransition = false;
      this.stopAutoplay();
      this.startAutoplay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    if (this.exitTimeout)  clearTimeout(this.exitTimeout);
    if (this.enterTimeout) clearTimeout(this.enterTimeout);
  }

  // ── Navegación ──────────────────────────────────────────────────────────────

  goToSlide(index: number): void {
    if (this.inTransition || !this.slides.length || index === this.displayedIndex()) return;
    this.inTransition = true;

    // Fase 1 — salida: el contenido actual se desvanece (220 ms)
    this.phase.set('exit');

    this.exitTimeout = setTimeout(() => {
      // Fase 2 — swap: mientras el contenido está invisible se cambia el slide
      // El fondo también cambia aquí, cubierto por la opacidad cero del contenido
      this.displayedIndex.set(index);
      this.currentIndex.set(index);
      this.phase.set('enter');

      // Fase 3 — entrada: el nuevo contenido aparece (320 ms)
      this.enterTimeout = setTimeout(() => {
        this.phase.set('idle');
        this.inTransition = false;
      }, 340);
    }, 230);
  }

  prev(): void {
    const len = this.slides.length;
    if (!len) return;
    this.goToSlide((this.displayedIndex() - 1 + len) % len);
  }

  next(): void {
    if (!this.slides.length) return;
    this.goToSlide((this.displayedIndex() + 1) % this.slides.length);
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
