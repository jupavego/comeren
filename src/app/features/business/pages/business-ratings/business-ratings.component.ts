import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccountsService } from '../../services/accounts.service';
import { ReviewService } from '../../../directory/services/review.service';
import { ProductRatingRow } from '../../../directory/models/review.model';

@Component({
  selector: 'app-business-ratings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './business-ratings.component.html',
  styleUrl: './business-ratings.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BusinessRatingsComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private reviewService   = inject(ReviewService);

  ratings    = signal<ProductRatingRow[]>([]);
  loading    = signal(true);
  searchText = signal('');

  filtered = computed(() => {
    const text = this.searchText().toLowerCase().trim();
    if (!text) return this.ratings();
    return this.ratings().filter(r =>
      r.author_name?.toLowerCase().includes(text) ||
      r.product_name?.toLowerCase().includes(text)
    );
  });

  async ngOnInit(): Promise<void> {
    const account = await this.accountsService.getMyAccount();
    if (account) {
      this.ratings.set(await this.reviewService.getProductRatingsForAccount(account.id));
    }
    this.loading.set(false);
  }
}
