// ==========================================
        // INITIAL DATA & PERSISTENCE (LOCAL STORAGE)
        // ==========================================
        const DEFAULT_EMPLOYEES = [
            { id: 1, name: "Juliana Alencar", role: "Head de Gente & Gestão", dept: "Recursos Humanos", admission: "10/10/2022", salary: 14500, status: "Ativo", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80" },
            { id: 2, name: "Lucas Mendes", role: "Backend Developer Sr.", dept: "Tecnologia", admission: "15/01/2023", salary: 11200, status: "Ativo", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" },
            { id: 3, name: "Camila Rodrigues", role: "UX/UI Lead Designer", dept: "Produto", admission: "04/05/2023", salary: 9800, status: "Ativo", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" },
            { id: 4, name: "Carlos Eduardo", role: "Analista Financeiro Pl.", dept: "Financeiro", admission: "12/08/2024", salary: 6500, status: "Férias", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" }
        ];

        const DEFAULT_REQUESTS = [
            { id: 101, type: "Atestado Médico", employee: "Carlos Eduardo", date: "2026-10-20", days: "2 dias", obs: "Gripe forte / CID J11", status: "Pendente" },
            { id: 102, type: "Solicitação de Férias", employee: "Mariana Costa", date: "2026-11-01", days: "15 dias", obs: "1º período aquisitivo", status: "Pendente" }
        ];

        const DEFAULT_CANDIDATES = [
            { id: 1, name: "Gabriel Siqueira", role: "DevOps Engineer", source: "LinkedIn", col: 1 },
            { id: 2, name: "Beatriz Lima", role: "Product Manager", source: "Gupy", col: 2 },
            { id: 3, name: "Marcos Paulo", role: "Tech Lead Mobile", source: "Indicação", col: 3 },
            { id: 4, name: "Amanda Rocha", role: "QA Automation", source: "LinkedIn", col: 4 }
        ];

        let employees = JSON.parse(localStorage.getItem('onflow_employees')) || DEFAULT_EMPLOYEES;
        let requests = JSON.parse(localStorage.getItem('onflow_requests')) || DEFAULT_REQUESTS;
        let candidates = JSON.parse(localStorage.getItem('onflow_candidates')) || DEFAULT_CANDIDATES;
        let punchLogs = (JSON.parse(localStorage.getItem('onflow_punch')) || [
            { id: 'seed_1', time: "08:02:14", emp: "Juliana Alencar", type: "Entrada", status: "Aprovado", lat: null, lng: null, photoBase64: null },
            { id: 'seed_2', time: "08:15:00", emp: "Lucas Mendes", type: "Entrada", status: "Aprovado", lat: null, lng: null, photoBase64: null }
        ]).map((p, i) => ({
            id: p.id || `legacy_${i}_${p.time}`,
            time: p.time, emp: p.emp, type: p.type,
            status: p.status || 'Aprovado',
            lat: p.lat ?? null, lng: p.lng ?? null, photoBase64: p.photoBase64 ?? null
        }));

        function saveData() {
            try {
                localStorage.setItem('onflow_employees', JSON.stringify(employees));
                localStorage.setItem('onflow_requests', JSON.stringify(requests));
                localStorage.setItem('onflow_candidates', JSON.stringify(candidates));
                localStorage.setItem('onflow_punch', JSON.stringify(punchLogs));
            } catch (e) {
                console.warn('localStorage cheio:', e);
                showToast('Armazenamento local cheio. Conecte o backend para guardar as fotos.', 'warning');
            }
        }

        // ==========================================
        // SYSTEM CLOCK
        // ==========================================
        function updateClocks() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('pt-BR');
            const shortStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const el1 = document.getElementById('liveClockGlobal');
            const el2 = document.getElementById('desktopClockPonto');
            const el3 = document.getElementById('mobileClockTime');
            const el4 = document.getElementById('mobileClockLarge');

            if(el1) el1.innerText = timeStr;
            if(el2) el2.innerText = timeStr;
            if(el3) el3.innerText = shortStr;
            if(el4) el4.innerText = timeStr;
        }
        setInterval(updateClocks, 1000);

        // ==========================================
        // SWITCH DUAL MAIN VIEWS (DESKTOP / MOBILE)
        // ==========================================
        function switchMainView(view) {
            const deskPortal = document.getElementById('desktopPortalView');
            const mobPortal = document.getElementById('mobilePortalView');
            const btnD = document.getElementById('btnViewDesktop');
            const btnM = document.getElementById('btnViewMobile');

            if (view === 'desktop') {
                stopCamera();
                deskPortal.classList.remove('hidden');
                mobPortal.classList.add('hidden');
                btnD.className = "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-md";
                btnM.className = "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white";
            } else {
                deskPortal.classList.add('hidden');
                mobPortal.classList.remove('hidden');
                btnM.className = "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-md";
                btnD.className = "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white";
            }
        }

        // ==========================================
        // DESKTOP NAVIGATION
        // ==========================================
        function navDesktop(tab) {
            const tabs = ['admin', 'dashboard', 'colaboradores', 'ponto', 'atestados', 'recrutamento', 'copilot'];
            tabs.forEach(t => {
                document.getElementById(`tab-${t}-content`).classList.add('hidden');
                const btn = document.getElementById(`nav-${t}`);
                if(btn) {
                    btn.className = "nav-item flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all";
                }
            });

            document.getElementById(`tab-${tab}-content`).classList.remove('hidden');
            if (tab === 'admin' && typeof Admin !== 'undefined') Admin.refresh();
            const activeBtn = document.getElementById(`nav-${tab}`);
            if(activeBtn) {
                activeBtn.className = "nav-item active flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-indigo-400 bg-indigo-600/10 border border-indigo-500/20 transition-all";
            }

            // Update titles
            const titles = {
                admin: ["Administração & Holerites", "Acessos, equipes, lote de holerites e divergências."],
                dashboard: ["Dashboard de Gestão & People Analytics", "Visão holística de talentos, frequência e KPIs."],
                colaboradores: ["Diretório 360° de Colaboradores", "Gestão de cargos, departamentos e remuneração."],
                ponto: ["Ponto Eletrônico & Biometria GPS", "Auditoria de batidas em tempo real."],
                atestados: ["Central de Atestados & Férias", "Gestão de ausências e fila de aprovações."],
                recrutamento: ["Recrutamento & Seleção (Kanban)", "Pipeline dinâmico de novos talentos."],
                copilot: ["Inteligência Artificial HR Copilot", "Insights preditivos e automações."]
            };
            document.getElementById('desktopTitle').innerText = titles[tab][0];
            document.getElementById('desktopSubTitle').innerText = titles[tab][1];

            if(tab === 'dashboard') drawCharts();
        }

        // ==========================================
        // MOBILE NAVIGATION
        // ==========================================
        function switchMobileTab(tab) {
            const mTabs = ['inicio', 'ponto', 'atestados', 'holerite', 'perfil'];
            mTabs.forEach(t => {
                document.getElementById(`m-tab-${t}`).classList.add('hidden');
                const b = document.getElementById(`mNav-${t}`);
                if(b) b.className = "m-nav-btn flex flex-col items-center text-slate-400 hover:text-white";
            });

            document.getElementById(`m-tab-${tab}`).classList.remove('hidden');
            const activeB = document.getElementById(`mNav-${tab}`);
            if(activeB) activeB.className = "m-nav-btn active flex flex-col items-center text-indigo-400";

            // Câmera só fica ligada na aba de ponto
            if (tab === 'ponto') startCamera(); else stopCamera();
            if (tab === 'holerite' && typeof Holerites !== 'undefined' && ME) Holerites.load();
        }

        // ==========================================
        // RENDER EMPLOYEES TABLE
        // ==========================================
        function renderEmployees() {
            const tbody = document.getElementById('employeeTableBody');
            if(!tbody) return;
            tbody.innerHTML = '';

            employees.forEach(emp => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-800/40 transition-colors";
                tr.innerHTML = `
                    <td class="p-4 flex items-center gap-3">
                        <img src="${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="w-8 h-8 rounded-xl object-cover border border-slate-700">
                        <div>
                            <strong class="text-white block font-bold">${emp.name}</strong>
                            <span class="text-[10px] text-slate-400">ID #${100 + emp.id}</span>
                        </div>
                    </td>
                    <td class="p-4">
                        <span class="text-slate-200 block font-medium">${emp.role}</span>
                        <span class="text-[10px] text-slate-400">${emp.dept}</span>
                    </td>
                    <td class="p-4 text-slate-300 font-mono">${emp.admission}</td>
                    <td class="p-4 text-slate-200 font-mono font-bold">R$ ${Number(emp.salary).toLocaleString('pt-BR')}</td>
                    <td class="p-4">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${emp.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                            ${emp.status}
                        </span>
                    </td>
                    <td class="p-4 text-right">
                        <button onclick="deleteEmployee(${emp.id})" class="text-rose-400 hover:text-rose-300 p-1"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('kpiTotalEmp').innerText = employees.length;
        }

        function filterEmployees() {
            const query = document.getElementById('inputSearchEmp').value.toLowerCase();
            const dept = document.getElementById('selectDeptFilter').value;

            const filtered = employees.filter(e => {
                const matchesSearch = e.name.toLowerCase().includes(query) || e.role.toLowerCase().includes(query);
                const matchesDept = dept === 'ALL' || e.dept === dept;
                return matchesSearch && matchesDept;
            });

            const tbody = document.getElementById('employeeTableBody');
            tbody.innerHTML = '';
            filtered.forEach(emp => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-800/40 transition-colors";
                tr.innerHTML = `
                    <td class="p-4 flex items-center gap-3">
                        <img src="${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="w-8 h-8 rounded-xl object-cover">
                        <div><strong class="text-white block font-bold">${emp.name}</strong></div>
                    </td>
                    <td class="p-4"><span class="text-slate-200">${emp.role}</span></td>
                    <td class="p-4 text-slate-300 font-mono">${emp.admission}</td>
                    <td class="p-4 text-slate-200 font-mono font-bold">R$ ${Number(emp.salary).toLocaleString('pt-BR')}</td>
                    <td class="p-4"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">${emp.status}</span></td>
                    <td class="p-4 text-right"><button onclick="deleteEmployee(${emp.id})" class="text-rose-400 p-1"><i class="fa-solid fa-trash"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        }

        function handleAddEmployee(e) {
            e.preventDefault();
            const newEmp = {
                id: Date.now(),
                name: document.getElementById('addEmpName').value,
                role: document.getElementById('addEmpRole').value,
                dept: document.getElementById('addEmpDept').value,
                admission: new Date().toLocaleDateString('pt-BR'),
                salary: Number(document.getElementById('addEmpSalary').value),
                status: "Ativo",
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
            };

            employees.push(newEmp);
            saveData();
            renderEmployees();
            closeModal('modalNewEmployee');
            showToast('Colaborador admitido com sucesso!', 'success');
        }

        function deleteEmployee(id) {
            employees = employees.filter(e => e.id !== id);
            saveData();
            renderEmployees();
            showToast('Registro excluído!', 'info');
        }

        // ==========================================
        // RENDER APPROVAL QUEUE (REQUESTS)
        // ==========================================
        function renderRequests(filter = 'ALL') {
            const container = document.getElementById('approvalQueueContainer');
            if(!container) return;
            container.innerHTML = '';

            const list = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

            list.forEach(req => {
                const card = document.createElement('div');
                card.className = "p-3 rounded-2xl glass-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3";
                card.innerHTML = `
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-white">${req.employee}</span>
                            <span class="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md font-bold">${req.type}</span>
                        </div>
                        <p class="text-[11px] text-slate-400">Início: ${req.date} • Duração: ${req.days}</p>
                        <p class="text-[10px] text-slate-500 italic">"${req.obs}"</p>
                    </div>
                    <div class="flex items-center gap-2 self-end sm:self-center">
                        ${req.status === 'Pendente' ? `
                            <button onclick="updateRequestStatus(${req.id}, 'Aprovado')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md">Aprovar</button>
                            <button onclick="updateRequestStatus(${req.id}, 'Recusado')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold">Recusar</button>
                        ` : `
                            <span class="px-3 py-1 rounded-xl text-xs font-bold ${req.status === 'Aprovado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">${req.status}</span>
                        `}
                    </div>
                `;
                container.appendChild(card);
            });

            const pending = requests.filter(r => r.status === 'Pendente').length;
            document.getElementById('badgePendingCount').innerText = pending;
        }

        function handleAdminRequestSubmit(e) {
            e.preventDefault();
            const newReq = {
                id: Date.now(),
                type: document.getElementById('reqType').value,
                employee: document.getElementById('reqEmployee').value,
                date: document.getElementById('reqStartDate').value,
                days: document.getElementById('reqDays').value,
                obs: document.getElementById('reqObs').value || "Sem observações",
                status: "Pendente"
            };
            requests.unshift(newReq);
            saveData();
            renderRequests();
            showToast('Solicitação registrada na fila de aprovações!', 'success');
        }

        function handleMobileRequestSubmit(e) {
            e.preventDefault();
            const type = document.getElementById('mReqType').value;
            let days = "Atestado";
            if(type === 'Solicitação de Férias') {
                days = document.getElementById('mVacationDays').value + " dias";
                if(document.getElementById('mAbonoCheck').checked) days += " (c/ Abono)";
            }

            const newReq = {
                id: Date.now(),
                type: type,
                employee: "Juliana Alencar",
                date: document.getElementById('mReqDate').value,
                days: days,
                obs: "Solicitado via PWA App Mobile",
                status: "Pendente"
            };
            requests.unshift(newReq);
            saveData();
            renderRequests();
            showToast('Solicitação enviada ao RH!', 'success');
            switchMobileTab('inicio');
        }

        function updateRequestStatus(id, newStatus) {
            const req = requests.find(r => r.id === id);
            if(req) {
                req.status = newStatus;
                saveData();
                renderRequests();
                showToast(`Solicitação ${newStatus.toLowerCase()}!`, 'info');
            }
        }

        function filterApprovalStatus(st) {
            renderRequests(st);
        }

        // ==========================================
        // RENDER RECRUITMENT KANBAN
        // ==========================================
        function renderKanban() {
            for(let i=1; i<=4; i++) {
                const col = document.getElementById(`kanbanCol${i}`);
                if(col) col.innerHTML = '';
            }

            candidates.forEach(cand => {
                const colContainer = document.getElementById(`kanbanCol${cand.col}`);
                if(!colContainer) return;

                const card = document.createElement('div');
                card.className = "glass-card p-3 rounded-xl space-y-2 border border-slate-800 hover:border-purple-500/40 transition-all";
                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <strong class="text-xs text-white block font-bold">${cand.name}</strong>
                        <span class="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">${cand.source}</span>
                    </div>
                    <p class="text-[10px] text-indigo-400 font-medium">${cand.role}</p>
                    <div class="flex justify-between items-center pt-2 border-t border-slate-800/80">
                        ${cand.col > 1 ? `<button onclick="moveCandidate(${cand.id}, ${cand.col - 1})" class="text-[10px] text-slate-400 hover:text-white"><i class="fa-solid fa-arrow-left"></i></button>` : '<div></div>'}
                        ${cand.col < 4 ? `<button onclick="moveCandidate(${cand.id}, ${cand.col + 1})" class="text-[10px] text-purple-400 hover:text-purple-300 font-bold">Avançar <i class="fa-solid fa-arrow-right"></i></button>` : '<span class="text-[9px] text-emerald-400 font-bold">Contratado</span>'}
                    </div>
                `;
                colContainer.appendChild(card);
            });

            // Update column counts
            for(let i=1; i<=4; i++) {
                const count = candidates.filter(c => c.col === i).length;
                const badge = document.getElementById(`colCount${i}`);
                if(badge) badge.innerText = count;
            }
        }

        function moveCandidate(id, targetCol) {
            const cand = candidates.find(c => c.id === id);
            if(cand) {
                cand.col = targetCol;
                saveData();
                renderKanban();
                showToast('Candidato movido de etapa!', 'success');
            }
        }

        function handleAddCandidateSubmit(e) {
            e.preventDefault();
            const newCand = {
                id: Date.now(),
                name: document.getElementById('candName').value,
                role: document.getElementById('candRole').value,
                source: document.getElementById('candSource').value,
                col: 1
            };
            candidates.push(newCand);
            saveData();
            renderKanban();
            closeModal('modalCandidate');
            showToast('Candidato incluído na Triagem!', 'success');
        }

        // ==========================================
        // PONTO: BIOMETRIA FACIAL + GPS (MOBILE) E FILA DE VALIDAÇÃO (GESTOR)
        // ==========================================
        const CURRENT_EMPLOYEE = { id: 1, name: "Juliana Alencar" }; // trocar pelo usuário logado
        const PHOTO_MAX_WIDTH = 480;   // redimensiona a foto (economiza localStorage/banda)
        const PHOTO_QUALITY = 0.6;     // JPEG 0..1
        const GPS_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        
        let cameraStream = null;
        let isSubmittingPunch = false;
        
        function escapeHtml(str) {
            return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }
        
        function newPunchId() {
            return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
        
        // Aceita o formato antigo ("08:02:14") e ISO ("2026-11-09T13:45:00.000Z")
        function formatPunchTime(t) {
            if (!t) return '--:--:--';
            if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return t;
            const d = new Date(t);
            return isNaN(d) ? String(t) : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        
        // Migra registros antigos do localStorage (formato { time, emp, type, valid })
        function normalizePunch(p, i) {
            return {
                id: p.id || `legacy_${i}_${p.time}`,
                time: p.time,
                emp: p.emp,
                type: p.type,
                status: p.status || 'Aprovado',
                lat: p.lat ?? null,
                lng: p.lng ?? null,
                photoBase64: p.photoBase64 ?? null
            };
        }
        
        // ------------------------------------------
        // 1) CÂMERA
        // ------------------------------------------
        async function startCamera() {
            const video = document.getElementById('punchVideo');
            const status = document.getElementById('cameraStatus');
            const btn = document.getElementById('btnPunchMobile');
            if (!video) return;
            if (cameraStream) return; // já ativa
        
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                if (status) status.textContent = 'Câmera indisponível. Use HTTPS e um navegador compatível.';
                showToast('Câmera indisponível neste dispositivo/navegador (requer HTTPS).', 'error');
                return;
            }
        
            try {
                if (status) status.textContent = 'Iniciando câmera...';
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false
                });
                video.srcObject = cameraStream;
                await video.play();
                video.classList.remove('hidden');
                if (status) status.textContent = 'Posicione o rosto no centro e toque em bater ponto.';
                if (btn) btn.disabled = false;
            } catch (err) {
                cameraStream = null;
                const msgs = {
                    NotAllowedError: 'Permissão da câmera negada. Libere o acesso nas configurações do navegador.',
                    NotFoundError: 'Nenhuma câmera encontrada neste dispositivo.',
                    NotReadableError: 'A câmera está em uso por outro aplicativo.'
                };
                const msg = msgs[err.name] || 'Não foi possível acessar a câmera.';
                if (status) status.textContent = msg;
                if (btn) btn.disabled = true;
                showToast(msg, 'error');
            }
        }
        
        function stopCamera() {
            if (cameraStream) {
                cameraStream.getTracks().forEach(t => t.stop());
                cameraStream = null;
            }
            const video = document.getElementById('punchVideo');
            if (video) {
                video.pause();
                video.srcObject = null;
            }
        }
        
        // Captura o frame atual do <video> no <canvas> invisível e devolve Base64 (JPEG)
        function capturePhotoBase64() {
            const video = document.getElementById('punchVideo');
            const canvas = document.getElementById('punchCanvas');
            if (!video || !canvas || !video.videoWidth) throw new Error('Câmera não está pronta.');
        
            const scale = Math.min(1, PHOTO_MAX_WIDTH / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
        }
        
        // ------------------------------------------
        // 2) GPS
        // ------------------------------------------
        function getCurrentPositionAsync() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) return reject({ code: 0, message: 'Geolocalização não suportada.' });
                navigator.geolocation.getCurrentPosition(resolve, reject, GPS_OPTIONS);
            });
        }
        
        function gpsErrorMessage(err) {
            if (err && err.code === 1) return 'Permissão de localização negada. Libere o GPS para bater o ponto.';
            if (err && err.code === 2) return 'Localização indisponível. Verifique o GPS e tente novamente.';
            if (err && err.code === 3) return 'Tempo esgotado ao obter a localização. Tente novamente.';
            return 'Não foi possível obter a localização.';
        }
        
        // ------------------------------------------
        // 3) ENVIO (ponto único de integração com a API)
        // ------------------------------------------
        async function submitPunchData(data) {
            // >>> Plugue aqui seu backend. Exemplos:
            //
            // Supabase:
            //   const { data: row, error } = await supabase.from('punch_logs').insert(data).select().single();
            //   if (error) throw error;
            //   return row;
            //
            // REST:
            //   const res = await fetch('/api/punches', {
            //       method: 'POST',
            //       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            //       body: JSON.stringify(data)
            //   });
            //   if (!res.ok) throw new Error(`Falha ao registrar ponto (${res.status})`);
            //   return await res.json();
            //
            // Hoje: simulação local (a persistência em localStorage ocorre em registerPunchMobile).
            await new Promise(r => setTimeout(r, 300));
            return data;
        }
        
        // Atualização de status pelo gestor (também pronta para API)
        async function updatePunchStatus(id, status) {
            // Supabase: await supabase.from('punch_logs').update({ status }).eq('id', id);
            // REST:     await fetch(`/api/punches/${id}`, { method: 'PATCH', headers: {...}, body: JSON.stringify({ status }) });
            await new Promise(r => setTimeout(r, 150));
            return { id, status };
        }
        
        // ------------------------------------------
        // 4) FLUXO DO COLABORADOR
        // ------------------------------------------
        async function registerPunchMobile() {
            if (isSubmittingPunch) return;
            const btn = document.getElementById('btnPunchMobile');
            const typeSel = document.getElementById('punchTypeSelect');
            const gpsBadge = document.getElementById('mobileGpsBadge');
        
            if (!cameraStream) {
                showToast('Ative a câmera para bater o ponto.', 'warning');
                startCamera();
                return;
            }
        
            isSubmittingPunch = true;
            if (btn) { btn.disabled = true; btn.classList.add('opacity-60'); }
        
            try {
                // Foto e GPS disparados no mesmo instante do clique
                const positionPromise = getCurrentPositionAsync();
                const photoBase64 = capturePhotoBase64();
                const pos = await positionPromise;
        
                const punch = {
                    id: newPunchId(),
                    time: new Date().toISOString(),
                    emp: CURRENT_EMPLOYEE.name,
                    type: typeSel ? typeSel.value : 'Entrada',
                    status: 'Pendente',
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    photoBase64
                };
        
                const saved = await submitPunchData(punch);
        
                stopCamera(); // só encerra após foto + GPS + envio OK
                punchLogs.unshift(saved);
                saveData();
                renderPunches();
        
                if (gpsBadge) gpsBadge.innerHTML = `<i class="fa-solid fa-location-dot"></i> Última posição: ${punch.lat.toFixed(5)}, ${punch.lng.toFixed(5)}`;
                const status = document.getElementById('cameraStatus');
                if (status) status.textContent = 'Ponto enviado para validação do gestor.';
                showToast('Ponto enviado! Aguardando validação do gestor.', 'success');
            } catch (err) {
                console.error('Erro ao registrar ponto:', err);
                const msg = (err && err.code !== undefined) ? gpsErrorMessage(err) : (err && err.message) || 'Erro ao registrar o ponto.';
                showToast(msg, 'error');
            } finally {
                isSubmittingPunch = false;
                if (btn) { btn.classList.remove('opacity-60'); btn.disabled = !cameraStream; }
            }
        }
        
        // ------------------------------------------
        // 5) PAINEL DO GESTOR
        // ------------------------------------------
        function mapsLink(lat, lng) {
            if (lat == null || lng == null) return '<span class="text-slate-500">—</span>';
            return `<a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline font-mono text-[10px] inline-flex items-center gap-1"><i class="fa-solid fa-location-dot"></i> ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}</a>`;
        }
        
        function photoThumb(p) {
            if (p.photoBase64 && p.photoBase64.startsWith('data:image/')) {
                return `<img src="${p.photoBase64}" alt="Foto de ${escapeHtml(p.emp)}" onclick="openPunchPhoto('${escapeHtml(p.id)}')" class="w-12 h-12 rounded-lg object-cover border border-slate-700 cursor-zoom-in hover:border-indigo-500 transition-all">`;
            }
            return `<div class="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600"><i class="fa-solid fa-user-slash"></i></div>`;
        }
        
        function statusBadge(status) {
            const map = {
                'Pendente': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                'Aprovado': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                'Recusado': 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            };
            return `<span class="px-2 py-0.5 rounded border text-[10px] font-bold ${map[status] || map.Pendente}">${escapeHtml(status)}</span>`;
        }
        
        function renderPunches() {
            const pending = punchLogs.filter(p => p.status === 'Pendente');
            const reviewed = punchLogs.filter(p => p.status !== 'Pendente').slice(0, 8);
        
            // Contadores
            const badge = document.getElementById('pendingPunchCount');
            if (badge) badge.textContent = pending.length;
            const side = document.getElementById('pendingPunchSide');
            if (side) side.textContent = pending.length;
        
            // Fila de validação (gestor)
            const tbody = document.getElementById('punchLogsTable');
            if (tbody) {
                if (!pending.length) {
                    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500 text-xs"><i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i> Nenhum ponto pendente de validação.</td></tr>`;
                } else {
                    tbody.innerHTML = pending.map(p => `
                        <tr class="hover:bg-slate-800/30">
                            <td class="p-3">${photoThumb(p)}</td>
                            <td class="p-3 font-mono font-bold text-indigo-400 whitespace-nowrap">${escapeHtml(formatPunchTime(p.time))}</td>
                            <td class="p-3 font-medium text-white">${escapeHtml(p.emp)}</td>
                            <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">${escapeHtml(p.type)}</span></td>
                            <td class="p-3">${mapsLink(p.lat, p.lng)}</td>
                            <td class="p-3 whitespace-nowrap">
                                <button onclick="approvePunch('${escapeHtml(p.id)}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold mr-1"><i class="fa-solid fa-check"></i> Validar</button>
                                <button onclick="rejectPunch('${escapeHtml(p.id)}')" class="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold"><i class="fa-solid fa-xmark"></i> Rejeitar</button>
                            </td>
                        </tr>`).join('');
                }
            }
        
            // Histórico recente (já decididos)
            const hist = document.getElementById('punchHistoryTable');
            if (hist) {
                hist.innerHTML = reviewed.length ? reviewed.map(p => `
                    <tr class="hover:bg-slate-800/30">
                        <td class="p-2 font-mono text-slate-300 whitespace-nowrap">${escapeHtml(formatPunchTime(p.time))}</td>
                        <td class="p-2 text-white">${escapeHtml(p.emp)}</td>
                        <td class="p-2 text-slate-400">${escapeHtml(p.type)}</td>
                        <td class="p-2">${mapsLink(p.lat, p.lng)}</td>
                        <td class="p-2">${statusBadge(p.status)}</td>
                    </tr>`).join('') : `<tr><td colspan="5" class="p-3 text-center text-slate-500">Sem histórico.</td></tr>`;
            }
        
            // Lista mobile (apenas do colaborador logado)
            const mobList = document.getElementById('mobilePunchList');
            if (mobList) {
                const mine = punchLogs.filter(p => p.emp === CURRENT_EMPLOYEE.name).slice(0, 5);
                mobList.innerHTML = mine.length ? mine.map(p => `
                    <div class="flex justify-between items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span class="text-slate-300 font-medium"><i class="fa-solid fa-clock text-emerald-400 mr-2"></i>${escapeHtml(p.type)}</span>
                        <span class="flex items-center gap-2"><span class="font-mono font-bold text-white">${escapeHtml(formatPunchTime(p.time))}</span>${statusBadge(p.status)}</span>
                    </div>`).join('') : `<p class="text-center text-slate-500 text-[11px] py-2">Nenhuma batida registrada.</p>`;
            }
        }
        
        async function reviewPunch(id, status) {
            const punch = punchLogs.find(p => p.id === id);
            if (!punch) return;
            const previous = punch.status;
            punch.status = status;            // atualização otimista
            saveData();
            renderPunches();
            try {
                await updatePunchStatus(id, status);
                showToast(status === 'Aprovado' ? `Ponto de ${punch.emp.split(' ')[0]} validado!` : `Ponto de ${punch.emp.split(' ')[0]} rejeitado.`, status === 'Aprovado' ? 'success' : 'warning');
            } catch (err) {
                punch.status = previous;      // rollback se a API falhar
                saveData();
                renderPunches();
                showToast('Falha ao atualizar o ponto. Tente novamente.', 'error');
            }
        }
        
        function approvePunch(id) { return reviewPunch(id, 'Aprovado'); }
        function rejectPunch(id) { return reviewPunch(id, 'Recusado'); }
        
        // Lightbox da foto
        function openPunchPhoto(id) {
            const p = punchLogs.find(x => x.id === id);
            if (!p || !p.photoBase64) return;
            document.getElementById('punchPhotoFull').src = p.photoBase64;
            document.getElementById('punchPhotoCaption').textContent = `${p.emp} · ${p.type} · ${formatPunchTime(p.time)}`;
            document.getElementById('punchPhotoModal').classList.remove('hidden');
        }
        function closePunchPhoto() {
            document.getElementById('punchPhotoModal').classList.add('hidden');
        }
        
        // Libera a câmera sempre que a aba some / o app vai para segundo plano
        document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
        window.addEventListener('pagehide', stopCamera);

        // ==========================================
        // CANVAS CHARTS GENERATOR
        // ==========================================
        function drawCharts() {
            // Line Chart
            const canvasLine = document.getElementById('canvasLineChart');
            if (canvasLine && canvasLine.getContext) {
                const ctx = canvasLine.getContext('2d');
                canvasLine.width = canvasLine.offsetWidth;
                canvasLine.height = canvasLine.offsetHeight;

                const width = canvasLine.width;
                const height = canvasLine.height;
                const points = [40, 55, 62, 78, 95, 110, 128];
                const labels = ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];

                ctx.clearRect(0, 0, width, height);

                // Grid lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                for(let y = 20; y < height; y += 40) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }

                // Draw Gradient Area
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
                gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

                ctx.beginPath();
                const step = width / (points.length - 1);
                points.forEach((val, i) => {
                    const x = i * step;
                    const y = height - (val / 140) * (height - 40) - 20;
                    if(i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });

                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw Stroke Line
                ctx.beginPath();
                points.forEach((val, i) => {
                    const x = i * step;
                    const y = height - (val / 140) * (height - 40) - 20;
                    if(i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 3;
                ctx.stroke();

                // Draw Points
                points.forEach((val, i) => {
                    const x = i * step;
                    const y = height - (val / 140) * (height - 40) - 20;
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, Math.PI * 2);
                    ctx.fillStyle = '#8b5cf6';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            }

            // Donut Chart
            const canvasDonut = document.getElementById('canvasDonutChart');
            if (canvasDonut && canvasDonut.getContext) {
                const ctx = canvasDonut.getContext('2d');
                canvasDonut.width = canvasDonut.offsetWidth;
                canvasDonut.height = canvasDonut.offsetHeight;

                const centerX = canvasDonut.width / 2;
                const centerY = canvasDonut.height / 2;
                const radius = Math.min(centerX, centerY) - 15;

                const slices = [
                    { percent: 0.40, color: '#6366f1' },
                    { percent: 0.25, color: '#8b5cf6' },
                    { percent: 0.20, color: '#10b981' },
                    { percent: 0.15, color: '#f59e0b' }
                ];

                let currentAngle = -Math.PI / 2;

                slices.forEach(slice => {
                    const sliceAngle = slice.percent * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                    ctx.lineTo(centerX, centerY);
                    ctx.fillStyle = slice.color;
                    ctx.fill();
                    currentAngle += sliceAngle;
                });

                // Inner Circle Cutout
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#111827';
                ctx.fill();
            }
        }

        // ==========================================
        // UI HELPERS & MODALS
        // ==========================================
        function openModalNewEmployee() {
            document.getElementById('modalNewEmployee').classList.remove('hidden');
        }

        function openModalNewRequest() {
            navDesktop('atestados');
        }

        function openModalNewCandidate() {
            document.getElementById('modalCandidate').classList.remove('hidden');
        }

        function openMobilePayslipModal() {
            document.getElementById('modalPayslip').classList.remove('hidden');
        }

        function openMobileVacationModal() {
            switchMobileTab('atestados');
            document.getElementById('mReqType').value = 'Solicitação de Férias';
            toggleMobileVacationFields();
        }

        function openModalHoleriteGlobal() {
            openMobilePayslipModal();
        }

        function closeModal(id) {
            document.getElementById(id).classList.add('hidden');
        }

        function toggleMobileVacationFields() {
            const val = document.getElementById('mReqType').value;
            const fields = document.getElementById('mVacationFields');
            if(val === 'Solicitação de Férias') fields.classList.remove('hidden');
            else fields.classList.add('hidden');
        }

        function exportCSV() {
            let csv = "ID,Nome,Cargo,Departamento,Salario,Status\n";
            employees.forEach(e => {
                csv += `${e.id},"${e.name}","${e.role}","${e.dept}",${e.salary},${e.status}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "ONFLOW_Folha_Pagamento.csv";
            a.click();
            showToast('Download do relatório CSV iniciado!', 'success');
        }

        function showToast(msg, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            const colors = {
                success: 'bg-emerald-600 border-emerald-400 text-white',
                info: 'bg-indigo-600 border-indigo-400 text-white',
                warning: 'bg-amber-600 border-amber-400 text-white',
                error: 'bg-rose-600 border-rose-400 text-white'
            };
            toast.className = `px-4 py-2.5 rounded-2xl border text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce ${colors[type] || colors.info}`;
            toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${msg}`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        // Window Init
        window.onload = function() {
            renderEmployees();
            renderRequests();
            renderKanban();
            renderPunches();
            drawCharts();

            window.addEventListener('resize', drawCharts);
        };
