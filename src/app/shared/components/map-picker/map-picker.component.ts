import {
  Component,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule, GoogleMap, MapMarker],
  template: `
    <div class="map-picker">
      <p class="map-picker__hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Arrastra el marcador o haz clic en el mapa para posicionar tu negocio
      </p>
      @if (mapsReady()) {
        <google-map
          class="map-picker__map"
          height="320px"
          width="100%"
          [center]="center()"
          [zoom]="DEFAULT_ZOOM"
          [options]="mapOptions"
          (mapClick)="onMapClick($event)"
        >
          <map-marker
            [position]="center()"
            [options]="markerOptions"
            (mapDragend)="onMarkerDragend($event)"
          />
        </google-map>
      } @else {
        <div class="map-picker__map map-picker__map--loading"></div>
      }
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
        display: block;
        height: 320px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--color-border-tertiary);

        &--loading {
          background: var(--color-bg-secondary, #f1f0f8);
        }
      }

      &__coords {
        font-size: 0.75rem;
        color: var(--color-text-tertiary);
        margin: 0;
      }
    }
  `],
})
export class MapPickerComponent implements OnChanges {
  /** Latitud inicial (si ya tiene ubicación guardada) */
  initialLat = input<number | null>(null);
  /** Longitud inicial */
  initialLng = input<number | null>(null);

  /** Emite cada vez que el usuario mueve el marcador */
  locationChange = output<{ lat: number; lng: number }>();

  private readonly loader = inject(GoogleMapsLoaderService);

  readonly mapsReady = signal(false);

  // Centro por defecto: Girardota, Antioquia
  private readonly DEFAULT_LAT = 6.3773;
  private readonly DEFAULT_LNG = -75.4465;
  readonly DEFAULT_ZOOM = 15;

  lat = signal<number | null>(null);
  lng = signal<number | null>(null);

  readonly center = computed<google.maps.LatLngLiteral>(() => ({
    lat: this.lat() ?? this.initialLat() ?? this.DEFAULT_LAT,
    lng: this.lng() ?? this.initialLng() ?? this.DEFAULT_LNG,
  }));

  readonly mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    streetViewControl: false,
    mapTypeControl: false,
  };

  readonly markerOptions: google.maps.MarkerOptions = {
    draggable: true,
  };

  constructor() {
    this.loader.load().then(() => this.mapsReady.set(true));

    if (this.initialLat() && this.initialLng()) {
      this.lat.set(this.initialLat());
      this.lng.set(this.initialLng());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialLat'] || changes['initialLng']) {
      const lat = this.initialLat();
      const lng = this.initialLng();
      if (lat != null && lng != null) {
        this.lat.set(lat);
        this.lng.set(lng);
      }
    }
  }

  onMarkerDragend(event: google.maps.MapMouseEvent): void {
    const pos = event.latLng;
    if (!pos) return;
    this.setPosition(pos.lat(), pos.lng());
  }

  onMapClick(event: google.maps.MapMouseEvent): void {
    const pos = event.latLng;
    if (!pos) return;
    this.setPosition(pos.lat(), pos.lng());
  }

  private setPosition(lat: number, lng: number): void {
    this.lat.set(lat);
    this.lng.set(lng);
    this.locationChange.emit({ lat, lng });
  }
}
