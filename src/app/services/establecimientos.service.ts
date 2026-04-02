import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Establecimiento } from '../models/establecimiento';
import { ESTABLECIMIENTOS_MOCK } from '../data/mock-establecimientos';

@Injectable({
  providedIn: 'root'
})
export class EstablecimientosService {
  private busquedaSubject = new BehaviorSubject<string>('');
  private categoriaSubject = new BehaviorSubject<string>('Todos');

  busqueda$ = this.busquedaSubject.asObservable();
  categoria$ = this.categoriaSubject.asObservable();

  obtenerTodos(): Establecimiento[] {
    return ESTABLECIMIENTOS_MOCK.filter(e => e.activo);
  }

  obtenerPorId(id: number): Establecimiento | undefined {
    return ESTABLECIMIENTOS_MOCK.find(e => e.id === id);
  }

  setBusqueda(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  setCategoria(categoria: string): void {
    this.categoriaSubject.next(categoria);
  }
}