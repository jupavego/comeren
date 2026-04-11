import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';
import { SupabaseService } from '../services/supabase.service';

async function waitForInit(session: SessionService): Promise<void> {
  if (session.initialized()) return;
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (session.initialized()) {
        clearInterval(interval);
        resolve();
      }
    }, 50);
    setTimeout(() => { clearInterval(interval); resolve(); }, 5000);
  });
}

// Verifica que el usuario business tenga un negocio creado.
// Si no, lo manda al setup inicial.
export const businessGuard: CanActivateFn = async () => {
  const session  = inject(SessionService);
  const supabase = inject(SupabaseService);
  const router   = inject(Router);

  // Esperar sesión inicializada antes de leer user()
  await waitForInit(session);

  const userId = session.user()?.id;
  if (!userId) return router.createUrlTree(['/auth/login']);

  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  if (data) return true;

  return router.createUrlTree(['/business/setup']);
};