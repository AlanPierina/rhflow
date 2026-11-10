pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const TEXTO_ACEITE = '✅ De Acordo: Declaro que recebi a importância líquida discriminada neste recibo e estou ciente e concordo com os valores apresentados. (Ao clicar/responder com Aceite, esta ação registrará sua assinatura digital no sistema).';
const TEXTO_CONTESTAR = '❌ Contestar: Identifiquei uma divergência e não concordo com os valores.';
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

const Holerites = {
  lista: [], atual: null, plano: null, srcBuf: null,

  // =============== COLABORADOR (mobile) ===============
  async load() {
    const box = $('mHoleriteList');
    box.innerHTML = '<p class="text-center text-slate-500 text-xs py-3">Carregando...</p>';
    const { data, error } = await sb.from('holerites').select('id,competencia,status,storage_path,matricula')
      .eq('usuario_id', ME.id).order('competencia', { ascending: false });
    if (error) { box.innerHTML = '<p class="text-center text-rose-400 text-xs">Erro ao carregar holerites.</p>'; return; }
    this.lista = data;
    const badge = { disponivel: ['Aguardando aceite', 'text-amber-300 bg-amber-500/15 border-amber-500/30'],
      aceito: ['Aceito', 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'],
      contestado: ['Contestado', 'text-rose-300 bg-rose-500/15 border-rose-500/30'] };
    box.innerHTML = data.map(h => `
      <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
        <div class="flex justify-between items-center">
          <strong class="text-xs text-white">${fmtComp(h.competencia)}</strong>
          <span class="px-2 py-0.5 rounded border text-[9px] font-bold ${badge[h.status][1]}">${badge[h.status][0]}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="Holerites.visualizar('${h.id}')" class="flex-1 py-2 bg-indigo-600 rounded-lg text-[10px] font-bold text-white"><i class="fa-solid fa-eye"></i> Visualizar</button>
          <button onclick="Holerites.exportar('${h.id}')" class="flex-1 py-2 bg-slate-800 rounded-lg text-[10px] font-bold text-white"><i class="fa-solid fa-download"></i> Exportar (PDF)</button>
        </div>
      </div>`).join('') || '<p class="text-center text-slate-500 text-xs py-3">Nenhum holerite disponível.</p>';
  },

  async avisarPendentes() {
    const { count } = await sb.from('holerites').select('id', { count: 'exact', head: true })
      .eq('usuario_id', ME.id).eq('status', 'disponivel');
    if (count) showToast(`Você tem ${count} holerite(s) aguardando seu aceite.`, 'warning');
  },

  async baixar(h) {   // baixa o PDF autenticado (RLS do Storage) e calcula o hash SHA-256 mostrado ao usuário
    const { data: blob, error } = await sb.storage.from('holerites').download(h.storage_path);
    if (error) throw new Error('Não foi possível baixar o holerite.');
    const buf = await blob.arrayBuffer();
    return { buf, hash: hex(await crypto.subtle.digest('SHA-256', buf)) };
  },

  async visualizar(id) {
    const h = this.lista.find(x => x.id === id);
    try {
      const { buf, hash } = await this.baixar(h);
      this.atual = { ...h, hash };
      if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
      $('hlFrame').src = this.blobUrl;
      $('hlTitulo').textContent = `Holerite ${fmtComp(h.competencia)}`;
      $('hlAceiteTxt').textContent = TEXTO_ACEITE;
      $('hlContestarTxt').textContent = TEXTO_CONTESTAR;
      $('hlJustWrap').classList.add('hidden'); $('hlJust').value = '';
      toggle('hlAcoes', h.status === 'disponivel');
      toggle('hlRespondido', h.status !== 'disponivel');
      $('hlRespondido').textContent = h.status === 'aceito' ? '✅ Você registrou o aceite deste holerite.' : '❌ Contestação enviada ao seu gestor.';
      toggle('holeriteModal', true);
    } catch (e) { showToast(e.message, 'error'); }
  },
  fechar() { toggle('holeriteModal', false); $('hlFrame').src = 'about:blank'; },

  async exportar(id) {
    const h = this.lista.find(x => x.id === id);
    try {
      const { buf } = await this.baixar(h);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
      a.download = `holerite_${h.matricula}_${h.competencia.slice(0, 7)}.pdf`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { showToast(e.message, 'error'); }
  },

  async responder(tipo) {
    const h = this.atual; if (!h) return;
    const just = $('hlJust').value.trim();
    if (tipo === 'contestacao' && just.length < 10) return showToast('Descreva a divergência (mín. 10 caracteres).', 'warning');
    const { error } = await sb.rpc('registrar_resposta', { p_holerite: h.id, p_tipo: tipo, p_justificativa: just || null, p_hash: h.hash });
    if (error) return showToast(error.message, 'error');
    showToast(tipo === 'aceite' ? 'Assinatura digital registrada. Obrigado!' : 'Contestação enviada ao seu gestor.', 'success');
    this.fechar(); this.load();
  },

  // =============== ADMIN: lote de PDF ===============
  async lerPaginas(buf) {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const pg = await pdf.getPage(n), tc = await pg.getTextContent(), rows = new Map();
      for (const it of tc.items) {
        if (!it.str.trim()) continue;
        const k = Math.round(it.transform[5] / 3);
        if (!rows.has(k)) rows.set(k, []);
        rows.get(k).push({ x: it.transform[4], y: it.transform[5], s: it.str });
      }
      const lines = [...rows.values()].map(r => { r.sort((a, b) => a.x - b.x); return { y: r[0].y, text: norm(r.map(i => i.s).join(' ')) }; })
        .sort((a, b) => b.y - a.y);
      pages.push({ i: n - 1, h: pg.getViewport({ scale: 1 }).height, lines });
    }
    return pages;
  },

  async analisar(file) {
    if (!file) return showToast('Selecione o PDF do lote.', 'warning');
    this.srcBuf = await file.arrayBuffer();
    const { data: users } = await sb.from('usuarios').select('id,cpf,nome,matricula').eq('perfil', 'colaborador').eq('ativo', true).not('matricula', 'is', null);
    const byMat = new Map(users.map(u => [u.matricula, u]));
    const pages = await this.lerPaginas(this.srcBuf);

    // 1) localizar "[matrícula 4 dígitos] + [nome]" validando contra a base cadastrada
    const occ = [], semCadastro = new Map();
    for (const pg of pages) for (const ln of pg.lines)
      for (const m of ln.text.matchAll(/\b(\d{4}) ([A-Z][A-Z.' -]{3,})/g)) {
        const u = byMat.get(m[1]);
        if (u) {
          const nome = norm(u.nome);
          if (ln.text.includes(`${m[1]} ${nome}`)) occ.push({ mat: m[1], pg, y: ln.y, exato: true });
          else if (ln.text.includes(`${m[1]} ${nome.split(' ')[0]}`)) occ.push({ mat: m[1], pg, y: ln.y, exato: false });
        } else if (m[2].trim().split(' ').length >= 2) semCadastro.set(m[1], m[2].trim().slice(0, 40));
      }

    // 2) dividir cada página em blocos (vias) e classificar "Via do Empregado" x "Via do Empregador"
    const porPg = new Map();
    occ.forEach(o => { if (!porPg.has(o.pg.i)) porPg.set(o.pg.i, []); porPg.get(o.pg.i).push(o); });
    const blocos = [];
    for (const list of porPg.values()) {
      list.sort((a, b) => b.y - a.y);
      const h = list[0].pg.h, n = list.length;
      list.forEach((o, k) => {
        let top, bottom;
        if (n === 2 && list[0].y > h / 2 && list[1].y <= h / 2) { top = k ? h / 2 : h; bottom = k ? 0 : h / 2; }
        else { top = k ? (list[k - 1].y + o.y) / 2 : h; bottom = k < n - 1 ? (o.y + list[k + 1].y) / 2 : 0; }
        const txt = o.pg.lines.filter(l => l.y <= top && l.y > bottom).map(l => l.text).join(' ');
        const via = /VIA (DO )?EMPREGADOR/.test(txt) ? 'empregador' : /VIA (DO )?EMPREGADO\b/.test(txt) ? 'empregado' : null;
        blocos.push({ ...o, top, bottom, via, parcial: n > 1 });
      });
    }

    // 3) uma via por matrícula
    const grupos = new Map();
    blocos.forEach(b => { if (!grupos.has(b.mat)) grupos.set(b.mat, []); grupos.get(b.mat).push(b); });
    this.plano = [];
    for (const [mat, bs] of grupos) {
      const u = byMat.get(mat), avisos = [];
      const emp = bs.find(b => b.via === 'empregado'), sem = bs.find(b => !b.via);
      const esc = emp || sem;
      if (!esc) { this.plano.push({ mat, u, erro: 'Só a Via do Empregador foi encontrada' }); continue; }
      if (!emp) avisos.push('via sem rótulo — usada a 1ª ocorrência');
      if (!esc.exato) avisos.push('nome diferente do cadastro');
      this.plano.push({ mat, u, bloco: esc, avisos, descartados: bs.length - 1 });
    }
    users.filter(u => !grupos.has(u.matricula)).forEach(u => this.plano.push({ mat: u.matricula, u, erro: 'Não localizado no PDF' }));
    this.semCadastro = [...semCadastro].slice(0, 15);
    this.renderPlano();
  },

  renderPlano() {
    const ok = this.plano.filter(p => !p.erro).length;
    $('lotResumo').textContent = `${ok} holerite(s) prontos · ${this.plano.length - ok} com problema`
      + (this.semCadastro.length ? ` · possíveis matrículas sem usuário: ${this.semCadastro.map(([m, n]) => `${m} ${n}`).join('; ')}` : '');
    $('lotBody').innerHTML = this.plano.map(p => `<tr class="border-t border-slate-800">
      <td class="p-2 font-mono">${escapeHtml(p.mat)}</td><td class="p-2">${escapeHtml(p.u?.nome || '')}</td>
      <td class="p-2 ${p.erro ? 'text-rose-400' : 'text-emerald-400'}">${p.erro ? escapeHtml(p.erro) : 'pág. ' + (p.bloco.pg.i + 1) + (p.bloco.parcial ? ' (' + (p.bloco.top < p.bloco.pg.h ? 'metade inferior' : 'metade superior') + ')' : '') + ' · ' + (p.bloco.via || 'sem rótulo')}</td>
      <td class="p-2 text-amber-300">${escapeHtml((p.avisos || []).join('; '))}</td></tr>`).join('');
    toggle('lotResultado', true);
    $('btnPublicarLote').disabled = ok === 0;
  },

  async gerarPdf(src, b) {
    const out = await PDFLib.PDFDocument.create();
    const [p] = await out.copyPages(src, [b.pg.i]);
    if (b.parcial) {   // recorta só a metade da "Via do Empregado"
      const mb = p.getMediaBox(), y = mb.y + b.bottom, h = b.top - b.bottom;
      p.setMediaBox(mb.x, y, mb.width, h); p.setCropBox(mb.x, y, mb.width, h);
    }
    out.addPage(p);
    return out.save();
  },

  async publicar(competenciaYYYYMM) {
    if (!/^\d{4}-\d{2}$/.test(competenciaYYYYMM)) return showToast('Informe o mês/ano de competência.', 'warning');
    const comp = `${competenciaYYYYMM}-01`, src = await PDFLib.PDFDocument.load(this.srcBuf);
    const { data: ex } = await sb.from('holerites').select('usuario_id,status').eq('competencia', comp);
    const jaRespondido = new Set((ex || []).filter(e => e.status !== 'disponivel').map(e => e.usuario_id));
    const alvo = this.plano.filter(p => !p.erro);
    let ok = 0, ign = 0, err = 0;
    for (const [i, p] of alvo.entries()) {
      $('lotProgresso').textContent = `Publicando ${i + 1}/${alvo.length}...`;
      if (jaRespondido.has(p.u.id)) { ign++; continue; }   // não sobrescreve holerite já aceito/contestado
      try {
        const path = `${p.u.cpf}/${competenciaYYYYMM}/${p.mat}.pdf`;
        const up = await sb.storage.from('holerites').upload(path, await this.gerarPdf(src, p.bloco), { contentType: 'application/pdf', upsert: true });
        if (up.error) throw up.error;
        const { error } = await sb.from('holerites').upsert({ usuario_id: p.u.id, cpf: p.u.cpf, matricula: p.mat, competencia: comp, storage_path: path }, { onConflict: 'usuario_id,competencia' });
        if (error) throw error;
        ok++;
      } catch (e) { err++; console.error(p.mat, e); }
    }
    $('lotProgresso').textContent = `Concluído: ${ok} publicados, ${ign} ignorados (já assinados), ${err} com erro.`;
    showToast('Lote processado.', err ? 'warning' : 'success');
  }
};
