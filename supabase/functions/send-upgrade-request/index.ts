// send-upgrade-request — Supabase Edge Function
// Un negocio pide actualizar de plan (botón "Actualizar plan" del banner
// de cuota). Guarda la solicitud en plan_upgrade_requests (respetando RLS
// del propio dueño) y notifica por correo a los admins vía Resend, con
// todos los datos del negocio y su dueño para poder darle seguimiento.
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

function esc(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
}

function row(label: string, value: unknown): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#777;white-space:nowrap;">${label}</td><td style="padding:4px 0;font-weight:600;">${esc(value)}</td></tr>`;
}

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

    // Cliente "as user" — respeta RLS, así que el INSERT y las lecturas
    // solo funcionan si accountId realmente pertenece al usuario del token.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: account, error: accountError } = await userClient
      .from('accounts')
      .select(`
        id, name, owner_id, description, slogan, address, zone, phone,
        category, whatsapp, facebook, instagram, status, plan_tier, created_at
      `)
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
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perfil del dueño — mismo owner_id que ya se validó arriba.
    const { data: profile } = await userClient
      .from('profiles')
      .select('full_name, phone')
      .eq('id', account.owner_id)
      .maybeSingle();

    // Cliente con service role — solo para datos que requieren privilegios:
    // correo real del dueño (auth.users), correos de admins, y cuota.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const [{ data: userLookup }, { data: usage }, { data: adminEmails }] = await Promise.all([
      adminClient.auth.admin.getUserById(account.owner_id),
      adminClient.rpc('get_business_usage', { p_account_id: accountId }),
      adminClient.rpc('get_admin_emails'),
    ]);

    const ownerEmail = userLookup?.user?.email ?? null;

    const recipients = Array.from(new Set([
      Deno.env.get('ADMIN_NOTIFICATION_EMAIL'),
      ...(adminEmails ?? []),
    ].filter((e): e is string => !!e)));

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && recipients.length > 0) {
      const html = `
        <div style="font-family:sans-serif;font-size:14px;color:#2b1a0f;max-width:560px;">
          <h2 style="margin:0 0 4px;">Solicitud de actualización de plan</h2>
          <p style="color:#777;margin:0 0 20px;">${esc(account.name)} pidió actualizar su plan gratuito.</p>

          <h3 style="margin:0 0 6px;font-size:14px;">Negocio</h3>
          <table style="border-collapse:collapse;margin-bottom:16px;">
            ${row('Nombre', account.name)}
            ${row('Categoría', account.category)}
            ${row('Zona', account.zone)}
            ${row('Dirección', account.address)}
            ${row('Estado', account.status)}
            ${row('Plan actual', account.plan_tier)}
            ${row('Registrado', account.created_at ? new Date(account.created_at).toLocaleDateString('es-CO') : null)}
          </table>

          <h3 style="margin:0 0 6px;font-size:14px;">Contacto</h3>
          <table style="border-collapse:collapse;margin-bottom:16px;">
            ${row('Dueño', profile?.full_name)}
            ${row('Correo', ownerEmail)}
            ${row('Teléfono perfil', profile?.phone)}
            ${row('Teléfono negocio', account.phone)}
            ${row('WhatsApp', account.whatsapp)}
            ${row('Facebook', account.facebook)}
            ${row('Instagram', account.instagram)}
          </table>

          <h3 style="margin:0 0 6px;font-size:14px;">Consumo de cuota</h3>
          <table style="border-collapse:collapse;margin-bottom:16px;">
            ${row('Storage usado', usage ? `${usage.storagePercent}% (${(usage.storageUsedBytes / 1024 / 1024).toFixed(1)} MB de ${(usage.storageLimitBytes / 1024 / 1024).toFixed(0)} MB)` : null)}
            ${row('Productos', usage ? `${usage.productCount} de ${usage.productLimit} (${usage.productPercent}%)` : null)}
          </table>

          <h3 style="margin:0 0 6px;font-size:14px;">Mensaje del negocio</h3>
          <p style="background:#f7f4ef;padding:10px 12px;border-radius:8px;margin:0 0 20px;">
            ${message ? esc(message) : '(sin mensaje)'}
          </p>

          <p style="color:#777;font-size:12px;">Gestiona esta solicitud desde el panel admin → Negocios.</p>
        </div>
      `;

      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev',
          to:      recipients,
          subject: `Solicitud de upgrade de plan — ${account.name}`,
          html,
        }),
      });

      // No se bloquea la respuesta al usuario si el correo falla — la
      // solicitud ya quedó guardada y visible en el dashboard admin — pero
      // sí queda logueado para poder diagnosticarlo.
      if (!resendResp.ok) {
        console.error('Resend error:', resendResp.status, await resendResp.text());
      }
    } else if (!resendKey) {
      console.error('RESEND_API_KEY no configurado — no se envió correo');
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
