import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

// Fix para los íconos de Leaflet en bundlers (Webpack/esbuild)
const iconUrl     = 'assets/marker-icon.png';
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const shadowUrl   = 'assets/marker-shadow.png';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-picker">
      <p class="map-picker__hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Arrastra el marcador o haz clic en el mapa para posicionar tu negocio
      </p>
      <div id="map-picker-container" class="map-picker__map"></div>
      @if (lat() && lng()) {
        <p class="map-picker__coords">
          📍 {{ lat()!.toFixed(6) }}, {{ lng()!.toFixed(6) }}
        </p>
      }
    </div>
  `,
  styles: [`
    .map-picker {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      &__hint {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.8125rem;
        color: var(--color-text-secondary);
        margin: 0;
      }

      &__map {
        height: 320px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--color-border-tertiary);
        z-index: 0;
      }

      &__coords {
        font-size: 0.75rem;
        color: var(--color-text-tertiary);
        margin: 0;
      }
    }
  `],
})
export class MapPickerComponent implements AfterViewInit, OnDestroy, OnChanges {
  /** Latitud inicial (si ya tiene ubicación guardada) */
  initialLat = input<number | null>(null);
  /** Longitud inicial */
  initialLng = input<number | null>(null);

  /** Emite cada vez que el usuario mueve el marcador */
  locationChange = output<{ lat: number; lng: number }>();

  lat = signal<number | null>(null);
  lng = signal<number | null>(null);

  private map!: L.Map;
  private marker!: L.Marker;

  // Centro por defecto: Girardota, Antioquia
  private readonly DEFAULT_LAT = 6.3773;
  private readonly DEFAULT_LNG = -75.4465;
  private readonly DEFAULT_ZOOM = 15;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['initialLat'] || changes['initialLng']) && this.map) {
      const lat = this.initialLat() ?? this.DEFAULT_LAT;
      const lng = this.initialLng() ?? this.DEFAULT_LNG;
      this.marker.setLatLng([lat, lng]);
      this.map.setView([lat, lng], this.DEFAULT_ZOOM);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    const lat = this.initialLat() ?? this.DEFAULT_LAT;
    const lng = this.initialLng() ?? this.DEFAULT_LNG;

    this.map = L.map('map-picker-container', { zoomControl: true }).setView(
      [lat, lng],
      this.DEFAULT_ZOOM
    );

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

    this.marker = L.marker([lat, lng], { draggable: true, icon })
      .addTo(this.map)
      .bindPopup('📍 Tu negocio')
      .openPopup();

    // Guardar posición inicial si ya tiene coordenadas
    if (this.initialLat() && this.initialLng()) {
      this.lat.set(lat);
      this.lng.set(lng);
    }

    // Drag del marcador
    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      this.lat.set(pos.lat);
      this.lng.set(pos.lng);
      this.locationChange.emit({ lat: pos.lat, lng: pos.lng });
    });

    // Clic en el mapa mueve el marcador
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker.setLatLng(e.latlng);
      this.lat.set(e.latlng.lat);
      this.lng.set(e.latlng.lng);
      this.locationChange.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }
}
