// ═══════════════════════════════════════════════════
// ESTADO — carrega dados salvos no navegador
// ═══════════════════════════════════════════════════

// Modelos de quest diária (o "template" recorrente)
// Cada modelo: { id, name, pts }
let dailyModels = JSON.parse(localStorage.getItem('daily-models') || '[]');

// Registros de quests diárias por dia
// Estrutura: { "2025-02-18": { questId: true/false, ... }, ... }
let dailyLog = JSON.parse(localStorage.getItem('daily-log') || '{}');

// Data de hoje no formato "YYYY-MM-DD"
const TODAY = new Date().toISOString().split('T')[0];

// ═══════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// "2025-02-18" → "18/02" (gráfico)
function fmt(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}`;
}

// "2025-02-18" → "18/02/2025" (lista)
function fmtFull(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

// Subtrai N dias de uma data "YYYY-MM-DD"
function subtractDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// Toast — notificação flutuante
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// Salva tudo no localStorage
function save() {
  localStorage.setItem('daily-models', JSON.stringify(dailyModels));
  localStorage.setItem('daily-log', JSON.stringify(dailyLog));
}

// ═══════════════════════════════════════════════════
// STREAK — quantos dias consecutivos a quest foi feita
// ═══════════════════════════════════════════════════

/**
 * Calcula o streak (sequência) de uma quest.
 * Percorre o histórico do dia de hoje para trás,
 * e conta quantos dias seguidos ela foi concluída.
 * 
 * Exemplo: se a quest foi feita nos dias 18, 17, 16, mas não no 15 → streak = 3
 */
function getStreak(questId) {
  let streak = 0;
  let day = subtractDays(TODAY, 1); // começa no dia anterior (hoje ainda pode estar em andamento)

  // Percorre até 365 dias para trás
  for (let i = 0; i < 365; i++) {
    const log = dailyLog[day];
    if (log && log[questId] === true) {
      streak++;
      day = subtractDays(day, 1); // vai para o dia anterior
    } else {
      break; // sequência quebrou
    }
  }
  return streak;
}

// ═══════════════════════════════════════════════════
// QUESTS DIÁRIAS — modelos (templates recorrentes)
// ═══════════════════════════════════════════════════

// Cria um novo modelo de quest diária
function addDailyQuest() {
  const name = document.getElementById('dq-name').value.trim();
  const pts  = parseInt(document.getElementById('dq-pts').value);

  if (!name) { toast('Escreva o nome da quest'); return; }

  // Adiciona o modelo com um ID único
  dailyModels.push({ id: Date.now(), name, pts });
  save();
  render();

  document.getElementById('dq-name').value = '';
  toast('Quest diária criada!');
}

// Remove um modelo de quest (e seus registros históricos)
function deleteDailyModel(id) {
  dailyModels = dailyModels.filter(m => m.id !== id);

  // Remove os registros desta quest de todos os dias
  Object.keys(dailyLog).forEach(day => {
    delete dailyLog[day][id];
  });

  save();
  render();
  toast('Quest removida');
}

// ═══════════════════════════════════════════════════
// QUESTS DIÁRIAS — marcar como feita/não feita
// ═══════════════════════════════════════════════════

/**
 * Alterna o estado de uma quest em um dia específico.
 * 
 * O parâmetro `day` existe porque no histórico também é possível
 * marcar/desmarcar quests de dias anteriores.
 */
function toggleDailyQuest(questId, day) {
  // Se não existe registro para este dia, cria um objeto vazio
  if (!dailyLog[day]) dailyLog[day] = {};

  // Inverte: true → false, false/undefined → true
  dailyLog[day][questId] = !dailyLog[day][questId];

  save();
  render();

  const model = dailyModels.find(m => m.id === questId);
  if (dailyLog[day][questId] && model) {
    toast(`✓ +${model.pts} ponto${model.pts > 1 ? 's' : ''}`);
  }
}

// ═══════════════════════════════════════════════════
// RENDER — quests diárias
// ═══════════════════════════════════════════════════

function renderDailyQuests() {

  // ── 1. Streak geral (maior streak entre todas as quests) ──
  const maxStreak = dailyModels.reduce((max, m) => Math.max(max, getStreak(m.id)), 0);
  const streakBadge = document.getElementById('streak-badge');
  if (maxStreak > 0) {
    streakBadge.textContent = `🔥 ${maxStreak} dia${maxStreak > 1 ? 's' : ''} seguido${maxStreak > 1 ? 's' : ''}`;
    streakBadge.style.display = 'inline-block';
  } else {
    streakBadge.style.display = 'none';
  }

  // ── 2. Lista de modelos cadastrados ──
  const modelList = document.getElementById('dq-model-list');
  if (dailyModels.length === 0) {
    modelList.innerHTML = '<div class="empty" style="margin-bottom:12px;">Nenhuma quest diária criada ainda.</div>';
  } else {
    modelList.innerHTML = dailyModels.map(m => {
      const streak = getStreak(m.id);
      return `
        <div class="dq-model-item">
          <span class="dq-model-name">${esc(m.name)}</span>
          ${streak > 0 ? `<span class="dq-model-streak">🔥 ${streak}d</span>` : ''}
          <span class="dq-model-pts">${m.pts}pt${m.pts > 1 ? 's' : ''}</span>
          <button class="dq-del-btn" onclick="deleteDailyModel(${m.id})">✕</button>
        </div>
      `;
    }).join('');
  }

  // ── 3. Seção "Hoje" ──
  document.getElementById('today-label').textContent = fmtFull(TODAY);

  // Calcula pontos de hoje (quests + tarefas avulsas concluídas hoje)
  const todayLog = dailyLog[TODAY] || {};
  let todayPts = 0;

  // Pontos das quests diárias de hoje
  dailyModels.forEach(m => {
    if (todayLog[m.id]) todayPts += m.pts;
  });

  // Pontos das tarefas avulsas de hoje
  tasks.forEach(t => {
    if (t.date === TODAY && t.done) todayPts += t.pts;
  });

  document.getElementById('today-pts').textContent = todayPts;

  // Renderiza a lista de quests de hoje
  const todayList = document.getElementById('today-list');
  if (dailyModels.length === 0) {
    todayList.innerHTML = '<div class="empty">Nenhuma quest ativa para hoje.</div>';
  } else {
    todayList.innerHTML = dailyModels.map(m => {
      const done = !!todayLog[m.id];
      return `
        <div class="quest-item ${done ? 'q-done' : ''}">
          <div class="quest-check" onclick="toggleDailyQuest(${m.id}, '${TODAY}')">${done ? '✓' : ''}</div>
          <span class="quest-item-name">${esc(m.name)}</span>
          <span class="quest-item-streak">${getStreak(m.id) > 0 ? '🔥 ' + getStreak(m.id) + 'd' : ''}</span>
          <span class="quest-item-pts">${m.pts}pt${m.pts > 1 ? 's' : ''}</span>
        </div>
      `;
    }).join('');
  }

  // ── 4. Histórico ──
  renderHistory();
}

// Renderiza o histórico de dias anteriores
function renderHistory() {
  const histList = document.getElementById('history-list');

  // Pega todos os dias que têm registro, exceto hoje, ordenados do mais recente
  const pastDays = Object.keys(dailyLog)
    .filter(d => d !== TODAY)
    .sort()
    .reverse();

  if (pastDays.length === 0) {
    histList.innerHTML = '<div class="empty" style="padding:16px 0;">Sem histórico ainda.</div>';
    return;
  }

  histList.innerHTML = pastDays.map(day => {
    const log = dailyLog[day] || {};

    // Pontos do dia: quests + tarefas avulsas
    let dayPts = 0;
    dailyModels.forEach(m => { if (log[m.id]) dayPts += m.pts; });
    tasks.forEach(t => { if (t.date === day && t.done) dayPts += t.pts; });

    // Renderiza as quests daquele dia
    const questRows = dailyModels.map(m => {
      const done = !!log[m.id];
      return `
        <div class="quest-item ${done ? 'q-done' : ''}">
          <div class="quest-check" onclick="toggleDailyQuest(${m.id}, '${day}')">${done ? '✓' : ''}</div>
          <span class="quest-item-name">${esc(m.name)}</span>
          <span class="quest-item-pts">${m.pts}pt${m.pts > 1 ? 's' : ''}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="history-day">
        <div class="history-day-header">
          <span>${fmtFull(day)}</span>
          <span class="history-day-pts">${dayPts} pts</span>
        </div>
        ${questRows}
      </div>
    `;
  }).join('');
}

// Abre/fecha o histórico
function toggleHistory() {
  const wrap  = document.getElementById('history-wrap');
  const arrow = document.getElementById('history-arrow');
  const open  = wrap.style.display === 'none';
  wrap.style.display = open ? 'block' : 'none';
  arrow.textContent  = open ? '▲' : '▼';
}

// ═══════════════════════════════════════════════════
// GRÁFICO SVG — Plano Cartesiano
// ═══════════════════════════════════════════════════

function renderChart(dateMap) {
  const area  = document.getElementById('chart-area');
  const dates = Object.keys(dateMap).sort();

  if (dates.length === 0) {
    area.innerHTML = '<div class="chart-empty">Nenhum dado para exibir ainda.</div>';
    return;
  }

  const W = 560, H = 400;
  const padL = 44, padR = 20, padT = 30, padB = 50;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const pts    = dates.map(d => dateMap[d]);
  const maxPts = Math.max(...pts, 4);
  const yStep  = innerH / maxPts;
  const xStep  = dates.length > 1 ? innerW / (dates.length - 1) : innerW / 2;

  const yTicks    = [];
  const tickCount = Math.min(maxPts, 6);
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round((maxPts / tickCount) * i));
  }

  const points = dates.map((d, i) => {
    const x = padL + (dates.length > 1 ? i * xStep : innerW / 2);
    const y = padT + innerH - (dateMap[d] * yStep);
    return { x, y, pts: dateMap[d], date: d };
  });

  let areaPath = `M ${points[0].x} ${padT + innerH}`;
  points.forEach(p => { areaPath += ` L ${p.x} ${p.y}`; });
  areaPath += ` L ${points[points.length - 1].x} ${padT + innerH} Z`;

  let linePath = `M ${points[0].x} ${points[0].y}`;
  points.slice(1).forEach(p => { linePath += ` L ${p.x} ${p.y}`; });

  let svg = `<svg id="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a7bc4" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#3a7bc4" stop-opacity="0.04"/>
      </linearGradient>
    </defs>`;

  yTicks.forEach(val => {
    const y = padT + innerH - (val * yStep);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#b8ccdf" stroke-width="1" stroke-dasharray="${val === 0 ? 'none' : '4,4'}"/>`;
    svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-family="Inter,sans-serif" font-size="10" fill="#5a7290">${val}</text>`;
  });

  svg += `<line x1="${padL}" y1="${padT + innerH}" x2="${W - padR}" y2="${padT + innerH}" stroke="#1a3358" stroke-width="1.5"/>`;
  svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="#1a3358" stroke-width="1.5"/>`;
  svg += `<polygon points="${W - padR},${padT + innerH} ${W - padR - 6},${padT + innerH - 4} ${W - padR - 6},${padT + innerH + 4}" fill="#1a3358"/>`;
  svg += `<polygon points="${padL},${padT} ${padL - 4},${padT + 8} ${padL + 4},${padT + 8}" fill="#1a3358"/>`;

  if (points.length > 1) svg += `<path d="${areaPath}" fill="url(#chartGrad)"/>`;
  if (points.length > 1) svg += `<path d="${linePath}" fill="none" stroke="#1a3358" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;

  points.forEach((p, i) => {
    const showLabel = dates.length <= 10 || i % Math.ceil(dates.length / 10) === 0;
    if (showLabel) {
      svg += `<line x1="${p.x}" y1="${padT}" x2="${p.x}" y2="${padT + innerH}" stroke="#b8ccdf" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>`;
      svg += `<text x="${p.x}" y="${padT + innerH + 18}" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" fill="#5a7290" transform="rotate(-30, ${p.x}, ${padT + innerH + 18})">${fmt(p.date)}</text>`;
    }
    svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="#1a3358" stroke-width="2"/>`;
    const labelX = Math.min(Math.max(p.x, padL + 12), W - padR - 12);
    svg += `<text x="${labelX}" y="${p.y - 10}" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="600" fill="#1a3358">${p.pts}pt</text>`;
  });

  svg += `<text x="${W - padR + 4}" y="${padT + innerH + 4}" font-family="Inter,sans-serif" font-size="9" fill="#5a7290">Dias →</text>`;
  svg += `</svg>`;
  area.innerHTML = svg;
}

// ═══════════════════════════════════════════════════
// RENDER PRINCIPAL — redesenha tudo
// ═══════════════════════════════════════════════════

function render() {

  // ── Painel de resumo ──
  // Conta quests diárias concluídas (todos os dias)
  let doneQuests = 0;
  let totalQuests = 0;
  let ptsQuest = 0;
  Object.keys(dailyLog).forEach(day => {
    dailyModels.forEach(m => {
      totalQuests++;
      if (dailyLog[day][m.id]) { doneQuests++; ptsQuest += m.pts; }
    });
  });
  // Adiciona as de hoje que ainda não têm registro (existem mas não foram marcadas)
  if (!Object.keys(dailyLog).includes(TODAY)) {
    totalQuests += dailyModels.length;
  }

  const totalDone  = doneQuests;
  const totalAll   = totalQuests;
  const totalPts   = ptsQuest;
  const pct        = totalAll ? (totalDone / totalAll * 100).toFixed(0) : 0;

  document.getElementById('s-done').textContent  = totalDone;
  document.getElementById('s-total').textContent = totalAll;
  document.getElementById('s-pts').textContent   = totalPts;
  document.getElementById('xp-fill').style.width = pct + '%';
  document.getElementById('xp-sub').textContent  = `${totalDone} de ${totalAll} tarefas concluídas`;

  // ── Quests diárias ──
  renderDailyQuests();

  // ── Gráfico — pontos de quests por dia ──
  const dateMap = {};

  // Pontos das quests diárias
  Object.keys(dailyLog).forEach(day => {
    dailyModels.forEach(m => {
      if (dailyLog[day][m.id]) {
        if (!dateMap[day]) dateMap[day] = 0;
        dateMap[day] += m.pts;
      }
    });
  });

  renderChart(dateMap);
}

// ═══════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════

document.getElementById('dq-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addDailyQuest();
});

render();