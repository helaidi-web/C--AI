const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const PUBLIC_DIR = path.join(__dirname, 'public');

console.log(`
=== SERVER STARTUP ===
PORT: ${PORT}
OpenAI API Key: ${OPENAI_API_KEY ? '✓ Configured' : '✗ MISSING (responses will use local fallback)'}
OpenAI Model: ${OPENAI_MODEL}
================
`);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

function safeReadStatic(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function extractCodeSignals(code) {
  const lower = code.toLowerCase();
  const signals = [];

  const checks = [
    {
      key: 'for',
      label: 'Boucle for detectee',
      detail: 'Le code semble utiliser une iteration avec for.'
    },
    {
      key: 'while',
      label: 'Boucle while detectee',
      detail: 'Le code semble utiliser une repetition avec while.'
    },
    {
      key: 'do',
      label: 'Boucle do while detectee',
      detail: 'Le code semble utiliser une boucle do while.'
    },
    {
      key: 'if',
      label: 'Condition if detectee',
      detail: 'Le code semble contenir des branches conditionnelles.'
    },
    {
      key: 'printf',
      label: 'Sortie printf detectee',
      detail: 'Le code affiche probablement du texte dans la console.'
    },
    {
      key: 'scanf',
      label: 'Entree scanf detectee',
      detail: 'Le code lit probablement une saisie utilisateur.'
    },
    {
      key: 'void',
      label: 'Fonction void detectee',
      detail: 'Le code declare au moins une fonction sans valeur de retour.'
    },
    {
      key: 'int main',
      label: 'Point d entree main detecte',
      detail: 'Le programme semble etre un programme C exutable.'
    }
  ];

  for (const check of checks) {
    if (lower.includes(check.key)) {
      signals.push({
        key: check.key,
        label: check.label,
        detail: check.detail
      });
    }
  }

  const lineCount = code.trim() ? code.split(/\r?\n/).length : 0;
  const charCount = code.length;

  return {
    lineCount,
    charCount,
    signals,
    summary:
      signals.length > 0
        ? `Analyse C: ${signals.length} element(s) detecte(s).`
        : 'Aucune structure simple n a ete detectee.'
  };
}

function extractFunctionNames(code) {
  const matches = [...code.matchAll(/^\s*[A-Za-z_][\w\s\*\[\]]*\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/gm)];
  return matches.map((match) => ({
    name: match[1],
    params: match[2].trim() || 'aucun parametre detecte'
  }));
}

function extractVariableHints(code) {
  const variableMatches = [
    ...code.matchAll(/^\s*(?:int|char|float|double|long|short|unsigned|signed|size_t)\s+([A-Za-z_]\w*)\s*(?:=|;|,)/gm)
  ];
  return [...new Set(variableMatches.map((match) => match[1]))];
}

function buildLocalAnswer(code, question) {
  const analysis = extractCodeSignals(code);
  const questionText = (question || '').trim();
  const functions = extractFunctionNames(code);
  const variables = extractVariableHints(code);
  const answerLines = [];

  answerLines.push('1) Explication simple');
  answerLines.push(`Ce code C contient environ ${analysis.lineCount} ligne(s) et ${analysis.charCount} caractere(s).`);
  answerLines.push('Il semble lire, traiter ou afficher des donnees selon les instructions detectees dans le code.');

  answerLines.push('');
  answerLines.push('2) Fonctions, variables et blocs');

  if (functions.length > 0) {
    answerLines.push('Fonctions detectees:');
    for (const item of functions) {
      answerLines.push(`- ${item.name}(${item.params})`);
    }
  } else {
    answerLines.push('- Aucune fonction explicite detectee par l analyse locale.');
  }

  if (variables.length > 0) {
    answerLines.push('Variables detectees:');
    for (const variable of variables) {
      answerLines.push(`- ${variable}`);
    }
  } else {
    answerLines.push('- Aucune variable simple detectee par l analyse locale.');
  }

  answerLines.push('Blocs importants:');
  if (analysis.signals.length > 0) {
    for (const signal of analysis.signals) {
      answerLines.push(`- ${signal.label}: ${signal.detail}`);
    }
  } else {
    answerLines.push('- Aucun motif simple detecte.');
  }

  answerLines.push('');
  answerLines.push('3) Fonctionnement global');
  answerLines.push('Le programme suit le flux classique d un programme C: point d entree, instructions, tests, boucles et affichage.');

  answerLines.push('');
  answerLines.push('4) Erreurs ou bugs possibles');
  if (analysis.signals.some((signal) => signal.key === 'scanf')) {
    answerLines.push('- Verifie que scanf recoit bien des adresses memoire valides.');
  }
  if (analysis.signals.some((signal) => signal.key === 'printf')) {
    answerLines.push('- Verifie que les formats printf correspondent aux types utilises.');
  }
  if (!analysis.signals.some((signal) => signal.key === 'int main')) {
    answerLines.push('- La presence de main n a pas ete detectee, ce qui peut empecher l execution du programme.');
  }
  if (!analysis.signals.some((signal) => signal.key === 'if') && !analysis.signals.some((signal) => signal.key === 'while') && !analysis.signals.some((signal) => signal.key === 'for')) {
    answerLines.push('- L analyse locale ne voit ni condition ni boucle claire, donc le comportement peut rester incomplet.');
  }

  answerLines.push('');
  answerLines.push('5) Ameliorations possibles');
  answerLines.push('- Ajouter des noms de fonctions et de variables plus explicites.');
  answerLines.push('- Decouper les grosses fonctions en petits blocs.');
  answerLines.push('- Ajouter des commentaires utiles sur la logique metier.');
  answerLines.push('- Verifier les cas limites et la gestion des erreurs.');

  answerLines.push('');
  answerLines.push('6) Resume simple');
  answerLines.push('L idee principale du code est de realiser une tache C precise avec un flux d execution simple et lisible.');

  if (questionText) {
    answerLines.push('');
    answerLines.push(`Question supplementaire: ${questionText}`);
  }

  return answerLines.join('\n');
}

async function askOpenAI({ code, question, analysis }) {
  if (!OPENAI_API_KEY) {
    console.log('[OpenAI] No API key - using local fallback');
    return {
      usedOpenAI: false,
      answer: buildLocalAnswer(code, question),
      note: 'OPENAI_API_KEY manquante. Reponse locale utilisee.'
    };
  }

  const prompt = [
    'Tu es un analyseur de code C clair et concis pour une application locale.',
    'Réponds en français.',
    'Donne toujours une réponse structurée avec exactement ces parties: 1) explication simple et pédagogique, 2) fonctions, variables et blocs, 3) fonctionnement global, 4) erreurs ou bugs possibles, 5) améliorations possibles, 6) résumé simple.',
    'Explique comme à un débutant, sans te limiter à une traduction littérale du code.',
    'Si le code est en C, explique le flux, les entrées/sorties, et les erreurs possibles avec des corrections concrètes quand c est utile.',
    '',
    `Résumé de l'analyse locale: ${analysis.summary}`,
    '',
    'Code utilisateur:',
    code || '(empty)',
    '',
    'Question utilisateur:',
    question || 'Explique ce code.'
  ].join('\n');

  try {
    console.log(`[OpenAI] Sending request to /v1/chat/completions with model: ${OPENAI_MODEL}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OpenAI] Error response:', response.status, data);
      const fallback = buildLocalAnswer(code, question);
      return {
        usedOpenAI: false,
        answer: fallback,
        note: `OpenAI error (${response.status}): ${data?.error?.message || 'Unknown error'} - using local fallback`
      };
    }

    const answer = data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
    console.log('[OpenAI] ✓ Success - received response');
    
    return {
      usedOpenAI: true,
      answer,
      note: `Model: ${OPENAI_MODEL} ✓`
    };
  } catch (error) {
    console.error('[OpenAI] Request failed:', error.message);
    const fallback = buildLocalAnswer(code, question);
    return {
      usedOpenAI: false,
      answer: fallback,
      note: `Request failed: ${error.message} - using local fallback`
    };
  }
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.normalize(requested).replace(/^([.]{2}[\\/])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return true;
  }

  const file = safeReadStatic(filePath);
  if (!file) {
    return false;
  }

  res.writeHead(200, {
    'Content-Type': mimeType(filePath),
    'Cache-Control': 'no-store'
  });
  res.end(file);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const apiKeyConfigured = Boolean(OPENAI_API_KEY && OPENAI_API_KEY !== 'sk-your-actual-api-key-here');
    sendJson(res, 200, {
      ok: true,
      openaiConfigured: apiKeyConfigured,
      model: OPENAI_MODEL,
      message: apiKeyConfigured ? 'OpenAI configured ✓' : 'OpenAI not configured - local fallback active'
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/analyze') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const code = String(body.code || '');
      const analysis = extractCodeSignals(code);
      sendJson(res, 200, {
        ok: true,
        analysis,
        note: 'Analyse C locale terminee.'
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error.message || 'Invalid request'
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/assistant') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const code = String(body.code || '');
      const question = String(body.question || 'Explain this code.');
      const analysis = extractCodeSignals(code);
      
      console.log(`[API /assistant] Request received - code length: ${code.length}, question: "${question.substring(0, 50)}..."`);
      
      const ai = await askOpenAI({ code, question, analysis });

      console.log(`[API /assistant] Response ready - usedOpenAI: ${ai.usedOpenAI}`);

      sendJson(res, 200, {
        ok: true,
        ...ai,
        analysis
      });
    } catch (error) {
      console.error('[API /assistant] Error:', error.message);
      sendJson(res, 500, {
        ok: false,
        error: error.message || 'Assistant failed'
      });
    }
    return;
  }

  if (req.method === 'GET') {
    const served = serveStatic(req, res, url.pathname);
    if (served) return;
  }

  sendText(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log(`Local app running at http://localhost:${PORT}`);
});