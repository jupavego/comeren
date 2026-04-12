import {
  Component,
  OnInit,
  inject,
  input,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { SessionService } from '../../../../core/services/session.service';
import { Review } from '../../models/review.model';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  private reviewService = inject(ReviewService);
  private session       = inject(SessionService);

  accountId = input.required<string>();

  reviews   = signal<Review[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  showForm  = signal(false);
  errorMsg  = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Form state
  authorName = signal('');
  rating     = signal(8);
  comment    = signal('');

  average  = computed(() => this.reviewService.average(this.reviews()));
  count    = computed(() => this.reviews().length);
  stars    = computed(() => Math.round(this.average() / 2)); // /10 → /5 visual

  async ngOnInit(): Promise<void> {
    const data = await this.reviewService.getByAccount(this.accountId());
    this.reviews.set(data);
    this.loading.set(false);

    // Prellenar nombre si el usuario está autenticado
    const profile = this.session.profile();
    if (profile?.full_name) {
      this.authorName.set(profile.full_name);
    }
  }

  setRating(value: number): void {
    this.rating.set(value);
  }

  toggleForm(): void {
    this.showForm.update(v => !v);
    this.errorMsg.set(null);
  }

  async submit(): Promise<void> {
    const name = this.authorName().trim();
    if (!name) { this.errorMsg.set('Escribe tu nombre para continuar.'); return; }
    if (this.rating() < 1 || this.rating() > 10) { this.errorMsg.set('Selecciona una calificación.'); return; }

    this.saving.set(true);
    this.errorMsg.set(null);

    const userId = this.session.user()?.id ?? null;

    const result = await this.reviewService.create(
      this.accountId(),
      userId,
      { author_name: name, rating: this.rating(), comment: this.comment() }
    );

    this.saving.set(false);

    if (!result.success) {
      this.errorMsg.set(result.error ?? 'Error al enviar la reseña.');
      return;
    }

    if (result.data) {
      this.reviews.update(prev => [result.data!, ...prev]);
    }
    this.comment.set('');
    this.showForm.set(false);
    this.successMsg.set('¡Gracias por tu reseña!');
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  /** Devuelve los valores para el selector 1–10 */
  readonly ratingOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  ratingLabel(n: number): string {
    if (n <= 3) return 'Malo';
    if (n <= 5) return 'Regular';
    if (n <= 7) return 'Bueno';
    if (n <= 9) return 'Muy bueno';
    return 'Excelente';
  }

  ratingClass(n: number): string {
    if (n <= 3) return 'bad';
    if (n <= 5) return 'regular';
    if (n <= 7) return 'good';
    if (n <= 9) return 'great';
    return 'perfect';
  }
}
