import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AccountsService } from '../../services/accounts.service';
import { CatalogService } from '../../services/catalog.service';
import { Account, CatalogItem } from '../../../directory/models/account.model';
import { ReviewService } from '../../../directory/services/review.service';
import { ProductRatingRow } from '../../../directory/models/review.model';
import { OrderService, OrderStats } from '../../../directory/services/order.service';

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
  private reviewService   = inject(ReviewService);
  private orderService    = inject(OrderService);

  account      = signal<Account | null>(null);
  catalogItems = signal<CatalogItem[]>([]);
  ratings      = signal<ProductRatingRow[]>([]);
  orderStats   = signal<OrderStats>({ total: 0, thisMonth: 0 });
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
      const [items, ratings, orders] = await Promise.all([
        this.catalogService.getByAccount(account.id),
        this.reviewService.getProductRatingsForAccount(account.id),
        this.orderService.getOrderStats(account.id),
      ]);
      this.catalogItems.set(items);
      this.ratings.set(ratings);
      this.orderStats.set(orders);
    }

    this.loading.set(false);
  }
}