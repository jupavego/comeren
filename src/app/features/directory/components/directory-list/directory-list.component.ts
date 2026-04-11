import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Account } from '../../models/account.model';

@Component({
  selector: 'app-directory-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './directory-list.component.html',
  styleUrl: './directory-list.component.scss',
})
export class DirectoryListComponent {
  @Input() accounts:    Account[] = [];
  @Input() hasMore:     boolean   = false;
  @Input() loadingMore: boolean   = false;

  @Output() loadMoreClick = new EventEmitter<void>();
  @Output() clearFilters  = new EventEmitter<void>();
}