// send-upgrade-request — Supabase Edge Function
// Un negocio pide actualizar de plan (botón "Actualizar plan" del banner
// de cuota). Guarda la solicitud en plan_upgrade_requests (respetando RLS
// del propio dueño) y notifica por correo a los admins vía Resend.
//
// Deploy: supabase functions deploy send-upgrade-request
// Secrets:
//   supabase secrets set RESEND_API_KEY=<api_key_de_resend>
//   supabase secrets set RESEND_FROM=notificaciones@tu-dominio.com
//   supabase secrets set ADMIN_NOTIFICATION_EMAIL=jpvelasquez18@gmail.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing_authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { accountId, message } = await req.json();
    if (!accountId || typeof accountId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'accountId_missing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente "as user" — respeta RLS, así que el INSERT solo puede
    // crearse si accountId realmente pertenece al usuario del token.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: account, error: accountError } = await userClient
      .from('accounts')
      .select('id, name, owner_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: 'account_not_found_or_not_owner' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: insertError } = await userClient
      .from('plan_upgrade_requests')
      .insert({ account_id: accountId, message: message ?? null });

    if (insertError) {
      // La policy de rate-limit (1 solicitud/24h) también cae acá.
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente con service role — solo para leer correos de admins
    // (get_admin_emails está restringida a service_role, ver 020_*.sql).
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: adminEmails } = await adminClient.rpc('get_admin_emails');

    const recipients = Array.from(new Set([
      Deno.env.get('ADMIN_NOTIFICATION_EMAIL'),
      ...(adminEmails ?? []),
    ].filter((e): e is string => !!e)));

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && recipients.length > 0) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev',
          to:      recipients,
          subject: `Solicitud de upgrade de plan — ${account.name}`,
          html: `
            <p><strong>${account.name}</strong> solicitó actualizar su plan.</p>
            <p><strong>Mensaje del negocio:</strong> ${message ? message : '(sin mensaje)'}</p>
            <p>Revisa el consumo de cuota y la solicitud en el panel admin.</p>
          `,
        }),
      });
      // No se bloquea la respuesta al usuario si el correo falla —
      // la solicitud ya quedó guardada y visible en el dashboard admin.
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-upgrade-request error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
