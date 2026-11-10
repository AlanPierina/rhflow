// supabase functions deploy admin
// secrets: supabase secrets set SITE_URL=https://seuapp.vercel.app RESEND_API_KEY=... MAIL_FROM="RH <rh@seudominio.com>"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const cpfEmail = (cpf: string) => `${cpf}@cpf.onflow.app`;
function validCPF(c: string) {
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== +c[t]) return false; }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const b = await req.json().catch(() => ({}));

  // ---- público: esqueci minha senha (resposta sempre genérica) ----
  if (b.action === 'forgot_password') {
    const cpf = digits(b.cpf);
    const { data: u } = await db.from('usuarios').select('email,ativo').eq('cpf', cpf).maybeSingle();
    if (u?.ativo && u.email) {
      const { data } = await db.auth.admin.generateLink({ type: 'recovery', email: cpfEmail(cpf),
        options: { redirectTo: Deno.env.get('SITE_URL') } });
      if (data?.properties?.action_link) {
        await fetch('https://api.resend.com/emails', { method: 'POST',
          headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: Deno.env.get('MAIL_FROM'), to: u.email, subject: 'ONFLOW — redefinição de senha',
            html: `<p>Clique para redefinir sua senha (link de uso único):</p><p><a href="${data.properties.action_link}">Redefinir senha</a></p><p>Se não foi você, ignore.</p>` }) });
      }
    }
    return json({ ok: true });
  }

  // ---- autenticado ----
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return json({ error: 'Não autenticado' }, 401);
  const { data: me } = await db.from('usuarios').select('*').eq('id', user.id).single();
  if (!me?.ativo) return json({ error: 'Acesso bloqueado' }, 403);
  const isAdmin = me.perfil === 'admin';
  const canCreate = isAdmin || (me.perfil === 'gestor' && me.pode_cadastrar);

  if (b.action === 'create_user') {
    if (!canCreate) return json({ error: 'Sem permissão para cadastrar' }, 403);
    const cpf = digits(b.cpf), perfil = isAdmin ? (b.perfil ?? 'colaborador') : 'colaborador';
    if (!validCPF(cpf)) return json({ error: 'CPF inválido' }, 400);
    if (!b.nome?.trim()) return json({ error: 'Nome obrigatório' }, 400);
    if (!b.senha_inicial || String(b.senha_inicial).length < 8) return json({ error: 'Senha inicial: mínimo 8 caracteres' }, 400);
    if (!['admin', 'gestor', 'colaborador'].includes(perfil)) return json({ error: 'Perfil inválido' }, 400);
    if (perfil === 'colaborador' && !/^\d{4}$/.test(b.matricula ?? '')) return json({ error: 'Matrícula de 4 dígitos obrigatória' }, 400);
    let gestor_id: string | null = null;
    if (perfil === 'colaborador') {
      gestor_id = isAdmin ? b.gestor_id : me.id;            // gestor só cadastra para a própria equipe
      const { data: g } = await db.from('usuarios').select('perfil,ativo').eq('id', gestor_id ?? '').maybeSingle();
      if (!g?.ativo || !['gestor', 'admin'].includes(g.perfil)) return json({ error: 'Gestor responsável inválido' }, 400);
    }
    const { data: created, error } = await db.auth.admin.createUser({ email: cpfEmail(cpf), password: b.senha_inicial, email_confirm: true });
    if (error) return json({ error: error.message.includes('already') ? 'CPF já cadastrado' : error.message }, 400);
    const { error: e2 } = await db.from('usuarios').insert({ id: created.user.id, cpf, nome: b.nome.trim(),
      matricula: b.matricula || null, email: b.email || null, perfil, gestor_id,
      pode_cadastrar: isAdmin && perfil === 'gestor' && !!b.pode_cadastrar });
    if (e2) { await db.auth.admin.deleteUser(created.user.id); return json({ error: e2.message }, 400); }
    return json({ ok: true });
  }

  if (!isAdmin) return json({ error: 'Apenas administradores' }, 403);

  if (b.action === 'link_manager') {
    const { data: g } = await db.from('usuarios').select('perfil,ativo').eq('id', b.gestor_id).maybeSingle();
    if (!g?.ativo || !['gestor', 'admin'].includes(g.perfil)) return json({ error: 'Gestor inválido' }, 400);
    const { error } = await db.from('usuarios').update({ gestor_id: b.gestor_id }).eq('id', b.user_id).eq('perfil', 'colaborador');
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (b.action === 'block_user') {
    if (b.user_id === me.id) return json({ error: 'Você não pode bloquear a si mesmo' }, 400);
    await db.auth.admin.updateUserById(b.user_id, { ban_duration: b.bloquear ? '876000h' : 'none' });
    const { error } = await db.from('usuarios').update({ ativo: !b.bloquear }).eq('id', b.user_id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (b.action === 'reset_password') {
    if (!b.nova_senha || String(b.nova_senha).length < 8) return json({ error: 'Mínimo 8 caracteres' }, 400);
    const { error } = await db.auth.admin.updateUserById(b.user_id, { password: b.nova_senha });
    if (error) return json({ error: error.message }, 400);
    await db.from('usuarios').update({ must_change_password: true }).eq('id', b.user_id);
    return json({ ok: true });
  }
  return json({ error: 'Ação desconhecida' }, 400);
});
