import { Component, OnInit, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Review } from '../../models/review.model';
import { ReviewService } from '../../services/review.service';
import { SessionService } from '../../../../core/services/session.service';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-reviews.component.html',
  styleUrl:    './product-reviews.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProductReviewsComponent implements OnInit {
  catalogItemId = input.required<string>();
  itemName      = input<string>('');

  closed     = output<void>();
  avgUpdated = output<number>();

  private reviewService = inject(ReviewService);
  private session       = inject(SessionService);

  reviews    = signal<Review[]>([]);
  loading    = signal(true);
  submitting = signal(false);
  done       = signal(false);
  selected   = signal(0);   // 0 = ninguno

  readonly ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly avgRating     = computed(() => this.reviewService.average(this.reviews()));

  async ngOnInit(): Promise<void> {
    const data = await this.reviewService.getByProduct(this.catalogItemId());
    this.reviews.set(data);
    this.loading.set(false);
    // Emitir promedio inicial para que el badge del card lo muestre de inmediato
    this.avgUpdated.emit(this.reviewService.average(data));
  }

  select(n: number): void {
    if (!this.submitting()) this.selected.set(n);
  }

  async submitRating(): Promise<void> {
    if (this.selected() === 0 || this.submitting()) return;
    this.submitting.set(true);

    const authorName = this.session.profile()?.full_name || 'Anónimo';

    const result = await this.reviewService.createForProduct(
      this.catalogItemId(),
      this.session.user()?.id ?? null,
      { author_name: authorName, rating: this.selected(), comment: '' },
    );

    this.submitting.set(false);

    if (result.success) {
      this.reviews.update(list => [result.data!, ...list]);
      this.avgUpdated.emit(this.reviewService.average(this.reviews()));
      this.done.set(true);
      setTimeout(() => this.closed.emit(), 1800);
    }
  }

  close(): void { this.closed.emit(); }
}
