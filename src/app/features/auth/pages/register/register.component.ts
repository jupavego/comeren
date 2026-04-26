import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/profile.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class RegisterComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  loading      = signal(false);
  errorMessage = signal<string | null>(null);
  success      = signal(false);
  showPassword = signal(false);

  form = this.fb.group(
    {
      fullName:        ['', [Validators.required, Validators.minLength(3)]],
      email:           ['', [Validators.required, Validators.email]],
      role:            ['client' as UserRole, Validators.required],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordMatch }
  );

  get fullName()        { return this.form.controls.fullName; }
  get email()           { return this.form.controls.email; }
  get role()            { return this.form.controls.role; }
  get password()        { return this.form.controls.password; }
  get confirmPassword() { return this.form.controls.confirmPassword; }

  private passwordMatch(control: AbstractControl): ValidationErrors | null {
    const pw  = control.get('password')?.value;
    const cpw = control.get('confirmPassword')?.value;
    return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
  }

  selectRole(role: 'client' | 'business'): void {
    this.role.setValue(role);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const result = await this.auth.register({
      email:    this.email.value!,
      password: this.password.value!,
      fullName: this.fullName.value!,
      role:     this.role.value as Extract<UserRole, 'client' | 'business'>,
    });

    this.loading.set(false);

    if (!result.success) {
      this.errorMessage.set(this.mapError(result.error));
      return;
    }

    this.success.set(true);
  }

  async loginWithGoogle(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    await this.auth.loginWithGoogle();
    // El navegador redirige a Google — no se necesita manejo posterior
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  private mapError(error?: string): string {
    if (!error) return 'Error al registrarse';
    if (error.includes('already registered')) return 'Este correo ya está registrado';
    if (error.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres';
    return error;
  }
}