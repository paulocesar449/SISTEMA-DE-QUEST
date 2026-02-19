// ═══════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════

// Modelos de quest: [{ id, name, pts }, ...]
let dailyModels = JSON.parse(localStorage.getItem('daily-models') || '[]');

// Log de conclusões: { "2025-02-18": { "1234567": true, ... }, ... }
// IMPORTANTE: as chaves do log são sempre STRINGS
let dailyLog = JSON.parse(localStorage.getItem('daily-log') || '{}');

// Data de hoje "YYYY-MM-DD" — usa horário local, não UTC
const _now    = new Date();
const TODAY   = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
const TOMORROW = subtractDays(TODAY, -1);

// ═══════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(d) {
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}`;
}

function fmtFull(d) {
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function subtractDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function save() {
  localStorage.setItem('daily-models', JSON.stringify(dailyModels));
  localStorage.setItem('daily-log',    JSON.stringify(dailyLog));
}

// ═══════════════════════════════════════════════════
// STREAK
// ═══════════════════════════════════════════════════

function getStreak(questId) {
  const key = String(questId);
  let streak = 0;
  let day = subtractDays(TODAY, 1);
  for (let i = 0; i < 365; i++) {
    if (dailyLog[day] && dailyLog[day][key] === true) {
      streak++;
      day = subtractDays(day, 1);
    } else {
      break;
    }
  }
  return streak;
}

// ═══════════════════════════════════════════════════
// AÇÕES
// ═══════════════════════════════════════════════════

function addDailyQuest() {
  const name = document.getElementById('dq-name').value.trim();
  const pts  = parseInt(document.getElementById('dq-pts').value);
  if (!name) { toast('Escreva o nome da quest'); return; }
  dailyModels.push({ id: Date.now(), name, pts });
  save();
  render();
  document.getElementById('dq-name').value = '';
  toast('Quest criada!');
}

function deleteDailyModel(id) {
  const key = String(id);
  dailyModels = dailyModels.filter(m => m.id !== id);
  Object.keys(dailyLog).forEach(day => { delete dailyLog[day][key]; });
  save();
  render();
  toast('Quest removida');
}

function toggleDailyQuest(questId, day) {
  const key = String(questId);
  if (!dailyLog[day]) dailyLog[day] = {};
  // inverte true/false; se undefined, vira true
  dailyLog[day][key] = !dailyLog[day][key];
  save();
  render();
  const model = dailyModels.find(m => String(m.id) === key);
  if (model && dailyLog[day][key]) {
    toast(`✓ +${model.pts} ponto${model.pts > 1 ? 's' : ''}`);
  }
}

function toggleHistory() {
  const wrap  = document.getElementById('history-wrap');
  const arrow = document.getElementById('history-arrow');
  const open  = wrap.style.display === 'none';
  wrap.style.display = open ? 'block' : 'none';
  arrow.textContent  = open ? '▲' : '▼';
}

// ═══════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════

function render() {

  // ── Resumo ──
  let doneCount = 0, totalCount = 0, totalPts = 0;

  // Conta todas as quests de todos os dias registrados
  Object.keys(dailyLog).forEach(day => {
    dailyModels.forEach(m => {
      totalCount++;
      if (dailyLog[day][String(m.id)] === true) {
        doneCount++;
        totalPts += m.pts;
      }
    });
  });

  // Se hoje ainda não tem registro, conta as quests de hoje no total
  if (!dailyLog[TODAY]) {
    totalCount += dailyModels.length;
  }

  const pct = totalCount ? Math.round(doneCount / totalCount * 100) : 0;

  document.getElementById('s-done').textContent  = doneCount;
  document.getElementById('s-total').textContent = totalCount;
  document.getElementById('s-pts').textContent   = totalPts;
  document.getElementById('xp-fill').style.width = pct + '%';
  document.getElementById('xp-sub').textContent  = `${doneCount} de ${totalCount} concluídas`;

  // ── Streak geral ──
  const maxStreak = dailyModels.reduce((max, m) => Math.max(max, getStreak(m.id)), 0);
  const streakBadge = document.getElementById('streak-badge');
  if (maxStreak > 0) {
    streakBadge.textContent = `🔥 ${maxStreak} dia${maxStreak > 1 ? 's' : ''} seguido${maxStreak > 1 ? 's' : ''}`;
    streakBadge.style.display = 'inline-block';
  } else {
    streakBadge.style.display = 'none';
  }

  // ── Lista de modelos ──
  const modelList = document.getElementById('dq-model-list');
  if (dailyModels.length === 0) {
    modelList.innerHTML = '<div class="empty" style="margin-bottom:12px;">Nenhuma quest criada ainda.</div>';
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

  // ── Hoje ──
  document.getElementById('today-label').textContent = fmtFull(TODAY);

  const todayLog = dailyLog[TODAY] || {};

  // Pontos de hoje
  let todayPts = 0;
  dailyModels.forEach(m => {
    if (todayLog[String(m.id)] === true) todayPts += m.pts;
  });
  document.getElementById('today-pts').textContent = todayPts;

  // Lista de quests de hoje
  const todayList = document.getElementById('today-list');
  if (dailyModels.length === 0) {
    todayList.innerHTML = '<div class="empty">Nenhuma quest ativa para hoje.</div>';
  } else {
    todayList.innerHTML = dailyModels.map(m => {
      const key  = String(m.id);
      const done = todayLog[key] === true;
      const streak = getStreak(m.id);
      return `
        <div class="quest-item ${done ? 'q-done' : ''}">
          <div class="quest-check" onclick="toggleDailyQuest(${m.id}, '${TODAY}')">${done ? '✓' : ''}</div>
          <span class="quest-item-name">${esc(m.name)}</span>
          ${streak > 0 ? `<span class="quest-item-streak">🔥 ${streak}d</span>` : '<span></span>'}
          <span class="quest-item-pts">${m.pts}pt${m.pts > 1 ? 's' : ''}</span>
        </div>
      `;
    }).join('');
  }

  // ── Amanhã ──
  document.getElementById('tomorrow-label').textContent = fmtFull(TOMORROW);

  const tomorrowLog = dailyLog[TOMORROW] || {};
  const tomorrowList = document.getElementById('tomorrow-list');

  if (dailyModels.length === 0) {
    tomorrowList.innerHTML = '<div class="empty" style="opacity:0.5;">Nenhuma quest cadastrada.</div>';
  } else {
    tomorrowList.innerHTML = dailyModels.map(m => {
      const done = tomorrowLog[String(m.id)] === true;
      const streak = getStreak(m.id);
      return `
        <div class="tomorrow-item">
          <div class="tomorrow-dot" style="${done ? 'background:var(--faint);' : ''}"></div>
          <span class="tomorrow-name">${esc(m.name)}${streak > 0 ? ` <span style="font-size:10px;">🔥 ${streak}d</span>` : ''}</span>
          <span class="tomorrow-pts">${m.pts}pt${m.pts > 1 ? 's' : ''}</span>
        </div>
      `;
    }).join('');
  }

  // ── Histórico ──
  const histList = document.getElementById('history-list');
  const pastDays = Object.keys(dailyLog).filter(d => d !== TODAY).sort().reverse();

  if (pastDays.length === 0) {
    histList.innerHTML = '<div class="empty" style="padding:16px 0;">Sem histórico ainda.</div>';
  } else {
    histList.innerHTML = pastDays.map(day => {
      const log = dailyLog[day] || {};
      let dayPts = 0;
      dailyModels.forEach(m => {
        if (log[String(m.id)] === true) dayPts += m.pts;
      });
      const rows = dailyModels.map(m => {
        const done = log[String(m.id)] === true;
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
          ${rows}
        </div>
      `;
    }).join('');
  }

  // ── Gráfico ──
  const dateMap = {};
  Object.keys(dailyLog).forEach(day => {
    dailyModels.forEach(m => {
      if (dailyLog[day][String(m.id)] === true) {
        dateMap[day] = (dateMap[day] || 0) + m.pts;
      }
    });
  });
  renderChart(dateMap);
}

// ═══════════════════════════════════════════════════
// GRÁFICO
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

  const vals   = dates.map(d => dateMap[d]);
  const maxPts = Math.max(...vals, 4);
  const yStep  = innerH / maxPts;
  const xStep  = dates.length > 1 ? innerW / (dates.length - 1) : innerW / 2;

  const tickCount = Math.min(maxPts, 6);
  const yTicks = [];
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round((maxPts / tickCount) * i));
  }

  const points = dates.map((d, i) => ({
    x:   padL + (dates.length > 1 ? i * xStep : innerW / 2),
    y:   padT + innerH - (dateMap[d] * yStep),
    pts: dateMap[d],
    date: d
  }));

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
    svg += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#b8ccdf" stroke-width="1" stroke-dasharray="${val === 0 ? 'none' : '4,4'}"/>`;
    svg += `<text x="${padL-6}" y="${y+4}" text-anchor="end" font-family="Inter,sans-serif" font-size="10" fill="#5a7290">${val}</text>`;
  });

  svg += `<line x1="${padL}" y1="${padT+innerH}" x2="${W-padR}" y2="${padT+innerH}" stroke="#1a3358" stroke-width="1.5"/>`;
  svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+innerH}" stroke="#1a3358" stroke-width="1.5"/>`;
  svg += `<polygon points="${W-padR},${padT+innerH} ${W-padR-6},${padT+innerH-4} ${W-padR-6},${padT+innerH+4}" fill="#1a3358"/>`;
  svg += `<polygon points="${padL},${padT} ${padL-4},${padT+8} ${padL+4},${padT+8}" fill="#1a3358"/>`;

  if (points.length > 1) {
    svg += `<path d="${areaPath}" fill="url(#chartGrad)"/>`;
    svg += `<path d="${linePath}" fill="none" stroke="#1a3358" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  points.forEach((p, i) => {
    const show = dates.length <= 10 || i % Math.ceil(dates.length / 10) === 0;
    if (show) {
      svg += `<line x1="${p.x}" y1="${padT}" x2="${p.x}" y2="${padT+innerH}" stroke="#b8ccdf" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>`;
      svg += `<text x="${p.x}" y="${padT+innerH+18}" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" fill="#5a7290" transform="rotate(-30,${p.x},${padT+innerH+18})">${fmt(p.date)}</text>`;
    }
    svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="#1a3358" stroke-width="2"/>`;
    const lx = Math.min(Math.max(p.x, padL+12), W-padR-12);
    svg += `<text x="${lx}" y="${p.y-10}" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="600" fill="#1a3358">${p.pts}pt</text>`;
  });

  svg += `<text x="${W-padR+4}" y="${padT+innerH+4}" font-family="Inter,sans-serif" font-size="9" fill="#5a7290">Dias →</text>`;
  svg += `</svg>`;
  area.innerHTML = svg;
}

// ═══════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════

document.getElementById('dq-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addDailyQuest();
});

render();
