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
      margin-bottom: 2rem;

      &--center { text-align: center; }
      &--right  { text-align: right; }
      &--left   { text-align: left; }

      &__eyebrow {
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-brand-primary, #5e49d6);
        margin: 0 0 0.5rem;
      }

      &__title {
        font-size: clamp(1.5rem, 3vw, 2.25rem);
        font-weight: 700;
        color: var(--color-text-primary, #2c241d);
        margin: 0 0 0.5rem;
        line-height: 1.2;
      }

      &__subtitle {
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
