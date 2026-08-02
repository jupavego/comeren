import { Component, input } from '@angular/core';

/**
 * Encabezado de sección reutilizable.
 * Uso:
 *   <app-section-header
 *     eyebrow="Directorio local"
 *     title="Negocios para descubrir"
 *     subtitle="Texto opcional debajo del título"
 *     align="left"          <!-- left | center | right — default: left -->
 *   />
 */
@Component({
  selector: 'app-section-header',
  standalone: true,
  template: `
    <div class="section-header section-header--{{ align() }}">
      <div class="section-header__hex section-header__hex--1" aria-hidden="true"></div>
      <div class="section-header__hex section-header__hex--2" aria-hidden="true"></div>
      @if (eyebrow()) {
        <p class="section-header__eyebrow">{{ eyebrow() }}</p>
      }
      <h2 class="section-header__title">{{ title() }}</h2>
      @if (subtitle()) {
        <p class="section-header__subtitle">{{ subtitle() }}</p>
      }
    </div>
  `,
  styles: [`
    .section-header {
      position: relative;
      overflow: hidden;
      margin-bottom: 2rem;
      padding: 1.5rem 1.75rem;
      border-radius: 20px;
      background: #fff;
      border: 1px solid var(--color-border-tertiary, #ede9e2);
      box-shadow: 0 4px 20px rgba(30, 20, 60, 0.06);
      // Franja de degradado cálido, muy sutil, difuminada hacia el centro —
      // misma idea que la plantilla de exploración, aquí mucho más discreta.
      background-image: linear-gradient(120deg,
        rgba(249, 115, 22, 0) 55%,
        rgba(249, 115, 22, .05) 78%,
        rgba(249, 115, 22, .10) 100%
      );

      &--center { text-align: center; }
      &--right  { text-align: right; }
      &--left   { text-align: left; }

      &__hex {
        position: absolute;
        width: 90px;
        height: 78px;
        clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
        pointer-events: none;
      }
      &__hex--1 {
        top: -22px; right: -18px;
        background: rgba(249, 115, 22, .10);
      }
      &__hex--2 {
        top: 30px; right: 46px;
        width: 46px; height: 40px;
        background: rgba(94, 73, 214, .07);
      }

      &__eyebrow {
        position: relative;
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-brand-primary, #5e49d6);
        margin: 0 0 0.5rem;
      }

      &__title {
        position: relative;
        font-size: clamp(1.5rem, 3vw, 2.25rem);
        font-weight: 700;
        color: var(--color-text-primary, #2c241d);
        margin: 0 0 0.5rem;
        line-height: 1.2;
      }

      &__subtitle {
        position: relative;
        font-size: 1rem;
        color: var(--color-text-secondary, #6b5e54);
        margin: 0;
        line-height: 1.6;
        max-width: 560px;
      }

      &--center &__subtitle { margin-inline: auto; }
    }
  `],
})
export class SectionHeaderComponent {
  eyebrow  = input<string>('');
  title    = input.required<string>();
  subtitle = input<string>('');
  align    = input<'left' | 'center' | 'right'>('left');
}
