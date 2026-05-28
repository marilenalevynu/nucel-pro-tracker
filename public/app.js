/* ── NuCel Pro Tracker — app.js ────────────────────────────
   Estado local + helpers de renderização
   Conecte Google Sheets, Slack e Databricks via API
   nas funções marcadas com "// 🔌 INTEGRAÇÃO"
   ─────────────────────────────────────────────────── */

// ─── DADOS INICIAIS (substitua pela leitura do Google Sheets) ───
// 🔌 INTEGRAÇÃO: carregue os projetos via Google Sheets API
//    GET https://sheets.googleapis.com/v4/spreadsheets/{ID}/values/Projetos
let PROJETOS = [
  {
    id: "PROJ-001",
    title: "Automatização da triagem",
    meta: "Redução de backlog (%)",
    lider: "Bruna Freitas",
    cluster: "N2 — Gerais",
    queue: "nucel-bug",
    job: "nucel_triage_v2",
    status: "Iniciado",
    target: "40%",
    real: "28%",
    result: "pending",
    semana: "Sem 22",
    drive: ""
  },
  {
    id: "PROJ-002",
    title: "Análise diagnóstico Q&T",
    meta: "Taxa de retrabalho (%)",
    lider: "Bruna Freitas",
    cluster: "Q&T",
    queue: "nucel-status",
    job: "nucel_quality",
    status: "Finalizado",
    target: "15%",
    real: "11%",
    result: "success",
    semana: "Sem 18",
    drive: ""
  },
  {
    id: "PROJ-003",
    title: "Misplaced job — triagem N2",
    meta: "Taxa de resolução (%)",
    lider: "Bruna Freitas",
    cluster: "N2 — Gerais",
    queue: "nucel-bug",
    job: "nucel_misplaced",
    status: "Prorrogado",
    target: "90%",
    real: "74%",
    result: "fail",
    semana: "Sem 20",
    drive: ""
  },
  {
    id: "PROJ-004",
    title: "Focal DIM team Brucel",
    meta: "Tempo médio tratativa (min)",
    lider: "Bruna Freitas",
    cluster: "N2 — Rede",
    queue: "nucel-calls-issues",
    job: "nucel_dim_focal",
    status: "Iniciado",
    target: "8 min",
    real: "—",
    result: "pending",
    semana: "Sem 24",
    drive: ""
  },
  {
    id: "PROJ-005",
    title: "Análise 15+ duplicados",
    meta: "Redução de backlog (%)",
    lider: "Bruna Freitas",
    cluster: "N2 — Gerais",
    queue: "nucel-transferencia",
    job: "nucel_duplic_v3",
    status: "Finalizado",
    target: "30%",
    real: "33%",
    result: "success",
    semana: "Sem 19",
    drive: ""
  }
];

// ─── ESTADO DA UI ───────────────────────────────────────────────
let filterStatus = "todos";
let filterLider  = "todos";
let activeLider  = null;

// ─── HELPERS ────────────────────────────────────────────────────
function ini(n) {
  return n.split(" ").map(x => x[0]).join("").slice(0, 2);
}

function rclr(r) {
  return r >= 70 ? "var(--gr)" : r >= 40 ? "var(--am)" : "var(--rd)";
}

function sbadge(s) {
  const m = { Iniciado: "bi", Prorrogado: "bp", Finalizado: "bf", Cancelado: "bc", Arquivado: "ba" };
  return `<span class="BDG ${m[s] || "ba"}">${s}</span>`;
}

function rbadge(r) {
  if (r === "success") return `<span class="RB rs"><i class="ti ti-circle-check"></i> Sucesso</span>`;
  if (r === "fail")    return `<span class="RB rf"><i class="ti ti-circle-x"></i> Não atingido</span>`;
  return `<span class="RB rp"><i class="ti ti-clock"></i> Em apuração</span>`;
}

// ─── SIDEBAR: submenu líderes ────────────────────────────────────
function buildLiderSubmenu() {
  const sub = document.getElementById("subnav-lider");
  const leaders = [...new Set(PROJETOS.map(p => p.lider))].sort();
  sub.innerHTML = leaders.map((nome, i) =>
    `<div class="SNI" onclick="goLider('${nome}',this)" id="sni-${i}">
       <div class="SMAV">${ini(nome)}</div> ${nome}
     </div>`
  ).join("");
}

function toggleLiderMenu(el) {
  const sub = document.getElementById("subnav-lider");
  sub.classList.toggle("open");
  el.classList.toggle("exp");
}

function goLider(nome, sniEl) {
  activeLider = nome;
  clearNav();
  sniEl.classList.add("on");
  document.getElementById("subnav-lider").classList.add("open");
  document.getElementById("ni-lider-toggle").classList.add("exp");
  showPage("lider");
  document.getElementById("ptitle").textContent = nome;
  renderLider(nome);
}

// ─── NAVEGAÇÃO ──────────────────────────────────────────────────
function clearNav() {
  document.querySelectorAll(".NI").forEach(n => n.classList.remove("on"));
  document.querySelectorAll(".SNI").forEach(n => n.classList.remove("on"));
}

function showPage(id) {
  document.querySelectorAll(".PG").forEach(p => p.classList.remove("on"));
  document.getElementById("pg-" + id).classList.add("on");
}

function pg(id, el) {
  activeLider = null;
  clearNav();
  if (el) el.classList.add("on");
  showPage(id);
  const titles = {
    exec:  "Visão Executiva",
    proj:  "Todos os projetos",
    novo:  "Novo Projeto",
    cal:   "Agendar Reunião",
    dados: "Dados & Histórico"
  };
  document.getElementById("ptitle").textContent = titles[id] || id;
  if (id === "proj")  renderProjetos();
  if (id === "exec")  renderExec();
  if (id === "cal")   populateCalProjetos();
}

// ─── EXECUTIVA ──────────────────────────────────────────────────
let execFilter = "todos";

function updateKPIs() {
  const total = PROJETOS.length;
  const wip   = PROJETOS.filter(p => p.status === "Iniciado" || p.status === "Prorrogado").length;
  const succ  = PROJETOS.filter(p => p.result === "success").length;
  const fin   = PROJETOS.filter(p => p.result !== "pending").length;
  const pct   = fin > 0 ? Math.round(succ / fin * 100) : 0;
  const leaders = new Set(PROJETOS.map(p => p.lider)).size;

  document.getElementById("kt").textContent       = total;
  document.getElementById("cnt").textContent      = total;
  document.getElementById("ks-pct").textContent   = pct + "%";
  document.getElementById("ks-wip").textContent   = wip;
  document.getElementById("ks-lid").textContent   = leaders;
  document.getElementById("ks-total").textContent = `▲ ${total} cadastrados`;
  document.getElementById("ks-sub").textContent   = `${succ} de ${fin} metas atingidas`;
  document.getElementById("ks-wip-sub").textContent = `${wip} projetos ativos`;

  const today = new Date();
  document.getElementById("exec-sub").textContent =
    `Projetos NuCel · métricas por líder · ${today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`;
}

function renderExec(f) {
  if (f) execFilter = f;
  updateKPIs();
  const g   = document.getElementById("eg");
  const lm  = {};
  PROJETOS.forEach(p => {
    if (execFilter !== "todos" && p.status !== execFilter) return;
    if (!lm[p.lider]) lm[p.lider] = { p: [], s: 0, t: 0 };
    lm[p.lider].p.push(p);
    lm[p.lider].t++;
    if (p.result === "success") lm[p.lider].s++;
  });

  if (!Object.keys(lm).length) {
    g.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--i3);font-size:12px">Nenhum projeto com este status</div>`;
    return;
  }

  g.innerHTML = Object.entries(lm).map(([nome, d]) => {
    const r = d.t > 0 ? Math.round(d.s / d.t * 100) : 0;
    const c = rclr(r);
    const rows = d.p.map(p =>
      `<div class="MP">
         <div style="flex:1;min-width:0">
           <div class="MTL">${p.title}</div>
           <div class="MMT">${p.meta} · target ${p.target}</div>
         </div>
         <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
           ${sbadge(p.status)}${rbadge(p.result)}
         </div>
       </div>`
    ).join("");

    return `<div class="EC">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
        <div class="MAV" style="width:32px;height:32px;font-size:11px;margin:0;font-weight:700">${ini(nome)}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--ink)">${nome}</div>
          <div style="font-size:10px;color:var(--i6)">M1 · N2</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:15px;font-weight:700;color:${c}">${r}%</div>
          <div style="font-size:9px;color:var(--i3)">SUCESSO</div>
        </div>
      </div>
      <div class="LB"><div class="LBF" style="width:${r}%;background:${c}"></div></div>
      <div style="font-size:10px;color:var(--i3);margin:5px 0 9px">
        ${d.t} projeto${d.t !== 1 ? "s" : ""} · ${d.s} atingido${d.s !== 1 ? "s" : ""}
      </div>
      <div style="border-top:1px solid var(--s3);padding-top:7px">${rows}</div>
    </div>`;
  }).join("");
}

function fe(f, btn) {
  document.querySelectorAll(".SH .FB").forEach(x => x.classList.remove("on"));
  btn.classList.add("on");
  renderExec(f);
}

// ─── PROJETOS ───────────────────────────────────────────────────
function renderProjetos() {
  let d = PROJETOS;
  if (filterStatus !== "todos") d = d.filter(p => p.status === filterStatus);

  document.getElementById("ptb").innerHTML = d.map(p =>
    `<tr>
      <td>
        <div class="PT">${p.title}${p.drive ? ` <a href="${p.drive}" target="_blank" style="color:var(--nu);font-size:10px;font-weight:400;margin-left:4px">↗ Drive</a>` : ""}</div>
        <div class="PM">${p.cluster} · ${p.queue}</div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:4px">
          <div class="MAV">${ini(p.lider)}</div>
          <span style="color:var(--i6)">${p.lider.split(" ")[0]}</span>
        </div>
      </td>
      <td>${sbadge(p.status)}</td>
      <td>
        <div style="font-size:11px;color:var(--ink)">${p.meta}</div>
        <div style="font-size:10px;color:var(--i3)">${p.job}</div>
      </td>
      <td style="font-weight:500;color:var(--ink)">${p.target}</td>
      <td style="font-weight:600;color:${p.real === "—" ? "var(--i3)" : p.result === "success" ? "var(--gr)" : "var(--rd)"}">${p.real}</td>
      <td>${rbadge(p.result)}</td>
      <td style="color:var(--i3);font-size:11px">${p.semana}</td>
    </tr>`
  ).join("");
}

function fp(f, btn) {
  document.querySelectorAll("#sf .FB").forEach(x => x.classList.remove("on"));
  btn.classList.add("on");
  filterStatus = f;
  renderProjetos();
}

// ─── VISÃO POR LÍDER ────────────────────────────────────────────
function renderLider(filtro) {
  const lm = {};
  PROJETOS.forEach(p => {
    if (filtro && filtro !== "todos" && p.lider !== filtro) return;
    if (!lm[p.lider]) lm[p.lider] = [];
    lm[p.lider].push(p);
  });

  document.getElementById("lider-title").textContent =
    filtro && filtro !== "todos" ? filtro : "Todos os líderes";
  document.getElementById("lider-sub").textContent =
    filtro && filtro !== "todos"
      ? `Projetos de ${filtro}`
      : "Clique no nome para expandir os projetos";

  document.getElementById("lc").innerHTML = Object.entries(lm).map(([nome, ps], i) => {
    const s = ps.filter(p => p.result === "success").length;
    const r = Math.round(s / ps.length * 100);
    const c = rclr(r);
    const rows = ps.map(p =>
      `<tr>
        <td><div class="PT">${p.title}</div><div class="PM">${p.meta}</div></td>
        <td>${sbadge(p.status)}</td>
        <td style="font-size:10px;color:var(--i3)">${p.queue}</td>
        <td style="font-weight:500;color:var(--ink)">${p.target}</td>
        <td style="font-weight:600;color:${p.real === "—" ? "var(--i3)" : p.result === "success" ? "var(--gr)" : "var(--rd)"}">${p.real}</td>
        <td>${rbadge(p.result)}</td>
      </tr>`
    ).join("");

    const autoOpen = filtro && filtro !== "todos" ? "open" : "";
    const accId = "acc" + i;

    return `<div class="ACC ${autoOpen}" id="${accId}">
      <div class="ACCH" onclick="togAcc('${accId}')">
        <div style="display:flex;align-items:center;gap:9px">
          <div class="MAV" style="width:32px;height:32px;font-size:12px;margin:0;font-weight:700;flex-shrink:0">${ini(nome)}</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--ink)">${nome}</div>
            <div style="font-size:11px;color:var(--i6);margin-top:1px">
              ${ps.length} projeto${ps.length !== 1 ? "s" : ""} · ${s} atingido${s !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:700;color:${c}">${r}%</div>
            <div style="font-size:9px;color:var(--i3);text-transform:uppercase;letter-spacing:.04em">sucesso</div>
          </div>
          <i class="ti ti-chevron-down ACHV"></i>
        </div>
      </div>
      <div class="ACCB">
        <table>
          <thead>
            <tr><th>Projeto</th><th>Status</th><th>Queue</th><th>Target</th><th>Real</th><th>Resultado</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }).join("") || `<div style="text-align:center;padding:32px;color:var(--i3);font-size:12px">Nenhum projeto encontrado</div>`;
}

function togAcc(id) {
  document.getElementById(id).classList.toggle("open");
}

// ─── AGENDAR REUNIÃO ────────────────────────────────────────────
function populateCalProjetos() {
  const sel = document.getElementById("calP");
  sel.innerHTML = `<option value="">Selecionar projeto...</option>` +
    PROJETOS.map(p => `<option value="${p.id}">${p.title}</option>`).join("");
}

function showSlots() {
  const val  = document.getElementById("calP").value;
  const wrap = document.getElementById("calSlots");
  if (!val) { wrap.style.display = "none"; return; }
  const proj = PROJETOS.find(p => p.id === val);
  document.getElementById("calMembers").innerHTML =
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
       <div class="MAV" style="margin-right:0">${ini(proj.lider)}</div>
       <span style="margin-left:7px">Projeto: <strong style="color:var(--ink)">${proj.title}</strong></span>
     </div>
     Consultando Google Agenda dos integrantes...
     <!-- 🔌 INTEGRAÇÃO: chame a Google Calendar freebusy API aqui -->`;
  wrap.style.display = "block";
}

// ─── NOVO PROJETO ───────────────────────────────────────────────
function sv(e) {
  e.preventDefault();
  const t = document.getElementById("nT").value.trim();
  const l = document.getElementById("nL").value;
  const qs = Array.from(document.querySelectorAll("#qc .CH.on")).map(x => x.textContent);
  const m  = document.getElementById("nM").value || "A definir";
  const tg = document.getElementById("nTg").value || "—";
  const j  = document.getElementById("nJ").value  || "—";
  const c  = document.getElementById("nC").value  || "—";
  const st = document.getElementById("nSt").value;
  const dr = document.getElementById("nD").value  || "";

  const newProj = {
    id:      "PROJ-" + String(PROJETOS.length + 1).padStart(3, "0"),
    title:   t,
    meta:    m,
    lider:   l,
    cluster: c,
    queue:   qs[0] || "—",
    job:     j,
    status:  st,
    target:  tg,
    real:    "—",
    result:  "pending",
    semana:  document.getElementById("nW").value || "Sem. atual",
    drive:   dr
  };

  PROJETOS.push(newProj);

  // 🔌 INTEGRAÇÃO: salve no Google Sheets aqui
  //    POST /api/projetos  body: newProj
  // 🔌 INTEGRAÇÃO: notifique o Slack aqui
  //    POST webhook com mensagem de novo projeto

  // Audit Log (local por enquanto)
  console.log("[AUDIT]", new Date().toISOString(), "CREATE", newProj.id, newProj.title);

  // Atualiza UI
  buildLiderSubmenu();
  renderExec();
  updateKPIs();

  document.getElementById("mdet").innerHTML =
    `<b style="color:var(--ink)">Projeto:</b> ${t}<br>
     <b style="color:var(--ink)">Líder:</b> ${l}<br>
     <b style="color:var(--ink)">Cluster:</b> ${c}<br>
     <b style="color:var(--ink)">Queues:</b> ${qs.join(", ") || "—"}<br>
     <b style="color:var(--ink)">Job Databricks:</b> ${j}<br>
     <b style="color:var(--ink)">Métrica:</b> ${m}<br>
     <b style="color:var(--ink)">Target:</b> ${tg}`;

  document.getElementById("mo").classList.add("open");

  // reset form
  document.getElementById("formNovo").reset();
  document.querySelectorAll("#qc .CH.on").forEach(x => x.classList.remove("on"));
}

function closeMo() {
  document.getElementById("mo").classList.remove("open");
  pg("proj", document.querySelector(".NI[onclick*='proj']"));
}

// ─── CHIPS (queues) ──────────────────────────────────────────────
function tc(el) { el.classList.toggle("on"); }

// ─── TEMA ───────────────────────────────────────────────────────
function thm() {
  const root = document.getElementById("R");
  const dark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", dark ? "light" : "dark");
  document.getElementById("tth").textContent = dark ? "☀️" : "🌙";
  localStorage.setItem("nucel-theme", dark ? "light" : "dark");
}

// ─── INIT ───────────────────────────────────────────────────────
(function init() {
  // Restaurar tema salvo
  const saved = localStorage.getItem("nucel-theme");
  if (saved === "dark") {
    document.getElementById("R").setAttribute("data-theme", "dark");
    document.getElementById("tth").textContent = "🌙";
  }

  buildLiderSubmenu();
  renderExec();
  renderProjetos();
  updateKPIs();
})();
