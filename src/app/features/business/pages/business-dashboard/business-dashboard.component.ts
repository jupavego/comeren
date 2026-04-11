import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AccountsService } from '../../services/accounts.service';
import { CatalogService } from '../../services/catalog.service';
import { Account, CatalogItem } from '../../../directory/models/account.model';

@Component({
  selector: 'app-business-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './business-dashboard.component.html',
  styleUrl: './business-dashboard.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BusinessDashboardComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private catalogService  = inject(CatalogService);

  account      = signal<Account | null>(null);
  catalogItems = signal<CatalogItem[]>([]);
  loading      = signal(true);

  // Métricas computadas
  get totalProducts()  { return this.catalogItems().length; }
  get activeProducts() { return this.catalogItems().filter(i => i.active).length; }
  get isPending()      { return this.account()?.status === 'pending'; }
  get isApproved()     { return this.account()?.status === 'approved'; }
  get isRejected()     { return this.account()?.status === 'rejected'; }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);

    const account = await this.accountsService.getMyAccount();
    this.account.set(account);

    if (account) {
      const items = await this.catalogService.getByAccount(account.id);
      this.catalogItems.set(items);
    }

    this.loading.set(false);
  }
}