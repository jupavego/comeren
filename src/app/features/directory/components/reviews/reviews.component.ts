import {
  ChangeDetectionStrategy,
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
import { AuthGateService } from '../../../../core/services/auth-gate.service';
import { Review } from '../../models/review.model';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent implements OnInit {
  private reviewService = inject(ReviewService);
  private session       = inject(SessionService);
  private authGate      = inject(AuthGateService);

  accountId = input.required<string>();

  reviews    = signal<Review[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  showForm   = signal(false);
  errorMsg   = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Form — crear nueva reseña
  authorName = signal('');
  rating     = signal(8);
  comment    = signal('');

  // Edición inline
  editingId      = signal<string | null>(null);
  editRating     = signal(8);
  editComment    = signal('');
  editSaving     = signal(false);
  editErrorMsg   = signal<string | null>(null);

  average = computed(() => this.reviewService.average(this.reviews()));
  count   = computed(() => this.reviews().length);

  async ngOnInit(): Promise<void> {
    const data = await this.reviewService.getByAccount(this.accountId());
    this.reviews.set(data);
    this.loading.set(false);

    const profile = this.session.profile();
    if (profile?.full_name) {
      this.authorName.set(profile.full_name);
    }
  }

  // ── Permisos ──────────────────────────────────────────────────────────────
  canManage(review: Review): boolean {
    if (this.session.isAdmin()) return true;
    const uid = this.session.user()?.id;
    return !!uid && uid === review.user_id;
  }

  // ── Crear ─────────────────────────────────────────────────────────────────
  setRating(value: number): void { this.rating.set(value); }

  /** Abre el formulario solo si el usuario está registrado; si no, lanza el auth gate */
  requestReview(): void {
    if (this.showForm()) {
      // Cancelar siempre está permitido sin auth
      this.showForm.set(false);
      this.errorMsg.set(null);
      return;
    }
    this.authGate.requireAuth(() => {
      this.showForm.set(true);
      this.errorMsg.set(null);
    }, 'review');
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

    if (result.data) this.reviews.update(prev => [result.data!, ...prev]);
    this.comment.set('');
    this.showForm.set(false);
    this.successMsg.set('¡Gracias por tu reseña!');
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  // ── Editar ────────────────────────────────────────────────────────────────
  startEdit(review: Review): void {
    this.editingId.set(review.id);
    this.editRating.set(review.rating);
    this.editComment.set(review.comment ?? '');
    this.editErrorMsg.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editErrorMsg.set(null);
  }

  setEditRating(value: number): void { this.editRating.set(value); }

  async saveEdit(review: Review): Promise<void> {
    if (this.editRating() < 1 || this.editRating() > 10) return;

    this.editSaving.set(true);
    this.editErrorMsg.set(null);

    const result = await this.reviewService.update(review.id, {
      rating:  this.editRating(),
      comment: this.editComment(),
    });

    this.editSaving.set(false);

    if (!result.success) {
      this.editErrorMsg.set(result.error ?? 'Error al guardar.');
      return;
    }

    this.reviews.update(prev =>
      prev.map(r => r.id === review.id ? result.data! : r)
    );
    this.editingId.set(null);
    this.successMsg.set('Reseña actualizada');
    setTimeout(() => this.successMsg.set(null), 2500);
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  async deleteReview(review: Review): Promise<void> {
    if (!confirm(`¿Eliminar la reseña de "${review.author_name}"?`)) return;

    const result = await this.reviewService.delete(review.id);

    if (!result.success) {
      this.successMsg.set(null);
      return;
    }

    this.reviews.update(prev => prev.filter(r => r.id !== review.id));
    this.successMsg.set('Reseña eliminada');
    setTimeout(() => this.successMsg.set(null), 2500);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
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
