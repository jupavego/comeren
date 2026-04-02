import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Establecimiento } from '../../models/establecimiento';
import { EstablecimientosService } from '../../services/establecimientos.service';

@Component({
  selector: 'app-detalle-establecimiento',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-establecimiento.component.html',
  styleUrl: './detalle-establecimiento.component.scss'
})
export class DetalleEstablecimientoComponent implements OnInit {
  establecimiento?: Establecimiento;

  constructor(
    private route: ActivatedRoute,
    private establecimientosService: EstablecimientosService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.establecimiento = this.establecimientosService.obtenerPorId(id);
  }
}