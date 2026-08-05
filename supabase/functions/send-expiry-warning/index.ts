// send-expiry-warning — Supabase Edge Function
// Disparada a diario por pg_cron (024_expiry_warning_cron.sql), NO desde
// el navegador. Busca negocios cuyo paquete ampliado vence en 5, 3 o 1
// día y le avisa por correo AL DUEÑO del negocio (a diferencia de
// send-upgrade-request, que le avisa al admin).
//
// Deploy: supabase functions deploy send-expiry-warning

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase-admin.ts';
import { sendEmail } from '../_shared/resend.ts';

serve(async (_req) => {
  try {
    const adminClient = createAdminClient();

    const { data: accounts, error } = await adminClient.rpc('get_accounts_needing_expiry_warning');
    if (error) throw error;

    let sent = 0;

    for (const acc of accounts ?? []) {
      const { data: userLookup } = await adminClient.auth.admin.getUserById(acc.owner_id);
      const email = userLookup?.user?.email;

      if (email) {
        const days = acc.days_remaining;
        const ok = await sendEmail({
          to:      [email],
          subject: `Tu plan ${acc.plan_tier} vence en ${days} día${days === 1 ? '' : 's'}`,
          html: `
            <p>Hola,</p>
            <p>La ampliación de plan (<strong>${acc.plan_tier}</strong>) de
            <strong>${acc.business_name}</strong> vence el
            ${new Date(acc.plan_expires_at).toLocaleDateString('es-CO')}.</p>
            <p>Si quieres renovarla y no perder tu capacidad ampliada, contáctanos
            antes de esa fecha.</p>
          `,
        });
        if (ok) sent++;
      } else {
        console.error(`Sin correo para owner_id ${acc.owner_id} (account ${acc.account_id})`);
      }

      // Marca el aviso como enviado aunque el correo haya fallado — evita
      // reintentos infinitos por un problema de Resend; el próximo aviso
      // (el de la siguiente marca de días) sí se seguirá intentando.
      await adminClient.rpc('mark_expiry_warning_sent', {
        p_account_id: acc.account_id,
        p_days:       acc.days_remaining,
      });
    }

    return new Response(
      JSON.stringify({ success: true, processed: accounts?.length ?? 0, sent }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-expiry-warning error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'internal_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
