import {
  Component,
  AfterViewInit,
  OnDestroy,
  input,
} from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-view',
  standalone: true,
  template: `
    <div class="map-view-wrap">
      <div id="map-view-{{ mapId }}" class="map-view"></div>
      <a [href]="mapsUrl" target="_blank" rel="noopener noreferrer" class="map-gmaps-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             width="16" height="16">
          <path d="M12 21s-6-5.2-6-10a6 6 0 0112 0c0 4.8-6 10-6 10z"/>
          <circle cx="12" cy="11" r="2.5"/>
        </svg>
        Ver en Google Maps
      </a>
    </div>
  `,
  styles: [`
    .map-view-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .map-view {
      height: 320px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--color-border-tertiary);
      z-index: 0;
    }
    .map-gmaps-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      align-self: flex-end;
      padding: 0.45rem 1rem;
      border-radius: 8px;
      background: #fff;
      border: 1.5px solid #d0cedd;
      color: #1a73e8;
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.18s, border-color 0.18s, box-shadow 0.18s;

      &:hover {
        background: #e8f0fe;
        border-color: #1a73e8;
        box-shadow: 0 2px 8px rgba(26, 115, 232, 0.18);
      }

      svg { flex-shrink: 0; stroke: #1a73e8; }
    }
  `],
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  lat          = input.required<number>();
  lng          = input.required<number>();
  businessName = input<string>('');

  // ID único por instancia para evitar colisión si hay varios mapas en la página
  readonly mapId = Math.random().toString(36).slice(2, 8);

  get mapsUrl(): string {
    return `https://www.google.com/maps?q=${this.lat()},${this.lng()}`;
  }

  private map!: L.Map;

  ngAfterViewInit(): void {
    this.map = L.map(`map-view-${this.mapId}`, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([this.lat(), this.lng()], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize:    [25, 41],
      iconAnchor:  [12, 41],
      popupAnchor: [1, -34],
      shadowSize:  [41, 41],
    });

    L.marker([this.lat(), this.lng()], { icon })
      .addTo(this.map)
      .bindPopup(`📍 ${this.businessName() || 'Negocio'}`)
      .openPopup();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
