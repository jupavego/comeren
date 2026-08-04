// send-expiry-warning — Supabase Edge Function
// Disparada a diario por pg_cron (024_expiry_warning_cron.sql), NO desde
// el navegador. Busca negocios cuyo paquete ampliado vence en 5, 3 o 1
// día y le avisa por correo AL DUEÑO del negocio (a diferencia de
// send-upgrade-request, que le avisa al admin).
//
// Deploy: supabase functions deploy send-expiry-warning

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (_req) => {
  try {
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: accounts, error } = await adminClient.rpc('get_accounts_needing_expiry_warning');
    if (error) throw error;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from       = Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev';

    let sent = 0;

    for (const acc of accounts ?? []) {
      const { data: userLookup } = await adminClient.auth.admin.getUserById(acc.owner_id);
      const email = userLookup?.user?.email;

      if (email && resendKey) {
        const days = acc.days_remaining;
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from,
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
          }),
        });

        if (resp.ok) {
          sent++;
        } else {
          console.error('Resend error (expiry warning):', resp.status, await resp.text());
        }
      } else if (!email) {
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
