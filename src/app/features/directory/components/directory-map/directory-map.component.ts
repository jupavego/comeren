import {
  Component,
  AfterViewInit,
  OnDestroy,
  input,
  ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';
import { Account } from '../../models/account.model';

// ViewEncapsulation.None es necesario porque Leaflet inyecta popups y markers
// directamente en el DOM, fuera del árbol de Angular, por lo que los estilos
// con atributos de encapsulación (_ngcontent-*) no los alcanzarían.
@Component({
  selector: 'app-directory-map',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dir-map-container">
      <div id="dir-map-{{ mapId }}" class="dir-map"></div>
    </div>
  `,
  styles: [`
    /* ── Contenedor del mapa ─────────────────────────────────────────────── */
    .dir-map-container {
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #e5e3f0;
      box-shadow: 0 4px 32px rgba(92, 66, 223, 0.10), 0 1px 4px rgba(0,0,0,0.06);
    }
    .dir-map { height: 480px; z-index: 0; }

    /* ── Marcador personalizado ──────────────────────────────────────────── */
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

    /* ── Popup — wrapper de Leaflet ─────────────────────────────────────── */
    .dir-map-popup .leaflet-popup-content-wrapper {
      padding: 0;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
      border: 1px solid #ede9f8;
      overflow: hidden;
    }
    .dir-map-popup .leaflet-popup-content {
      margin: 0;
      width: auto !important;
    }
    .dir-map-popup .leaflet-popup-tip-container { display: none; }

    /* ── Popup — contenido interno ──────────────────────────────────────── */
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
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }
    .dmp-addr {
      font-size: 0.72rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
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
export class DirectoryMapComponent implements AfterViewInit, OnDestroy {
  accounts = input.required<Account[]>();

  readonly mapId = Math.random().toString(36).slice(2, 8);
  private map!: L.Map;

  ngAfterViewInit(): void {
    const accs = this.accounts().filter(a => a.latitude != null && a.longitude != null);

    // Centro: promedio de coordenadas o Girardota por defecto
    const center: [number, number] = accs.length
      ? [
          accs.reduce((s, a) => s + a.latitude!, 0) / accs.length,
          accs.reduce((s, a) => s + a.longitude!, 0) / accs.length,
        ]
      : [6.3773, -75.4465];

    const zoom = accs.length === 1 ? 16 : 15;

    this.map = L.map(`dir-map-${this.mapId}`, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    for (const a of accs) {
      const marker = L.marker([a.latitude!, a.longitude!], {
        icon: this.buildIcon(a),
      });

      marker
        .bindPopup(this.buildPopupHtml(a), {
          closeButton: false,
          className: 'dir-map-popup',
          offset: [0, -4],
          autoPan: true,
          maxWidth: 272,
        })
        .on('mouseover', () => marker.openPopup())
        .addTo(this.map);
    }
  }

  private buildIcon(a: Account): L.DivIcon {
    const initial = a.name.charAt(0).toUpperCase();
    const inner = a.logo_url
      ? `<img src="${a.logo_url}" alt="" />`
      : `<span>${initial}</span>`;

    return L.divIcon({
      html: `<div class="dir-mk">
               <div class="dir-mk__circle">${inner}</div>
               <div class="dir-mk__tail"></div>
             </div>`,
      className: '',
      iconSize:   [46, 60],
      iconAnchor: [23, 60],
      popupAnchor: [0, -62],
    });
  }

  private buildPopupHtml(a: Account): string {
    const logo = a.logo_url
      ? `<img class="dmp-logo" src="${a.logo_url}" alt="${this.esc(a.name)}" />`
      : `<div class="dmp-logo-placeholder">${a.name.charAt(0).toUpperCase()}</div>`;

    const cat  = a.category ? `<span class="dmp-cat">${this.esc(a.category)}</span>` : '';
    const addr = a.address
      ? `<div class="dmp-addr">${this.esc(a.address)}${a.zone ? ' · ' + this.esc(a.zone) : ''}</div>`
      : '';

    return `
      <a class="dmp-card" href="/negocio/${a.id}">
        ${logo}
        <div class="dmp-body">
          ${cat}
          <div class="dmp-name">${this.esc(a.name)}</div>
          ${addr}
          <span class="dmp-cta">
            Ver micrositio
            <svg viewBox="0 0 16 16" fill="none" stroke="#5c42df" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </span>
        </div>
      </a>`;
  }

  /** Escapa caracteres HTML para evitar XSS en el contenido del popup. */
  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
