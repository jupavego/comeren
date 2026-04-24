import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AuthGateService } from '../../../core/services/auth-gate.service';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-auth-gate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-gate.component.html',
  styleUrl: './auth-gate.component.scss',
})
export class AuthGateComponent {
  private fb       = inject(FormBuilder);
  private auth     = inject(AuthService);
  readonly gate    = inject(AuthGateService);
  private session  = inject(SessionService);

  tab          = signal<'register' | 'login'>('register');
  loading      = signal(false);
  errorMsg     = signal<string | null>(null);
  registerDone = signal(false);
  showPass     = signal(false);
  selectedRole = signal<'client' | 'business'>('client');

  // ── Formulario de registro ──────────────────────────────────────────────────
  registerForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // ── Formulario de login ─────────────────────────────────────────────────────
  loginForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get rf() { return this.registerForm.controls; }
  get lf() { return this.loginForm.controls; }

  // ── Acciones ────────────────────────────────────────────────────────────────

  switchTab(tab: 'register' | 'login'): void {
    this.tab.set(tab);
    this.errorMsg.set(null);
    this.registerDone.set(false);
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set(null);

    const { fullName, email, password } = this.registerForm.value;
    const result = await this.auth.register({
      fullName: fullName!,
      email:    email!,
      password: password!,
      role:     this.selectedRole(),
    });

    this.loading.set(false);

    if (!result.success) {
      this.errorMsg.set(this.mapRegisterError(result.error));
      return;
    }

    this.registerDone.set(true);
    // Pre-rellenar email en el form de login para facilitar el flujo
    this.loginForm.patchValue({ email: email! });
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.loginForm.value;
    const result = await this.auth.login(email!, password!);

    if (!result.success) {
      this.errorMsg.set(this.mapLoginError(result.error));
      this.loading.set(false);
      return;
    }

    // Espera a que SessionService cargue el perfil completo
    await new Promise<void>(resolve => {
      const interval = setInterval(() => {
        if (this.session.initialized() && this.session.isLoggedIn()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(interval); resolve(); }, 5000);
    });

    this.loading.set(false);
    this.gate.onAuthenticated();
  }

  togglePass(): void { this.showPass.update(v => !v); }

  async loginWithGoogle(): Promise<void> {
    this.loading.set(true);
    await this.auth.loginWithGoogle();
    // loginWithGoogle() redirige a Google — el usuario vuelve autenticado
  }

  close(): void { this.gate.close(); }

  // ── Error mapping ───────────────────────────────────────────────────────────

  private mapRegisterError(error?: string): string {
    if (!error) return 'Error al registrarse. Intenta de nuevo.';
    if (error.includes('already registered')) return 'Este correo ya tiene una cuenta. Inicia sesión.';
    if (error.includes('Password should'))    return 'La contraseña debe tener al menos 6 caracteres.';
    return error;
  }

  private mapLoginError(error?: string): string {
    if (!error) return 'Error al iniciar sesión.';
    if (error.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (error.includes('Email not confirmed'))       return 'Debes confirmar tu correo antes de ingresar.';
    if (error.includes('Too many requests'))         return 'Demasiados intentos. Espera unos minutos.';
    return error;
  }
}
