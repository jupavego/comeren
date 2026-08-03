import { Component, input } from '@angular/core';

/**
 * Encabezado de sección reutilizable.
 * Uso:
 *   <app-section-header
 *     eyebrow="Directorio local"
 *     title="Negocios para descubrir"
 *     subtitle="Texto opcional debajo del título"
 *     align="left"          <!-- left | center | right — default: left -->
 *     tint="orange"         <!-- orange | violet — default: violet -->
 *     categoryPill="Restaurante"  <!-- opcional — píldora de categoría activa, esquina superior derecha -->
 *   />
 */
@Component({
  selector: 'app-section-header',
  standalone: true,
  template: `
    <div class="section-header section-header--{{ align() }} section-header--tint-{{ tint() }}">
      <div class="section-header__honeycomb" aria-hidden="true">
        <span class="section-header__hex" style="top:-20px;left:366px;opacity:.42"></span>
        <span class="section-header__hex" style="top:60px;left:366px;opacity:.31"></span>
        <span class="section-header__hex" style="top:140px;left:366px;opacity:.21"></span>
        <span class="section-header__hex" style="top:20px;left:295px;opacity:.34"></span>
        <span class="section-header__hex" style="top:100px;left:295px;opacity:.25"></span>
        <span class="section-header__hex" style="top:180px;left:295px;opacity:.17"></span>
        <span class="section-header__hex" style="top:-20px;left:224px;opacity:.25"></span>
        <span class="section-header__hex" style="top:60px;left:224px;opacity:.20"></span>
        <span class="section-header__hex" style="top:140px;left:224px;opacity:.13"></span>
        <span class="section-header__hex" style="top:20px;left:153px;opacity:.17"></span>
        <span class="section-header__hex" style="top:100px;left:153px;opacity:.13"></span>
        <span class="section-header__hex" style="top:180px;left:153px;opacity:.08"></span>
        <span class="section-header__hex" style="top:-20px;left:82px;opacity:.10"></span>
        <span class="section-header__hex" style="top:60px;left:82px;opacity:.07"></span>
        <span class="section-header__hex" style="top:140px;left:82px;opacity:.06"></span>
      </div>
      @if (categoryPill()) {
        <div class="section-header__cat-pill">
          <span class="section-header__cat-pill-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
            </svg>
          </span>
          <span>{{ categoryPill() }}</span>
        </div>
      }
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
      padding: 1.75rem 2rem;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, .7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);

      &--center { text-align: center; }
      &--right  { text-align: right; }
      &--left   { text-align: left; }

      // ── Tinte naranja ──────────────────────────────────────────────────────
      &--tint-orange {
        background: rgba(255, 247, 237, .6);
        box-shadow: 0 8px 26px rgba(224, 103, 43, .16);
        background-image: linear-gradient(135deg,
          rgba(249, 115, 22, .16) 0%,
          rgba(249, 115, 22, .04) 45%,
          rgba(249, 115, 22, .12) 100%
        );

        .section-header__eyebrow { color: #ea6c0a; }
        .section-header__hex     { background: #f97316; }
        .section-header__cat-pill        { border-color: rgba(249, 115, 22, .28); }
        .section-header__cat-pill-icon   { background: rgba(249, 115, 22, .16); color: #ea6c0a; }
        .section-header__cat-pill span   { color: #ea6c0a; }
      }

      // ── Tinte violeta (por defecto) ───────────────────────────────────────
      &--tint-violet {
        background: rgba(237, 233, 255, .6);
        box-shadow: 0 8px 26px rgba(94, 73, 214, .16);
        background-image: linear-gradient(135deg,
          rgba(94, 73, 214, .16) 0%,
          rgba(94, 73, 214, .04) 45%,
          rgba(94, 73, 214, .12) 100%
        );

        .section-header__eyebrow { color: var(--color-brand-primary, #5e49d6); }
        .section-header__hex     { background: var(--color-brand-primary, #5e49d6); }
        .section-header__cat-pill        { border-color: rgba(94, 73, 214, .28); }
        .section-header__cat-pill-icon   { background: rgba(94, 73, 214, .16); color: var(--color-brand-primary, #5e49d6); }
        .section-header__cat-pill span   { color: var(--color-brand-primary, #5e49d6); }
      }

      // ── Panal hexagonal — esquina superior derecha, se difumina hacia el centro ──
      &__honeycomb {
        position: absolute;
        top: 0;
        right: 0;
        width: 460px;
        height: 260px;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      &__hex {
        position: absolute;
        width: 94px;
        height: 80px;
        clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
      }

      // ── Píldora de categoría activa — esquina superior derecha ────────────
      &__cat-pill {
        position: absolute;
        top: 1.5rem;
        right: 1.75rem;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, .55);
        border: 1px solid rgba(255, 255, 255, .7);
        backdrop-filter: blur(12px) saturate(1.4);
        -webkit-backdrop-filter: blur(12px) saturate(1.4);
        border-radius: var(--radius-xl, 999px);
        padding: 5px 12px 5px 6px;
      }

      &__cat-pill-icon {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      &__cat-pill span {
        font-family: var(--font-heading);
        font-size: 0.6875rem;
        font-weight: 600;
        letter-spacing: .03em;
      }

      &__eyebrow {
        position: relative;
        z-index: 1;
        font-size: 0.8125rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0 0 0.5rem;
      }

      &__title {
        position: relative;
        z-index: 1;
        font-family: var(--font-heading);
        font-size: clamp(1.5rem, 3vw, 2.25rem);
        font-weight: 700;
        color: var(--color-text-primary, #2c241d);
        margin: 0 0 0.5rem;
        line-height: 1.2;
        max-width: 640px;
      }

      &__subtitle {
        position: relative;
        z-index: 1;
        font-size: 1rem;
        color: var(--color-text-secondary, #6b5e54);
        margin: 0;
        line-height: 1.6;
        max-width: 560px;
      }

      &--center &__subtitle { margin-inline: auto; }
      &--center &__honeycomb { display: none; }
    }
  `],
})
export class SectionHeaderComponent {
  eyebrow  = input<string>('');
  title    = input.required<string>();
  subtitle = input<string>('');
  align    = input<'left' | 'center' | 'right'>('left');
  tint     = input<'orange' | 'violet'>('violet');
  categoryPill = input<string>('');
}
