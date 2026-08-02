import { Component, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';
import { GoogleMap, MapAdvancedMarker } from '@angular/google-maps';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';

// ViewEncapsulation.None es necesario porque el contenido del Advanced Marker
// es un nodo DOM que Google Maps inserta fuera del árbol de Angular, por lo que
// los estilos con atributos de encapsulación (_ngcontent-*) no los alcanzarían.
@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [GoogleMap, MapAdvancedMarker],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="map-view-wrap">
      @if (mapsReady()) {
        <google-map
          class="map-view"
          height="320px"
          width="100%"
          [center]="center()"
          [zoom]="16"
          [mapId]="mapId"
          [options]="mapOptions"
        >
          <map-advanced-marker
            [position]="center()"
            [title]="businessName() || 'Negocio'"
            [content]="markerContent()"
            [options]="markerOptions"
          />
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

    /* ── Marcador circular — mismo look que el mapa comunitario del home ── */
    .mv-mk { display: flex; flex-direction: column; align-items: center; }

    .mv-mk__circle {
      width: 46px; height: 46px;
      border-radius: 50%;
      background: #5c42df;
      border: 3px solid #fff;
      box-shadow: 0 4px 14px rgba(92, 66, 223, 0.45);
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .mv-mk__circle img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .mv-mk__circle span {
      font-size: 1.2rem; font-weight: 800; color: #fff;
      line-height: 1;
    }
    .mv-mk__tail {
      width: 0; height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 11px solid #5c42df;
      margin-top: -2px;
      filter: drop-shadow(0 2px 2px rgba(92,66,223,0.35));
    }
  `],
})
export class MapViewComponent {
  lat          = input.required<number>();
  lng          = input.required<number>();
  businessName = input<string>('');
  logoUrl      = input<string | null>(null);

  private readonly loader = inject(GoogleMapsLoaderService);

  readonly mapsReady = signal(false);

  /** Map ID de demostración de Google, requerido para usar Advanced Markers. */
  readonly mapId = 'DEMO_MAP_ID';

  readonly mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    scrollwheel: false,
    streetViewControl: false,
    mapTypeControl: false,
  };

  readonly markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
    gmpClickable: false,
  };

  readonly center = computed<google.maps.LatLngLiteral>(() => ({ lat: this.lat(), lng: this.lng() }));

  readonly markerContent = computed<HTMLElement>(() => {
    const wrap = document.createElement('div');
    wrap.className = 'mv-mk';

    const circle = document.createElement('div');
    circle.className = 'mv-mk__circle';

    const logo = this.logoUrl();
    if (logo) {
      const img = document.createElement('img');
      img.src = logo;
      img.alt = '';
      circle.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = (this.businessName() || 'N').charAt(0).toUpperCase();
      circle.appendChild(span);
    }

    const tail = document.createElement('div');
    tail.className = 'mv-mk__tail';

    wrap.append(circle, tail);
    return wrap;
  });

  get mapsUrl(): string {
    return `https://www.google.com/maps?q=${this.lat()},${this.lng()}`;
  }

  constructor() {
    this.loader.load().then(() => this.mapsReady.set(true));
  }
}
