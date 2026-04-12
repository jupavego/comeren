import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Account } from '../../models/account.model';
import { DirectoryService } from '../../services/directory.service';
import { ReviewsComponent } from '../../components/reviews/reviews.component';
import { WhatsappOrderComponent } from '../../components/whatsapp-order/whatsapp-order.component';

@Component({
  selector: 'app-business-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReviewsComponent, WhatsappOrderComponent],
  templateUrl: './business-detail.component.html',
  styleUrl: './business-detail.component.scss',
})
export class BusinessDetailComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private directoryService = inject(DirectoryService);
  private sanitizer        = inject(DomSanitizer);

  account      = signal<Account | null>(null);
  loading      = signal(true);
  notFound     = signal(false);
  showOrder    = signal(false);

  mapUrl = computed<SafeResourceUrl | null>(() => {
    const a = this.account();
    if (!a?.address) return null;
    const query = encodeURIComponent(`${a.address}, ${a.zone ?? ''}, Girardota, Antioquia, Colombia`);
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${query}&output=embed&hl=es`
    );
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    const data = await this.directoryService.getById(id);

    if (!data) {
      this.notFound.set(true);
    } else {
      this.account.set(data);
    }

    this.loading.set(false);
  }

  openWhatsapp(phone: string): void {
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/57${clean}`, '_blank');
  }
}