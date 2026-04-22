import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReviewService } from '../../../directory/services/review.service';
import { ProductRatingRow } from '../../../directory/models/review.model';

@Component({
  selector: 'app-ratings-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ratings-list.component.html',
  styleUrl: './ratings-list.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class RatingsListComponent implements OnInit {
  private reviewService = inject(ReviewService);

  ratings    = signal<ProductRatingRow[]>([]);
  loading    = signal(true);
  searchText = signal('');

  filtered = computed(() => {
    const text = this.searchText().toLowerCase().trim();
    if (!text) return this.ratings();
    return this.ratings().filter(r =>
      r.author_name?.toLowerCase().includes(text) ||
      r.product_name?.toLowerCase().includes(text) ||
      r.business_name?.toLowerCase().includes(text)
    );
  });

  async ngOnInit(): Promise<void> {
    this.ratings.set(await this.reviewService.getAllProductRatings());
    this.loading.set(false);
  }
}
