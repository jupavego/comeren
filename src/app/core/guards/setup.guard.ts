import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';
import { SupabaseService } from '../services/supabase.service';

async function waitForInit(session: SessionService): Promise<void> {
  if (session.initialized()) return;
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (session.initialized()) { clearInterval(interval); resolve(); }
    }, 50);
    setTimeout(() => { clearInterval(interval); resolve(); }, 5000);
  });
}

// Protege /business/setup — si el negocio ya existe, redirige al dashboard.
// Evita que un negocio ya creado vuelva a pasar por el setup y duplique datos.
export const setupGuard: CanActivateFn = async () => {
  const session  = inject(SessionService);
  const supabase = inject(SupabaseService);
  const router   = inject(Router);

  await waitForInit(session);

  const userId = session.user()?.id;
  if (!userId) return router.createUrlTree(['/auth/login']);

  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  // Si ya tiene negocio → redirigir al dashboard
  if (data) return router.createUrlTree(['/business/dashboard']);

  return true;
};