import { Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { Account, AccountStatus } from '../../../../features/directory/models/account.model';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './accounts-list.component.html',
  styleUrl: './accounts-list.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccountsListComponent implements OnInit {
  private adminService = inject(AdminService);

  accounts     = signal<Account[]>([]);
  loading      = signal(true);
  searchText   = signal('');
  statusFilter = signal<AccountStatus | 'all'>('all');
  processingId = signal<string | null>(null);

  filtered = computed(() => {
    const text   = this.searchText().toLowerCase().trim();
    const status = this.statusFilter();

    return this.accounts().filter(a => {
      const matchesStatus = status === 'all' || a.status === status;
      const matchesText   = !text ||
        a.name.toLowerCase().includes(text) ||
        a.category?.toLowerCase().includes(text) ||
        a.zone?.toLowerCase().includes(text);
      return matchesStatus && matchesText;
    });
  });

  async ngOnInit(): Promise<void> {
    this.accounts.set(await this.adminService.getAccounts());
    this.loading.set(false);
  }

  async updateStatus(account: Account, status: AccountStatus): Promise<void> {
    this.processingId.set(account.id);
    const ok = await this.adminService.updateAccountStatus(account.id, status);
    if (ok) {
      this.accounts.update(accounts =>
        accounts.map(a =>
          a.id === account.id
            ? { ...a, status, active: status === 'approved' }
            : a
        )
      );
    }
    this.processingId.set(null);
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pending:   'badge--warning',
      approved:  'badge--success',
      rejected:  'badge--danger',
      suspended: 'badge--neutral',
    };
    return map[status] ?? '';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:   'En revisión',
      approved:  'Aprobado',
      rejected:  'Rechazado',
      suspended: 'Suspendido',
    };
    return map[status] ?? status;
  }
}