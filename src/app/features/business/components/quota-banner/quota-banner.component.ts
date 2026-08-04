import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessQuotaService, BusinessUsage } from '../../services/business-quota.service';

@Component({
  selector: 'app-quota-banner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quota-banner.component.html',
  styleUrl: './quota-banner.component.scss',
})
export class QuotaBannerComponent implements OnChanges {
  @Input({ required: true }) accountId!: string;

  private quotaService = inject(BusinessQuotaService);

  usage        = signal<BusinessUsage | null>(null);
  dismissed    = signal(false);
  formOpen     = signal(false);
  message      = signal('');
  sending      = signal(false);
  sendResult   = signal<'success' | 'error' | null>(null);

  get usagePercent(): number {
    const u = this.usage();
    if (!u) return 0;
    return Math.max(u.storagePercent, u.productPercent);
  }

  get isBlocking(): boolean { return this.usagePercent >= 100; }
  get isWarning():  boolean { return this.usagePercent >= 80 && this.usagePercent < 100; }
  get show():       boolean {
    if (!this.usage()) return false;
    if (this.isBlocking) return true;
    return this.isWarning && !this.dismissed();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['accountId'] && this.accountId) {
      this.usage.set(await this.quotaService.getUsage(this.accountId));
    }
  }

  dismiss(): void {
    this.dismissed.set(true);
  }

  toggleForm(): void {
    this.formOpen.set(!this.formOpen());
    this.sendResult.set(null);
  }

  async submitRequest(): Promise<void> {
    this.sending.set(true);
    this.sendResult.set(null);

    const result = await this.quotaService.requestUpgrade(this.accountId, this.message());

    this.sending.set(false);
    this.sendResult.set(result.success ? 'success' : 'error');
    if (result.success) this.message.set('');
  }
}
