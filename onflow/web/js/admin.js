const Admin = {
  users: [],

  async call(action, payload = {}) {
    const { data, error } = await sb.functions.invoke('admin', { body: { action, ...payload } });
    if (error) {
      let msg = 'Erro na operação';
      try { msg = (await error.context.json()).error || msg; } catch (_) {}
      throw new Error(msg);
    }
    return data;
  },

  async refresh() {
    const isAdmin = ME.perfil === 'admin', canReg = isAdmin || ME.pode_cadastrar;
    toggle('admCadastro', canReg); toggle('admLote', isAdmin);
    toggle('admPerfilWrap', isAdmin); toggle('admGestorWrap', isAdmin);
    const { data, error } = await sb.from('usuarios').select('*').order('nome');
    if (error) return showToast('Erro ao carregar usuários', 'error');
    this.users = data;
    this.renderUsers();
    $('admGestorSel').innerHTML = '<option value="">Selecione o gestor...</option>' + data
      .filter(u => u.ativo && ['gestor', 'admin'].includes(u.perfil))
      .map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.nome)} (${u.perfil})</option>`).join('');
    this.loadAlertas();
  },

  renderUsers() {
    const isAdmin = ME.perfil === 'admin';
    const nomeDe = id => (this.users.find(u => u.id === id) || {}).nome || '—';
    const gestores = this.users.filter(u => u.ativo && ['gestor', 'admin'].includes(u.perfil));
    $('admUsersBody').innerHTML = this.users.map(u => {
      const sel = (isAdmin && u.perfil === 'colaborador')
        ? `<select onchange="Admin.vincularGestor('${u.id}', this.value)" class="glass-input p-1 rounded bg-slate-900 text-[10px]">${gestores.map(g =>
            `<option value="${g.id}" ${g.id === u.gestor_id ? 'selected' : ''}>${escapeHtml(g.nome)}</option>`).join('')}</select>`
        : escapeHtml(nomeDe(u.gestor_id));
      const acoes = (isAdmin && u.id !== ME.id) ? `
        <button onclick="Admin.bloquearUsuario('${u.id}', ${u.ativo})" class="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold">${u.ativo ? 'Bloquear' : 'Desbloquear'}</button>
        <button onclick="Admin.forcarResetSenha('${u.id}')" class="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold">Reset senha</button>` : '';
      return `<tr class="hover:bg-slate-800/30">
        <td class="p-2 text-white">${escapeHtml(u.nome)}</td><td class="p-2 font-mono">${escapeHtml(u.matricula || '—')}</td>
        <td class="p-2 font-mono">${escapeHtml(u.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'))}</td>
        <td class="p-2">${u.perfil}</td><td class="p-2">${sel}</td>
        <td class="p-2 ${u.ativo ? 'text-emerald-400' : 'text-rose-400'}">${u.ativo ? 'Ativo' : 'Bloqueado'}</td>
        <td class="p-2 whitespace-nowrap">${acoes}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="p-3 text-center text-slate-500">Nenhum usuário.</td></tr>';
  },

  async cadastrarAcesso(ev) {
    ev.preventDefault();
    const v = id => $(id).value.trim();
    const payload = { cpf: onlyDigits(v('admCpf')), nome: v('admNome'), matricula: v('admMatricula'), email: v('admEmail'),
      perfil: $('admPerfil').value, gestor_id: $('admGestorSel').value, senha_inicial: $('admSenha').value,
      pode_cadastrar: $('admPodeCadastrar').checked };
    if (!validCPF(payload.cpf)) return showToast('CPF inválido', 'error');
    try { await this.call('create_user', payload); showToast('Acesso cadastrado!', 'success'); ev.target.reset(); this.refresh(); }
    catch (e) { showToast(e.message, 'error'); }
  },

  async vincularGestor(userId, gestorId) {
    try { await this.call('link_manager', { user_id: userId, gestor_id: gestorId }); showToast('Colaborador vinculado ao novo gestor.', 'success'); this.refresh(); }
    catch (e) { showToast(e.message, 'error'); this.refresh(); }
  },
  async bloquearUsuario(userId, ativoAtual) {
    if (!confirm(ativoAtual ? 'Bloquear este usuário?' : 'Desbloquear este usuário?')) return;
    try { await this.call('block_user', { user_id: userId, bloquear: ativoAtual }); showToast('Status atualizado.', 'success'); this.refresh(); }
    catch (e) { showToast(e.message, 'error'); }
  },
  async forcarResetSenha(userId) {
    const nova = prompt('Nova senha temporária (mín. 8 caracteres). O usuário será obrigado a trocá-la no próximo login:');
    if (!nova) return;
    try { await this.call('reset_password', { user_id: userId, nova_senha: nova }); showToast('Senha redefinida.', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  },

  // ---- Protocolo de divergência: painel do gestor ----
  async loadAlertas() {
    const { data, error } = await sb.from('logs_assinatura_divergencia').select('*')
      .eq('tipo', 'contestacao').order('criado_em', { ascending: false }).limit(50);
    if (error) return;
    const abertas = data.filter(a => a.analise_status === 'aberta').length;
    $('alertasCount').textContent = abertas;
    $('alertasList').innerHTML = data.map(a => `
      <div class="p-3 rounded-xl border ${a.analise_status === 'aberta' ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-900/50'} text-xs space-y-1">
        <div class="flex justify-between"><strong class="text-white">${escapeHtml(a.nome_colaborador)} · Matrícula ${escapeHtml(a.matricula)}</strong>
          <span class="text-slate-400">Ref. ${fmtComp(a.competencia)}</span></div>
        <p class="text-slate-300"><b>Justificativa:</b> ${escapeHtml(a.justificativa)}</p>
        <p class="text-[10px] text-slate-500">${new Date(a.criado_em).toLocaleString('pt-BR')}</p>
        ${a.analise_status === 'aberta'
          ? `<button onclick="Admin.resolver('${a.id}')" class="px-2 py-1 bg-emerald-600 rounded text-[10px] font-bold text-white">Registrar parecer e resolver</button>`
          : `<p class="text-emerald-400 text-[10px]">Resolvida: ${escapeHtml(a.parecer_gestor || '')}</p>`}
      </div>`).join('') || '<p class="text-slate-500 text-xs">Nenhuma contestação.</p>';
  },
  async resolver(id) {
    const parecer = prompt('Parecer / resposta ao colaborador:');
    if (!parecer) return;
    const { error } = await sb.rpc('resolver_contestacao', { p_log: id, p_parecer: parecer });
    error ? showToast(error.message, 'error') : (showToast('Contestação resolvida.', 'success'), this.loadAlertas());
  }
};
