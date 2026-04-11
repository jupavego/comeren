import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ReportsComponent {
  private adminService = inject(AdminService);

  exportingUsers    = signal(false);
  exportingAccounts = signal(false);
  successMsg        = signal<string | null>(null);

  async exportUsers(): Promise<void> {
    this.exportingUsers.set(true);
    const users = await this.adminService.exportUsers();

    const rows = users.map(u => ({
      id:         u.id,
      nombre:     u.full_name ?? '',
      rol:        u.role,
      telefono:   u.phone ?? '',
      registrado: u.created_at,
    }));

    this.adminService.downloadCsv(rows, 'usuarios');
    this.exportingUsers.set(false);
    this.showSuccess('Usuarios exportados correctamente');
  }

  async exportAccounts(): Promise<void> {
    this.exportingAccounts.set(true);
    const accounts = await this.adminService.exportAccounts();

    const rows = accounts.map(a => ({
      id:          a.id,
      nombre:      a.name,
      categoria:   a.category ?? '',
      zona:        a.zone ?? '',
      direccion:   a.address ?? '',
      telefono:    a.phone ?? '',
      estado:      a.status,
      activo:      a.active ? 'Sí' : 'No',
      registrado:  a.created_at,
    }));

    this.adminService.downloadCsv(rows, 'negocios');
    this.exportingAccounts.set(false);
    this.showSuccess('Negocios exportados correctamente');
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }
}