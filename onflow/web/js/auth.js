const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
let ME = null;

const onlyDigits = s => String(s || '').replace(/\D/g, '');
const cpfEmail = cpf => `${cpf}@cpf.onflow.app`;
const $ = id => document.getElementById(id);
const toggle = (id, show) => { const el = $(id); if (el) el.classList.toggle('hidden', !show); };
const fmtComp = d => { const [y, m] = String(d).split('-'); return `${m}/${y}`; };
function validCPF(c) {
  c = onlyDigits(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== +c[t]) return false;
  }
  return true;
}

const Auth = {
  showView(v, msg) {
    toggle('authOverlay', true);
    ['login', 'forgot', 'newpass'].forEach(x => toggle(`auth-${x}`, x === v));
    const e = $('authMsg'); e.textContent = msg || ''; e.classList.toggle('hidden', !msg);
  },

  async init() {
    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') Auth.showView('newpass');
      if (event === 'SIGNED_OUT') { ME = null; Realtime.stop(); Auth.showView('login'); }
    });
    if (location.hash.includes('type=recovery')) return Auth.showView('newpass');
    const { data: { session } } = await sb.auth.getSession();
    session ? Auth.boot() : Auth.showView('login');
  },

  async login(ev) {
    ev.preventDefault();
    const cpf = onlyDigits($('loginCpf').value), senha = $('loginSenha').value;
    if (!validCPF(cpf)) return Auth.showView('login', 'CPF inválido.');
    const btn = $('btnLogin'); btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: cpfEmail(cpf), password: senha });
    btn.disabled = false;
    if (error) return Auth.showView('login', 'CPF ou senha inválidos.');   // mensagem genérica (anti-enumeração)
    $('loginSenha').value = '';
    Auth.boot();
  },

  async boot() {
    const { data: { user } } = await sb.auth.getUser();
    const { data: p } = user ? await sb.from('usuarios').select('*').eq('id', user.id).maybeSingle() : { data: null };
    if (!p || !p.ativo) { await sb.auth.signOut(); return Auth.showView('login', 'Acesso não autorizado ou bloqueado.'); }
    ME = p;
    if (p.must_change_password) return Auth.showView('newpass', 'Defina uma nova senha para continuar.');
    Auth.applyRole();
  },

  applyRole() {
    toggle('authOverlay', false);
    const staff = ME.perfil !== 'colaborador';
    if (typeof CURRENT_EMPLOYEE !== 'undefined') { CURRENT_EMPLOYEE.id = ME.id; CURRENT_EMPLOYEE.name = ME.nome; }
    $('btnViewDesktop').parentElement.classList.toggle('hidden', !staff);   // colaborador só vê o PWA
    toggle('navAdminWrap', staff);
    switchMainView(staff ? 'desktop' : 'mobile');
    switchMobileTab('inicio');
    if (staff) navDesktop('dashboard');
    Holerites.avisarPendentes();
    Realtime.start();
  },

  async forgot(ev) {
    ev.preventDefault();
    const cpf = onlyDigits($('forgotCpf').value);
    if (!validCPF(cpf)) return Auth.showView('forgot', 'CPF inválido.');
    await sb.functions.invoke('admin', { body: { action: 'forgot_password', cpf } });
    Auth.showView('login', 'Se o CPF estiver cadastrado, enviamos um link ao e-mail do RH.');
  },

  async setNewPassword(ev) {
    ev.preventDefault();
    const a = $('newPass1').value, b = $('newPass2').value;
    if (a.length < 8) return Auth.showView('newpass', 'A senha deve ter no mínimo 8 caracteres.');
    if (a !== b) return Auth.showView('newpass', 'As senhas não conferem.');
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) return Auth.showView('newpass', error.message);
    await sb.rpc('confirmar_troca_senha');
    history.replaceState(null, '', location.pathname);
    $('newPass1').value = $('newPass2').value = '';
    Auth.boot();
  },

  async logout() { await sb.auth.signOut(); }
};

// Alertas em tempo real (RLS decide o que cada perfil recebe)
const Realtime = {
  ch: null,
  start() {
    if (ME.perfil === 'colaborador' || this.ch) return;
    this.ch = sb.channel('alertas-divergencia')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs_assinatura_divergencia' }, p => {
        if (p.new.tipo === 'contestacao') { showToast(`Nova contestação: ${p.new.nome_colaborador}`, 'warning'); Admin.loadAlertas(); }
      }).subscribe();
  },
  stop() { if (this.ch) { sb.removeChannel(this.ch); this.ch = null; } }
};

document.addEventListener('DOMContentLoaded', Auth.init);
