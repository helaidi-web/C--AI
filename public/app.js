const codeInput = document.getElementById('codeInput');
const questionInput = document.getElementById('questionInput');
const analyzeButton = document.getElementById('analyzeButton');
const assistantButton = document.getElementById('assistantButton');
const loadExampleButton = document.getElementById('loadExample');
const quickActionButtons = document.querySelectorAll('.quick-action');
const localSummary = document.getElementById('localSummary');
const assistantSummary = document.getElementById('assistantSummary');
const serverStatus = document.getElementById('serverStatus');
const connectionState = document.getElementById('connectionState');
const lineNumbers = document.getElementById('lineNumbers');
const metricLines = document.getElementById('metricLines');
const metricChars = document.getElementById('metricChars');
const metricComplexity = document.getElementById('metricComplexity');
const summaryStats = document.getElementById('summaryStats');
const summaryCards = document.getElementById('summaryCards');
const summaryAccordion = document.getElementById('summaryAccordion');
const detailCards = document.getElementById('detailCards');
const detailSummary = document.getElementById('detailSummary');
const warningList = document.getElementById('warningList');
const metricsGrid = document.getElementById('metricsGrid');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

analyzeButton.dataset.label = 'Run analysis';
assistantButton.dataset.label = 'Ask ChatGPT';

const exampleCode = `#include <stdio.h>

void explainCode(char code[]) {
    if (code[0] != '\\0') {
        printf("Code received\\n");
    }
}

int main() {
    char code[1000] = "sample";
    explainCode(code);
    return 0;
}`;

function extractFunctionNames(code) {
  const matches = [...code.matchAll(/^\s*[A-Za-z_][\w\s\*\[\]]*\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/gm)];
  return matches.map((match) => ({
    name: match[1],
    params: match[2].trim() || 'no parameters'
  }));
}

function extractVariableHints(code) {
  const variableMatches = [
    ...code.matchAll(/^\s*(?:int|char|float|double|long|short|unsigned|signed|size_t)\s+([A-Za-z_]\w*)\s*(?:=|;|,)/gm)
  ];
  return [...new Set(variableMatches.map((match) => match[1]))];
}

const quickExamples = {
  minimal: `#include <stdio.h>

int main() {
    printf("Hello C\n");
    return 0;
}`,
  control: `#include <stdio.h>

int main() {
    int value = 10;
    if (value > 5) {
        printf("High\n");
    } else {
        printf("Low\n");
    }
    return 0;
}`,
  io: `#include <stdio.h>

void readNumber() {
    int number;
    scanf("%d", &number);
    printf("Number: %d\n", number);
}`
};

let latestState = {
  analysis: null,
  ai: null,
  code: exampleCode,
  question: questionInput.value
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function badge(text, tone = 'info') {
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}

function iconCard(title, description, iconLabel, tone = 'info') {
  return `
    <article class="icon-card glass-card">
      <div class="icon-badge ${tone}">${escapeHtml(iconLabel)}</div>
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
    </article>
  `;
}

function progressMarkup(label, value, toneClass) {
  const bounded = Math.max(0, Math.min(100, value));
  return `
    <div class="progress-block">
      <div class="progress-row">
        <span>${escapeHtml(label)}</span>
        <strong>${bounded}%</strong>
      </div>
      <div class="progress-track">
        <span class="progress-fill ${toneClass}" style="width:${bounded}%"></span>
      </div>
    </div>
  `;
}

function accordionItem(title, content, open = false) {
  return `
    <details class="accordion-item" ${open ? 'open' : ''}>
      <summary>${escapeHtml(title)}</summary>
      <div class="accordion-content">${content}</div>
    </details>
  `;
}

function formatList(items, emptyLabel = 'No data available.') {
  if (!items || items.length === 0) {
    return `<p class="stack-empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `<ul class="modern-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function buildWarnings(analysis) {
  const warnings = [];
  if (analysis?.signals?.some((signal) => signal.key === 'scanf')) {
    warnings.push('scanf should be checked with valid addresses and input validation.');
  }
  if (analysis?.signals?.some((signal) => signal.key === 'printf')) {
    warnings.push('printf format specifiers should match argument types.');
  }
  if (!analysis?.signals?.some((signal) => signal.key === 'int main')) {
    warnings.push('No main entry point detected. The program may not compile as a standalone executable.');
  }
  if (!analysis?.signals?.some((signal) => ['if', 'while', 'for'].includes(signal.key))) {
    warnings.push('No clear control flow detected. The code may be incomplete or too short for deeper analysis.');
  }
  return warnings;
}

function calculateComplexity(analysis) {
  const signals = analysis?.signals || [];
  const loops = signals.filter((signal) => ['for', 'while', 'do'].includes(signal.key)).length;
  const conditionals = signals.filter((signal) => signal.key === 'if').length;
  const score = Math.min(100, 14 + loops * 28 + conditionals * 18);
  return score;
}

function calculateQuality(analysis) {
  const signals = analysis?.signals || [];
  const hasMain = signals.some((signal) => signal.key === 'int main');
  const hasOutput = signals.some((signal) => signal.key === 'printf');
  const hasInput = signals.some((signal) => signal.key === 'scanf');
  const hasFlow = signals.some((signal) => ['if', 'while', 'for'].includes(signal.key));
  let score = 45;
  if (hasMain) score += 18;
  if (hasOutput) score += 8;
  if (hasInput) score += 6;
  if (hasFlow) score += 15;
  score -= Math.max(0, signals.length - 6) * 2;
  return Math.max(10, Math.min(100, score));
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

function updateLineNumbers(code) {
  const lineCount = Math.max(1, code.split(/\r?\n/).length);
  lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, index) => `<span>${index + 1}</span>`).join('');
}

function updateLiveMetrics() {
  const code = codeInput.value;
  const lineCount = code.trim() ? code.split(/\r?\n/).length : 0;
  const charCount = code.length;
  metricLines.textContent = `${lineCount} line${lineCount === 1 ? '' : 's'}`;
  metricChars.textContent = `${charCount} char${charCount === 1 ? '' : 's'}`;
  metricComplexity.textContent = `Complexity: ${charCount > 0 ? (lineCount > 12 ? 'high' : lineCount > 5 ? 'medium' : 'low') : 'low'}`;
  updateLineNumbers(code);
}

function renderText(container, text, meta = '') {
  container.innerHTML = '';
  const pre = document.createElement('pre');
  pre.textContent = text;
  container.appendChild(pre);

  if (meta) {
    const metaNode = document.createElement('div');
    metaNode.className = 'result-meta';
    metaNode.textContent = meta;
    container.appendChild(metaNode);
  }
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.textContent = busy ? 'Working...' : button.dataset.label;
}

async function getJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function refreshHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    connectionState.textContent = data.openaiConfigured ? 'Connected' : 'Not connected';
    serverStatus.textContent = data.openaiConfigured
      ? `Serveur prêt. ChatGPT connecté avec ${data.model}.`
      : 'Serveur prêt. ChatGPT non connecté, explication locale active.';
  } catch (error) {
    connectionState.textContent = 'Offline';
    serverStatus.textContent = `Serveur indisponible: ${error.message}`;
  }
}

function renderSummary(state) {
  const analysis = state.analysis;
  const lines = analysis?.lineCount || 0;
  const characters = analysis?.charCount || 0;
  const complexity = calculateComplexity(analysis);
  const quality = calculateQuality(analysis);

  summaryStats.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Résumé</span>
      <strong>${escapeHtml(analysis?.summary || 'Run an analysis to see the summary.')}</strong>
    </div>
    <div class="stat-card accent">
      <span class="stat-label">Detected elements</span>
      <strong>${escapeHtml(String(analysis?.signals?.length || 0))}</strong>
    </div>
  `;

  const signalBadges = (analysis?.signals || []).map((signal) => {
    const tone = signal.key === 'printf' ? 'info' : signal.key === 'scanf' ? 'warning' : 'success';
    return badge(signal.label, tone);
  }).join(' ');

  summaryCards.innerHTML = `
    <article class="glass-card summary-card">
      <div class="card-title-row">
        <h3>Detected patterns</h3>
        <span class="badge success">Live</span>
      </div>
      <div class="badge-row">${signalBadges || badge('No patterns detected', 'warning')}</div>
    </article>
    <article class="glass-card summary-card">
      <div class="card-title-row">
        <h3>Complexity snapshot</h3>
        <span class="badge info">Score</span>
      </div>
      ${progressMarkup('Complexity', complexity, 'cyan')}
      ${progressMarkup('Code quality', quality, 'purple')}
    </article>
  `;

  const accordionItems = [];
  accordionItems.push(accordionItem('What the code seems to do', `<p>${escapeHtml(analysis?.summary || 'No data yet.')}</p>`, true));
  accordionItems.push(accordionItem('Code details', formatList((analysis?.signals || []).map((signal) => `${signal.label}: ${signal.detail}`), 'No code details detected.')));
  accordionItems.push(accordionItem('Current metrics', `
    <p><strong>${lines}</strong> lines and <strong>${characters}</strong> characters.</p>
    <p>Complexity: <strong>${complexity}%</strong> · Quality: <strong>${quality}%</strong></p>
  `));
  summaryAccordion.innerHTML = accordionItems.join('');
}

function renderDetails(state) {
  const analysis = state.analysis;
  const functions = extractFunctionNames(state.code);
  const variables = extractVariableHints(state.code);
  const warnings = buildWarnings(analysis);

  detailCards.innerHTML = [
    iconCard('Functions', functions.length ? `${functions.length} detected` : 'No function detected', 'ƒ', 'info'),
    iconCard('Variables', variables.length ? `${variables.length} detected` : 'No variable detected', 'x', 'success'),
    iconCard('Control flow', analysis?.signals?.some((signal) => ['if', 'while', 'for', 'do'].includes(signal.key)) ? 'Detected' : 'Not detected', '↕', 'warning'),
    iconCard('I/O calls', analysis?.signals?.some((signal) => ['printf', 'scanf'].includes(signal.key)) ? 'Detected' : 'Not detected', 'I/O', 'ai')
  ].join('');

  detailSummary.innerHTML = `
    <div class="stack-group">
      <div class="stack-item">
        <span class="mini-label">Functions</span>
        ${formatList(functions.map((item) => `${item.name}(${item.params})`), 'No function signature detected.')}
      </div>
      <div class="stack-item">
        <span class="mini-label">Variables</span>
        ${formatList(variables, 'No variable detected.')}
      </div>
      <div class="stack-item">
        <span class="mini-label">Detected lines</span>
        <p>${escapeHtml(analysis?.summary || 'No summary available.')}</p>
      </div>
    </div>
  `;

  warningList.innerHTML = warnings.length
    ? warnings.map((warning) => `<div class="warning-row"><span class="warning-dot"></span><p>${escapeHtml(warning)}</p></div>`).join('')
    : '<p class="stack-empty">No major warning detected.</p>';
}

function renderMetrics(state) {
  const analysis = state.analysis;
  const lineCount = analysis?.lineCount || 0;
  const charCount = analysis?.charCount || 0;
  const complexity = calculateComplexity(analysis);
  const quality = calculateQuality(analysis);

  metricsGrid.innerHTML = `
    <article class="glass-card metric-card">
      <div class="card-title-row">
        <h3>Metrics overview</h3>
        <span class="badge info">Updated</span>
      </div>
      ${progressMarkup('Complexity', complexity, 'cyan')}
      ${progressMarkup('Code quality', quality, 'purple')}
    </article>
    <article class="glass-card metric-card">
      <div class="metric-list">
        <div><span>Lines</span><strong>${lineCount}</strong></div>
        <div><span>Characters</span><strong>${charCount}</strong></div>
        <div><span>Signals</span><strong>${analysis?.signals?.length || 0}</strong></div>
        <div><span>Detected main</span><strong>${analysis?.signals?.some((signal) => signal.key === 'int main') ? 'Yes' : 'No'}</strong></div>
      </div>
    </article>
  `;
}

function renderAi(state) {
  assistantSummary.innerHTML = state.ai
    ? `
      <div class="stack-group">
        <div class="ai-response">
          ${state.ai.answer.split('\n').map((line) => line ? `<p>${escapeHtml(line)}</p>` : '<div class="divider-space"></div>').join('')}
        </div>
        <div class="badge-row">
          ${badge(state.ai.usedOpenAI ? 'ChatGPT connected' : 'Local fallback', state.ai.usedOpenAI ? 'ai' : 'warning')}
          ${state.ai.note ? badge(state.ai.note, 'info') : ''}
        </div>
      </div>
    `
    : '<p class="stack-empty">No AI response yet.</p>';
}

function refreshDashboard() {
  renderSummary(latestState);
  renderDetails(latestState);
  renderMetrics(latestState);
  renderAi(latestState);
}

async function analyze() {
  setBusy(analyzeButton, true);

  try {
    const data = await getJson('/api/analyze', { code: codeInput.value });
    latestState.analysis = data.analysis;
    latestState.code = codeInput.value;
    latestState.question = questionInput.value;
    renderText(localSummary, `
Résumé: ${data.analysis.summary}
Lignes: ${data.analysis.lineCount}
Caractères: ${data.analysis.charCount}
`, data.note);
    updateLiveMetrics();
    refreshDashboard();
    setActiveTab('summary');
  } catch (error) {
    renderText(localSummary, `L’analyse locale a échoué: ${error.message}`);
  } finally {
    setBusy(analyzeButton, false);
  }
}

async function askAssistant() {
  setBusy(assistantButton, true);

  try {
    const data = await getJson('/api/assistant', {
      code: codeInput.value,
      question: questionInput.value
    });

    const output = [
      data.answer,
      '',
      data.usedOpenAI ? 'Source: OpenAI' : 'Source: explication locale',
      data.note ? `Note: ${data.note}` : ''
    ]
      .filter(Boolean)
      .join('\n');
    latestState.analysis = data.analysis;
    latestState.ai = data;
    latestState.code = codeInput.value;
    latestState.question = questionInput.value;
    renderText(assistantSummary, output, data.analysis?.summary || '');
    refreshDashboard();
    setActiveTab('ai');
  } catch (error) {
    renderText(assistantSummary, `L’assistant a échoué: ${error.message}`);
  } finally {
    setBusy(assistantButton, false);
  }
}

loadExampleButton.addEventListener('click', () => {
  codeInput.value = exampleCode;
  updateLiveMetrics();
});

quickActionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const fill = button.dataset.fill;
    codeInput.value = quickExamples[fill] || exampleCode;
    updateLiveMetrics();
    refreshDashboard();
  });
});

analyzeButton.addEventListener('click', analyze);
assistantButton.addEventListener('click', askAssistant);

tabButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tab));
});

codeInput.addEventListener('input', () => {
  updateLiveMetrics();
  latestState.code = codeInput.value;
  refreshDashboard();
});

questionInput.addEventListener('input', () => {
  latestState.question = questionInput.value;
});

codeInput.value = exampleCode;
updateLiveMetrics();
refreshDashboard();
refreshHealth();