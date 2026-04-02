import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { DetalleEstablecimientoComponent } from './pages/detalle-establecimiento/detalle-establecimiento.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'establecimiento/:id',
    component: DetalleEstablecimientoComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];