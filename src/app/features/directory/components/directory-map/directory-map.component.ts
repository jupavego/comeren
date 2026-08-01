import {
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GoogleMap, MapAdvancedMarker, MapInfoWindow } from '@angular/google-maps';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';
import { Account } from '../../models/account.model';

// ViewEncapsulation.None es necesario porque el contenido de los Advanced Markers
// es un nodo DOM que Google Maps inserta fuera del árbol de Angular, por lo que
// los estilos con atributos de encapsulación (_ngcontent-*) no los alcanzarían.
@Component({
  selector: 'app-directory-map',
  standalone: true,
  imports: [RouterLink, GoogleMap, MapAdvancedMarker, MapInfoWindow],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dir-map-container">
      @if (mapsReady()) {
        <google-map
          class="dir-map"
          height="480px"
          width="100%"
          [center]="center()"
          [zoom]="zoom()"
          [mapId]="mapId"
          [options]="mapOptions"
        >
          @for (m of markers(); track m.account.id) {
            @let a = m.account;
            <map-advanced-marker
              #marker="mapAdvancedMarker"
              [position]="{ lat: a.latitude!, lng: a.longitude! }"
              [title]="a.name"
              [content]="m.content"
              [options]="markerOptions"
              (markerInitialized)="wireHover($event, a.id, marker, info)"
            />
            <map-info-window #info="mapInfoWindow" [options]="infoWindowOptions">
              <a
                class="dmp-card"
                [routerLink]="['/negocio', a.id]"
                (mouseenter)="cancelClose(a.id)"
                (mouseleave)="scheduleClose(a.id, info)"
              >
                @if (a.logo_url) {
                  <img class="dmp-logo" [src]="a.logo_url" [alt]="a.name" />
                } @else {
                  <div class="dmp-logo-placeholder">{{ a.name.charAt(0).toUpperCase() }}</div>
                }
                <div class="dmp-body">
                  @if (a.category) {
                    <span class="dmp-cat">{{ a.category }}</span>
                  }
                  <div class="dmp-name">{{ a.name }}</div>
                  @if (a.address) {
                    <div class="dmp-addr">{{ a.address }}{{ a.zone ? ' · ' + a.zone : '' }}</div>
                  }
                  <span class="dmp-cta">
                    Ver micrositio
                    <svg viewBox="0 0 16 16" fill="none" stroke="#5c42df" stroke-width="2.2"
                         stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                      <path d="M3 8h10M9 4l4 4-4 4"/>
                    </svg>
                  </span>
                </div>
              </a>
            </map-info-window>
          }
        </google-map>
      } @else {
        <div class="dir-map dir-map--loading"></div>
      }
    </div>
  `,
  styles: [`
    /* ── Contenedor del mapa ─────────────────────────────────────────────── */
    .dir-map-container {
      border-radius: 20px;
      border: 1px solid #e5e3f0;
      box-shadow: 0 4px 32px rgba(92, 66, 223, 0.10), 0 1px 4px rgba(0,0,0,0.06);
    }
    .dir-map { display: block; height: 480px; border-radius: 20px; overflow: hidden; }
    .dir-map--loading { background: #f1f0f8; }

    /* ── Marcador personalizado (Advanced Marker content) ───────────────── */
    .dir-mk { display: flex; flex-direction: column; align-items: center; }

    .dir-mk__circle {
      width: 46px; height: 46px;
      border-radius: 50%;
      background: #5c42df;
      border: 3px solid #fff;
      box-shadow: 0 4px 14px rgba(92, 66, 223, 0.45);
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .dir-mk:hover .dir-mk__circle {
      transform: scale(1.12);
      box-shadow: 0 6px 20px rgba(92, 66, 223, 0.55);
    }
    .dir-mk__circle img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .dir-mk__circle span {
      font-size: 1.2rem; font-weight: 800; color: #fff;
      line-height: 1;
    }
    .dir-mk__tail {
      width: 0; height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 11px solid #5c42df;
      margin-top: -2px;
      filter: drop-shadow(0 2px 2px rgba(92,66,223,0.35));
    }

    /* ── Info window — wrapper de Google Maps ───────────────────────────── */
    .gm-style-iw-c { padding: 0 !important; border-radius: 16px !important; overflow: hidden !important; }
    .gm-style-iw-d { overflow: hidden !important; }
    .gm-style-iw-tc { display: none !important; }

    /* ── Info window — contenido interno ────────────────────────────────── */
    .dmp-card {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 14px 16px;
      text-decoration: none;
      color: inherit;
      min-width: 215px;
      max-width: 272px;
      background: #fff;
      transition: background 0.15s;
    }
    .dmp-card:hover { background: #f8f6ff; }

    .dmp-logo {
      width: 50px; height: 50px;
      border-radius: 10px;
      object-fit: cover;
      border: 1.5px solid #ede9f8;
      flex-shrink: 0;
    }
    .dmp-logo-placeholder {
      width: 50px; height: 50px;
      border-radius: 10px;
      background: linear-gradient(135deg, #5c42df, #7c64e8);
      color: #fff;
      font-size: 1.45rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dmp-body { flex: 1; min-width: 0; }

    .dmp-cat {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #5c42df;
      background: rgba(92, 66, 223, 0.10);
      padding: 2px 8px;
      border-radius: 999px;
      margin-bottom: 5px;
    }
    .dmp-name {
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 3px;
    }
    .dmp-addr {
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.35;
      margin-bottom: 9px;
    }
    .dmp-cta {
      font-size: 0.75rem;
      font-weight: 700;
      color: #5c42df;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .dmp-cta svg { flex-shrink: 0; }
  `],
})
export class DirectoryMapComponent {
  accounts = input.required<Account[]>();

  private readonly loader = inject(GoogleMapsLoaderService);

  readonly mapsReady = signal(false);

  /** Map ID de demostración de Google — reemplazar por uno propio (Cloud Console → Map Management) para personalizar estilos. */
  readonly mapId = 'DEMO_MAP_ID';

  readonly mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    scrollwheel: false,
    streetViewControl: false,
    mapTypeControl: false,
  };

  // Sin esto, AdvancedMarkerElement no dispara click/hover — los eventos pasan de largo hacia el mapa.
  readonly markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
    gmpClickable: true,
  };

  readonly infoWindowOptions: google.maps.InfoWindowOptions = {
    disableAutoPan: false,
    headerDisabled: true,
  };

  readonly accountsWithLocation = computed(() =>
    this.accounts().filter(a => a.latitude != null && a.longitude != null)
  );

  readonly center = computed<google.maps.LatLngLiteral>(() => {
    const accs = this.accountsWithLocation();
    if (!accs.length) return { lat: 6.3773, lng: -75.4465 };
    return {
      lat: accs.reduce((s, a) => s + a.latitude!, 0) / accs.length,
      lng: accs.reduce((s, a) => s + a.longitude!, 0) / accs.length,
    };
  });

  readonly zoom = computed(() => (this.accountsWithLocation().length === 1 ? 16 : 15));

  readonly markers = computed(() =>
    this.accountsWithLocation().map(account => ({
      account,
      content: this.buildMarkerContent(account),
    }))
  );

  constructor() {
    this.loader.load().then(() => this.mapsReady.set(true));
  }

  // Da tiempo a mover el mouse del marcador hacia la tarjeta sin que se cierre de golpe.
  private readonly closeTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // AdvancedMarkerElement no dispara mouseover/mouseout por el sistema de eventos de Google
  // (solo mousemove, mousedown, click, etc.) — hay que engancharse directo al elemento real del DOM.
  wireHover(
    rawMarker: google.maps.marker.AdvancedMarkerElement,
    accountId: string,
    marker: MapAdvancedMarker,
    info: MapInfoWindow
  ): void {
    rawMarker.addEventListener('mouseenter', () => {
      this.cancelClose(accountId);
      info.open(marker);
    });
    rawMarker.addEventListener('mouseleave', () => this.scheduleClose(accountId, info));
  }

  cancelClose(accountId: string): void {
    const timer = this.closeTimers.get(accountId);
    if (timer) {
      clearTimeout(timer);
      this.closeTimers.delete(accountId);
    }
  }

  scheduleClose(accountId: string, info: MapInfoWindow): void {
    this.cancelClose(accountId);
    this.closeTimers.set(
      accountId,
      setTimeout(() => info.close(), 250)
    );
  }

  private buildMarkerContent(a: Account): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'dir-mk';

    const circle = document.createElement('div');
    circle.className = 'dir-mk__circle';

    if (a.logo_url) {
      const img = document.createElement('img');
      img.src = a.logo_url;
      img.alt = '';
      circle.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = a.name.charAt(0).toUpperCase();
      circle.appendChild(span);
    }

    const tail = document.createElement('div');
    tail.className = 'dir-mk__tail';

    wrap.append(circle, tail);
    return wrap;
  }
}
