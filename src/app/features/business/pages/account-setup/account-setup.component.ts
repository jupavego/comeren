import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountsService } from '../../services/accounts.service';
import { AccountFormData, DIRECTORY_CATEGORIES } from '../../../directory/models/account.model';

@Component({
  selector: 'app-account-setup',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './account-setup.component.html',
  styleUrl: './account-setup.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccountSetupComponent {
  private fb       = inject(FormBuilder);
  private accounts = inject(AccountsService);
  private router   = inject(Router);

  loading      = signal(false);
  errorMessage = signal<string | null>(null);

  readonly categories = DIRECTORY_CATEGORIES.filter(c => c !== 'Todos');

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    category:    ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(20)]],
    address:     ['', Validators.required],
    zone:        [''],
    phone:       ['', Validators.required],
    schedule:    [''],
    slogan:      [''],
    history:     [''],
    facebook:    [''],
    instagram:   [''],
    whatsapp:    [''],
  });

  get name()        { return this.form.controls.name; }
  get category()    { return this.form.controls.category; }
  get description() { return this.form.controls.description; }
  get address()     { return this.form.controls.address; }
  get phone()       { return this.form.controls.phone; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const result = await this.accounts.create(this.form.value as AccountFormData);

    this.loading.set(false);

    if (!result.success) {
      this.errorMessage.set(result.error ?? 'Error al crear el negocio');
      return;
    }

    // Redirige al dashboard del negocio
    this.router.navigate(['/business/dashboard']);
  }
}