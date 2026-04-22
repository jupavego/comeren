import { Component, computed, input } from '@angular/core';
import { BusinessHours, isBusinessOpen } from '../../../features/directory/models/account.model';

@Component({
  selector: 'app-business-status-badge',
  standalone: true,
  template: `
    <span class="status-badge" [class.status-badge--open]="isOpen()">
      <span class="status-badge__dot"></span>
      {{ isOpen() ? 'Abierto' : 'Cerrado' }}
    </span>
  `,
  styles: [`
    :host { display: contents; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px 4px 7px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      white-space: nowrap;
      line-height: 1;

      // Cerrado — rojo translúcido
      background: rgba(220, 38, 38, 0.68);
      color: #fff;

      // Abierto — verde translúcido
      &--open {
        background: rgba(22, 163, 74, 0.72);
        color: #fff;
      }
    }

    .status-badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
  `],
})
export class BusinessStatusBadgeComponent {
  /** Pasa el schedule_json del negocio; si es null/undefined se muestra como Cerrado */
  scheduleJson = input<BusinessHours | null | undefined>(null);

  protected readonly isOpen = computed(() => isBusinessOpen(this.scheduleJson()));
}
