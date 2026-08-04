import { Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService, BusinessUsageRow, PLAN_PACKAGES } from '../../services/admin.service';
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
  usageByAccountId = signal<Map<string, BusinessUsageRow>>(new Map());
  loading      = signal(true);
  searchText   = signal('');
  statusFilter = signal<AccountStatus | 'all'>('all');
  processingId = signal<string | null>(null);

  packages = PLAN_PACKAGES;
  grantFormForAccountId = signal<string | null>(null);
  grantPackage  = signal<string>(PLAN_PACKAGES[0].value);
  grantDate     = signal('');
  grantSaving   = signal(false);

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
    const [accounts, usage] = await Promise.all([
      this.adminService.getAccounts(),
      this.adminService.getAllBusinessUsage(),
    ]);
    this.accounts.set(accounts);
    this.usageByAccountId.set(new Map(usage.map(u => [u.account_id, u])));
    this.loading.set(false);
  }

  usageFor(accountId: string): BusinessUsageRow | undefined {
    return this.usageByAccountId().get(accountId);
  }

  openGrantForm(accountId: string): void {
    this.grantFormForAccountId.set(accountId);
    this.grantPackage.set(this.packages[0].value);
    this.grantDate.set('');
  }

  closeGrantForm(): void {
    this.grantFormForAccountId.set(null);
  }

  async submitGrant(accountId: string): Promise<void> {
    if (!this.grantDate()) return;

    this.grantSaving.set(true);
    // El input date da "YYYY-MM-DD" — se interpreta como fin de ese día.
    const expiresAtIso = new Date(`${this.grantDate()}T23:59:59`).toISOString();

    const ok = await this.adminService.grantPlanPackage(
      accountId, this.grantPackage(), expiresAtIso
    );

    if (ok) {
      const usage = await this.adminService.getAllBusinessUsage();
      this.usageByAccountId.set(new Map(usage.map(u => [u.account_id, u])));
      this.grantFormForAccountId.set(null);
    }
    this.grantSaving.set(false);
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