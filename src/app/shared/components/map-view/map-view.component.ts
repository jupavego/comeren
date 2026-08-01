import { Component, computed, inject, input, signal } from '@angular/core';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [GoogleMap, MapMarker],
  template: `
    <div class="map-view-wrap">
      @if (mapsReady()) {
        <google-map
          class="map-view"
          height="320px"
          width="100%"
          [center]="center()"
          [zoom]="16"
          [options]="mapOptions"
        >
          <map-marker [position]="center()" [title]="businessName() || 'Negocio'" />
        </google-map>
      } @else {
        <div class="map-view map-view--loading"></div>
      }
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
      display: block;
      height: 320px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--color-border-tertiary);
    }
    .map-view--loading {
      background: var(--color-bg-secondary, #f1f0f8);
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
export class MapViewComponent {
  lat          = input.required<number>();
  lng          = input.required<number>();
  businessName = input<string>('');

  private readonly loader = inject(GoogleMapsLoaderService);

  readonly mapsReady = signal(false);

  readonly mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    scrollwheel: false,
    streetViewControl: false,
    mapTypeControl: false,
  };

  readonly center = computed<google.maps.LatLngLiteral>(() => ({ lat: this.lat(), lng: this.lng() }));

  get mapsUrl(): string {
    return `https://www.google.com/maps?q=${this.lat()},${this.lng()}`;
  }

  constructor() {
    this.loader.load().then(() => this.mapsReady.set(true));
  }
}
