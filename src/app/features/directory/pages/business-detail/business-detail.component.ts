import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Account } from '../../models/account.model';
import { DirectoryService } from '../../services/directory.service';

@Component({
  selector: 'app-business-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './business-detail.component.html',
  styleUrl: './business-detail.component.scss',
})
export class BusinessDetailComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private directoryService = inject(DirectoryService);

  account = signal<Account | null>(null);
  loading = signal(true);
  notFound = signal(false);

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