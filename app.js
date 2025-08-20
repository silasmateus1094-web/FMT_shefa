// ===== Auth + RBAC (localStorage) =====
const $ = (q, el=document)=> el.querySelector(q);
const $$ = (q, el=document)=> Array.from(el.querySelectorAll(q));

const MODULES = [
  {key:'dashboard', label:'Dashboard'},
  {key:'iaSinais', label:'IA Sinais', canGenerate:true},
  {key:'iaSmc', label:'IA Pura SMC', canGenerate:true},
  {key:'tecnica', label:'Análise Técnica', canGenerate:true},
  {key:'fundPre', label:'Fundamentalista (Pré)', canGenerate:true},
  {key:'fundLive', label:'Fundamentalista (Ao Vivo)', canGenerate:true},
  {key:'otc', label:'OTC', canGenerate:true},
  {key:'suprema', label:'★ Inteligência Suprema', gold:true, canGenerate:true},
  {key:'banca', label:'Gerenciamento de Banca'},
  {key:'registro', label:'Registro Manual OP'},
  {key:'admin', label:'Admin'}
];

const DEFAULT_PERMS = {
  iaSinais:'rw', iaSmc:'rw', tecnica:'rw', fundPre:'rw', fundLive:'rw', otc:'rw',
  suprema:'none', banca:'rw', registro:'rw', admin:'none'
};

function loadDB(){
  const raw = localStorage.getItem('fmt_users');
  if(!raw){
    const seed = [{
      email:'admin@fmt',
      name:'Administrador',
      role:'admin',
      pass:'LvgxWtndXM',
      perms: {...DEFAULT_PERMS, suprema:'rw', admin:'rw'}
    }];
    localStorage.setItem('fmt_users', JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}
function saveDB(db){ localStorage.setItem('fmt_users', JSON.stringify(db)); }

let USERS = loadDB();
let CURRENT = null;

function login(email, pass){
  const u = USERS.find(x=> x.email===email && x.pass===pass);
  if(!u) return null;
  CURRENT = u;
  sessionStorage.setItem('fmt_current', JSON.stringify(u));
  return u;
}
function restoreSession(){
  const raw = sessionStorage.getItem('fmt_current');
  if(raw){ CURRENT = JSON.parse(raw); }
}
restoreSession();

// ===== SPA Routing =====
const routes = {
  dashboard: renderDashboard,
  iaSinais: () => renderSignals('IA Sinais'),
  iaSmc: () => renderSignals('IA Pura SMC', {smcOnly:true}),
  tecnica: () => renderSignals('Análise Técnica', {techOnly:true}),
  fundPre: () => renderSignals('Fundamentalista (Pré)', {fundPre:true}),
  fundLive: () => renderSignals('Fundamentalista (Ao Vivo)', {fundLive:true}),
  otc: () => renderSignals('OTC', {otc:true}),
  suprema: () => renderSignals('★ Inteligência Suprema', {supreme:true}),
  banca: renderBanca,
  registro: renderRegistro,
  admin: renderAdmin
};

function fmtTime(d){ return d.toTimeString().split(' ')[0]; }
function now(){ return new Date(); }

function navTo(key){
  if(!CURRENT){ return; }
  // permission check
  if(key!=='dashboard'){
    const perm = CURRENT.perms?.[key] || 'none';
    if(perm==='none'){ alert('Acesso negado.'); return; }
  }
  $$(".nav-item").forEach(b=> b.classList.toggle('active', b.dataset.route===key));
  routes[key] ? routes[key]() : renderDashboard();
  history.replaceState({}, "", `#${key}`);
}

function buildMenu(){
  const menu = $("#menu"); menu.innerHTML = "";
  MODULES.forEach(m => {
    if(m.key!=='dashboard'){
      const perm = CURRENT?.perms?.[m.key] || 'none';
      if(perm==='none') return;
    }
    const btn = document.createElement('button');
    btn.className = 'nav-item' + (m.gold?' gold':'');
    btn.textContent = m.label;
    btn.dataset.route = m.key;
    btn.onclick = ()=> navTo(m.key);
    menu.appendChild(btn);
  });
}

function showApp(){
  $(".sidebar").style.display = "";
  $("#app").style.display = "";
  $("#auth").style.display = "none";
  $("#who").textContent = `${CURRENT.name} (${CURRENT.role})`;
  buildMenu();
  const initial = location.hash?.replace('#','') || 'dashboard';
  navTo(initial);
}

window.addEventListener('DOMContentLoaded', ()=>{
  $("#btnLogin").addEventListener('click', ()=>{
    const ok = login($("#loginEmail").value.trim(), $("#loginPass").value.trim());
    if(ok) showApp(); else $("#loginMsg").textContent = "Credenciais inválidas.";
  });
  if(CURRENT) showApp();
});

// ===== Mock Sinais =====
const PAIRS = ["EUR/USD","GBP/USD","USD/JPY","AUD/CAD","CAD/CHF","EUR/JPY","GBP/JPY","USD/CHF","EUR/GBP","NZD/USD","USD/CAD","AUD/JPY","EUR/CHF","GBP/CHF","CAD/JPY"];
const STRATS = ["SMC","Order Block","BOS + FVG","Pullback + POC","Breakout","RSI + MM","Trend + OB","VWAP + Retração","CHoCH + BOS"];

function mockSignals({count=15, smcOnly=false, techOnly=false, fundPre=false, fundLive=false, otc=false, supreme=false}={}){
  const out = [];
  const base = Math.min(count, 15);
  const entryBase = now();
  for(let i=0;i<base;i++){
    const pair = PAIRS[i%PAIRS.length];
    const conf = Math.floor(80 + Math.random()*19); // 80-98 supremo/alta
    const hist = Math.floor(75 + Math.random()*18);
    const isBuy = Math.random() > .5;
    const type = isBuy ? "CALL" : "PUT";
    const strat = smcOnly ? "SMC"
               : techOnly ? STRATS[(i+2)%STRATS.length]
               : fundPre ? "Pré-Evento: Consenso + SMC"
               : fundLive ? "Pós-Evento: Atual x Projeção"
               : otc ? "Padrão Candle + Volatilidade"
               : supreme ? "Consenso (SMC+Tech+Fund)"
               : STRATS[i%STRATS.length];
    const minutes = [1,2,3,4,5,15][i%6];
    const entryAt = new Date(entryBase.getTime() + (i*12*1000));
    out.push({
      pair, strat, type, conf, hist,
      entry: fmtTime(entryAt),
      exp: `M${minutes}`,
      zone: ["OB","FVG","BOS","POI","Liquidez","Retração"][i%6],
      reason: supreme ? "Convergência 3/3 módulos" :
              fundPre ? "Consenso + histórico favorável" :
              fundLive ? "Desvio do consenso confirmado" :
              techOnly ? "Confluência RSI+MM+Tendência" :
              smcOnly ? "ChoCH + OB + Liquidez" :
              otc ? "Candle pattern + baixa latência" :
              "Alta probabilidade por confluência"
    });
  }
  out.sort((a,b)=> b.conf - a.conf);
  return out;
}

function renderTableSignals(list){
  return `
  <div class="card">
    <div class="row" style="align-items:center; margin-bottom:10px">
      <div class="h2">Sinais</div>
      <div style="text-align:right">
        <button class="btn" id="btnTop10">Top 10</button>
        <button class="btn" id="btnTop15">Top 15</button>
      </div>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>Par</th><th>Estratégia</th><th>Direção</th><th>Expiração</th><th>Zona</th><th>Motivo</th><th>Conf. IA</th><th>% Acerto Est.</th><th>Entrar (HH:MM:SS)</th>
        </tr>
      </thead>
      <tbody id="tbody-signals">
        ${list.map(s => `
          <tr class="tr">
            <td>${s.pair}</td>
            <td>${s.strat}</td>
            <td>${s.type==='CALL' ? `<span class="badge buy">CALL</span>` : `<span class="badge sell">PUT</span>`}</td>
            <td><span class="chip">${s.exp}</span></td>
            <td><span class="chip">${s.zone}</span></td>
            <td>${s.reason}</td>
            <td>${s.conf}%</td>
            <td>${s.hist}%</td>
            <td>${s.entry}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderSignals(title, options={}){
  const app = $("#app");
  app.innerHTML = `
    <div class="h1">${title}</div>
    <div class="card">
      <div class="row" style="align-items:center">
        <div class="p">Clique em <b>Gerar Sinais</b> para listar automaticamente os melhores (prioridade por confiança/qualidade).</div>
        <div style="text-align:right"><button class="btn" id="btnGerar">Gerar Sinais</button></div>
      </div>
    </div>
    <div id="signalsArea"></div>
    <div class="toast" id="toast" style="display:none"></div>
  `;
  $("#btnGerar").addEventListener('click', ()=> {
    $("#btnGerar").disabled = true;
    const toast = $("#toast"); toast.style.display='block'; toast.textContent = 'Processando (≤ 3s)...';
    setTimeout(()=>{
      const list = mockSignals({count:15, ...options});
      $("#signalsArea").innerHTML = renderTableSignals(list);
      $("#btnGerar").disabled = false;
      toast.textContent = 'Pronto! Sinais atualizados.';
      setTimeout(()=> toast.style.display='none', 1600);
      $("#btnTop10").addEventListener('click', ()=> $("#signalsArea").innerHTML = renderTableSignals(list.slice(0,10)));
      $("#btnTop15").addEventListener('click', ()=> $("#signalsArea").innerHTML = renderTableSignals(list.slice(0,15)));
    }, 900);
  });
}

function renderDashboard(){
  const app = $("#app");
  app.innerHTML = `
    <div class="h1">Dashboard</div>
    <div class="row">
      <div class="card">
        <div class="h2">Resumo</div>
        <p class="p">Bem-vindo, ${CURRENT.name}. Use o menu para navegar. Botão <b>Gerar Sinais</b> aparece nos módulos de análise.</p>
        <div class="grid-3">
          <div class="card"><div class="p">IA Sinais</div><div class="h2">Top 15 por confiança</div></div>
          <div class="card"><div class="p">★ Inteligência Suprema</div><div class="h2" style="color:var(--gold)">Consenso dos módulos</div></div>
          <div class="card"><div class="p">Banca</div><div class="h2">Gestão individual por usuário</div></div>
        </div>
      </div>
      <div class="card"><div class="h2">Status</div><p class="p">PRD v2.5 User Control • Visual premium • RBAC • Sem martingale</p></div>
    </div>`;
}

function renderBanca(){
  const app = $("#app");
  const key = `banca_${CURRENT.email}`;
  const saved = JSON.parse(localStorage.getItem(key) || '{"banca":1000,"pct":2,"meta":50}');
  app.innerHTML = `
    <div class="h1">Gerenciamento de Banca</div>
    <div class="row">
      <div class="card">
        <div class="h2">Parâmetros</div>
        <div class="grid-3">
          <div><div class="label">Banca Atual (R$)</div><input id="bancaAtual" class="input" type="number" value="${saved.banca}"/></div>
          <div><div class="label">% por ordem</div><input id="pctOrdem" class="input" type="number" value="${saved.pct}"/></div>
          <div><div class="label">Meta diária (R$)</div><input id="metaDia" class="input" type="number" value="${saved.meta}"/></div>
        </div>
        <div style="margin-top:12px"><button class="btn" id="btnCalc">Atualizar / Calcular</button></div>
      </div>
      <div class="card">
        <div class="h2">Cálculo</div>
        <div id="calcOut" class="p">Preencha e clique em atualizar.</div>
      </div>
    </div>`;
  $("#btnCalc").addEventListener('click', ()=>{
    const banca = parseFloat($("#bancaAtual").value||"0");
    const pct = Math.max(0, Math.min(10, parseFloat($("#pctOrdem").value||"0")));
    const meta = parseFloat($("#metaDia").value||"0");
    const stake = (banca * (pct/100));
    const prog = 0;
    localStorage.setItem(key, JSON.stringify({banca, pct, meta}));
    $("#calcOut").innerHTML = `Stake sugerida: <b>R$ ${stake.toFixed(2)}</b> (${pct}% da banca).<br>
    Progresso em relação à meta: <b>${prog.toFixed(0)}%</b>.<br>
    Política: <span class="badge neutral">Sem Martingale</span>`;
  });
}

function renderRegistro(){
  const app = $("#app");
  const key = `ops_${CURRENT.email}`;
  const rows = JSON.parse(localStorage.getItem(key) || "[]");
  app.innerHTML = `
    <div class="h1">Registro Manual de Operações</div>
    <div class="card">
      <div class="grid-3">
        <div><div class="label">Par</div><input id="rPar" class="input" placeholder="EUR/USD"/></div>
        <div><div class="label">Entrada</div><input id="rEntrada" class="input" placeholder="CALL M2"/></div>
        <div><div class="label">Resultado</div><input id="rRes" class="input" placeholder="WIN / LOSS"/></div>
      </div>
      <div style="margin-top:12px"><button class="btn" id="btnAddReg">Adicionar</button></div>
    </div>
    <div class="card">
      <div class="h2">Histórico</div>
      <table class="table">
        <thead><tr><th>Data</th><th>Par</th><th>Entrada</th><th>Resultado</th></tr></thead>
        <tbody id="tbodyReg"></tbody>
      </table>
      <div class="p" id="acc"></div>
    </div>`;
  function render(){
    $("#tbodyReg").innerHTML = rows.map(r=>`
      <tr class="tr"><td>${r.dt}</td><td>${r.par}</td><td>${r.ent}</td><td>${r.res}</td></tr>
    `).join('');
    const total = rows.length || 1;
    const wins = rows.filter(r=> r.res.toLowerCase().includes('win')).length;
    $("#acc").innerHTML = `Acerto: <b>${((wins/total)*100).toFixed(0)}%</b> (WIN ${wins}/${total})`;
  }
  $("#btnAddReg").addEventListener('click', ()=>{
    rows.push({dt: new Date().toLocaleDateString(), par: $("#rPar").value, ent: $("#rEntrada").value, res: $("#rRes").value});
    localStorage.setItem(key, JSON.stringify(rows));
    render();
  });
  render();
}

function renderAdmin(){
  if(CURRENT.role!=='admin'){ alert('Acesso negado.'); return; }
  const app = $("#app");
  const db = USERS;
  app.innerHTML = `
    <div class="h1">Admin</div>
    <div class="card">
      <div class="h2">Usuários</div>
      <div class="grid-3">
        <div><div class="label">Email</div><input id="uEmail" class="input" placeholder="usuario@fmt"/></div>
        <div><div class="label">Nome</div><input id="uName" class="input" placeholder="Nome"/></div>
        <div><div class="label">Senha</div><input id="uPass" class="input" placeholder="Senha"/></div>
      </div>
      <div class="grid-3" style="margin-top:8px">
        <div><div class="label">Papel</div><input id="uRole" class="input" value="trader"/></div>
        <div><div class="label">Pode ver Suprema?</div><input id="uSup" class="input" value="none / ro / rw" placeholder="none"/></div>
        <div><div class="label">Pode acessar Admin?</div><input id="uAdm" class="input" value="none"/></div>
      </div>
      <button class="btn" id="btnAdd" style="margin-top:12px">Adicionar / Atualizar</button>
    </div>
    <div class="card">
      <div class="h2">Lista</div>
      <table class="table"><thead><tr><th>Email</th><th>Nome</th><th>Papel</th><th>Suprema</th><th>Admin</th></tr></thead>
      <tbody id="tbodyUsers"></tbody></table>
    </div>`;
  function draw(){
    $("#tbodyUsers").innerHTML = db.map(u=>`
      <tr class="tr"><td>${u.email}</td><td>${u.name}</td><td>${u.role}</td><td>${u.perms?.suprema||'none'}</td><td>${u.perms?.admin||'none'}</td></tr>
    `).join('');
  }
  $("#btnAdd").addEventListener('click', ()=>{
    const email = $("#uEmail").value.trim();
    const name = $("#uName").value.trim();
    const pass = $("#uPass").value.trim();
    const role = $("#uRole").value.trim() || 'trader';
    const sup = $("#uSup").value.trim() || 'none';
    const adm = $("#uAdm").value.trim() || 'none';
    let u = db.find(x=> x.email===email);
    if(!u){
      u = {email, name, role, pass, perms:{...DEFAULT_PERMS}};
      db.push(u);
    }else{
      u.name=name; u.role=role; if(pass) u.pass=pass;
    }
    u.perms.suprema = sup;
    u.perms.admin = adm;
    localStorage.setItem('fmt_users', JSON.stringify(db));
    alert('Usuário salvo.');
    draw();
  });
  draw();
}
