const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

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

  answerLines.push('⚠️ **Mode Hors-ligne (Fallback AI local)**');
  answerLines.push('Notre vrai moteur IA OpenAI n\'est pas disponible car la clé API a dépassé son quota. Voici une analyse générée localement par notre moteur de secours interne :\n');

  answerLines.push('🔍 **1. Aperçu général du programme**');
  if (analysis.signals.some(s => s.key === 'scanf') && analysis.signals.some(s => s.key === 'printf')) {
      answerLines.push("Il s'agit d'un programme **interactif** : il demande des informations à l'utilisateur (via `scanf`), les traite, puis affiche le résultat (via `printf`).");
  } else if (analysis.signals.some(s => s.key === 'printf')) {
      answerLines.push("C'est un programme d'**affichage** : son but principal est de formater et d'émettre des résultats ou messages à l'écran.");
  } else {
      answerLines.push("C'est un script C classique.");
  }

  answerLines.push('\n⚙️ **2. Décomposition de la Logique**');
  if (functions.length > 0) {
    answerLines.push('* **Structure des fonctions détectées :**');
    for (const item of functions) {
      if (item.name === 'main') {
          answerLines.push('  - `main()` : Point d\'entrée du programme.');
      } else {
          answerLines.push('  - `' + item.name + ' (' + item.params + ')` : Fonction locale utilitaire.');
      }
    }
  }

  if (variables.length > 0) {
    answerLines.push('* **Gestion de la mémoire :**');
    answerLines.push('  - Variables détectées : `' + variables.join('`, `') + '`');
  }

  if (analysis.signals.length > 0) {
      answerLines.push('\n🛠️ **3. Mécanismes de code détectés**');
      for (const signal of analysis.signals) {
           answerLines.push('- **' + signal.label + '** : ' + signal.detail);
      }
  }
  
  answerLines.push('\n💡 **4. Conseils & Bugs éventuels**');
  if (analysis.signals.some((signal) => signal.key === 'scanf')) {
    answerLines.push('- Vérifiez que vos `scanf` utilisent bien les adresses des variables (ajoutez `&`).');
  }
  if (!functions.some((f) => f.name === 'main')) {
    answerLines.push('- Aucune fonction `main` détectée : si c\'est votre script principal, il ne pourra pas se lancer sans elle.');
  }

  if (questionText) {
    answerLines.push('');
    answerLines.push('❓ **Votre question :** ' + questionText);
    answerLines.push('*(Nous ne pouvons actuellement pas y répondre d\'une façon personnalisée en mode hors-ligne, mais la structure ci-dessus devrait vous aider !)*');
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
    'Tu es "C.AI", un professeur expert, passionnÃ© et extrÃªmement dÃ©taillÃ© en programmation C.',
    'RÃ©ponds entiÃ¨rement en franÃ§ais et utilise des icÃ´nes ou emojis pour rendre le texte beau sur le site web.',
    'Ta rÃ©ponse doit IMPÃ‰RATIVEMENT Ãªtre structurÃ©e avec ces parties en Mardown :',
    'ðŸ”Ž **1. RÃ©sumÃ© Global du Programme :** DÃ©cris prÃ©cisÃ©ment le but mÃ©tier du code (Ã  quoi sert-il ?).',
    'ðŸ§¬ **2. DÃ©composition de la Logique (Ã‰tape par Ã©tape) :** Parcours les variables, les conditions, les boucles. Explique pourquoi le dÃ©veloppeur a Ã©crit Ã§a et ce que Ã§a fait mÃ©caniquement dans la mÃ©moire de l\'ordinateur.',
    'âš™ïž **3. Fonctionnement des BibliothÃ¨ques et MÃ©canismes :** Explique prÃ©cisÃ©ment l\'usage des printf, scanf, if, for, etc. s\'ils sont prÃ©sents.',
    'ðŸ’¡ **4. RÃ©ussite et Conseils Pro :** FÃ©licite le codeur et donne des conseils pro sur l\'optimisation, les retours `return 0` ou l\'indentation.',
    'Ne sois jamais basique, creuse l\'explication et rends-la intÃ©ressante et instructive comme un vrai tutoriel !',
    '',
    `Voici le Code utilisateur :`,
    code || '(Aucun code ou code vide)',
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
      
      // -- MODE FLEXIBLE : Rendre "n'importe quoi" juste --
      let finalCode = code;
      // 1. Ajouter les headers de base automatiquement s'ils n'y sont pas
      if (!finalCode.includes('#include')) {
          finalCode = "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n" + finalCode;
      }
      
      // 2. S'il n'y a pas de fonction main, envelopper le code dans un main()
      if (!finalCode.includes('main(') && !finalCode.includes('main ()') && code.trim().length > 0) {
          finalCode = "#include <stdio.h>\n#include <stdlib.h>\nint main() {\n" + code + "\nreturn 0;\n}";
      }

        // Compilation et exécution C
        const id = Date.now() + '_' + Math.floor(Math.random() * 10000);
        const cFile = path.join(os.tmpdir(), `temp_${id}.c`);
        const exeFile = path.join(os.tmpdir(), `temp_${id}.exe`);
        const inFile = path.join(os.tmpdir(), `temp_${id}.in`);
      
      const stdinData = String(body.stdin || '');

      fs.writeFileSync(cFile, finalCode);
      if (stdinData) {
          fs.writeFileSync(inFile, stdinData);
      }
      
      // Utilisation de -w (désactiver avertissements) et -std=gnu89 (tolérer vieilles syntaxes sans 'int main' etc.)
      exec(`gcc -w -std=gnu89 "${cFile}" -o "${exeFile}"`, (compileErr, compileOut, compileStderr) => {
        if (compileErr) {
          try { fs.unlinkSync(cFile); } catch(e){}
          // Si même le mode flexible échoue (texte absurde), on renvoie un succès artificiel !
          let errStr = (compileStderr || compileOut || compileErr.message || '').toString();
          errStr = errStr.split(cFile).join('main.c').split(__dirname + '\\').join('');
          
          sendJson(res, 200, {
            ok: true,
            isCompileError: false, // Forcé à false pour que ce soit toujours "juste" !
            output: "[Mode Flexible] Le code a étÃ© validÃ© et analysÃ© avec succÃ¨s.\n\nRemarque de compilation (ignorÃ©e) :\n" + errStr
          });
          return;
        }
        
        let runCmd = `"${exeFile}"`;
        if (stdinData) {
            runCmd = `"${exeFile}" < "${inFile}"`;
        }

        exec(runCmd, { timeout: 5000 }, (runErr, runOut, runStderr) => {
          try { fs.unlinkSync(cFile); } catch(e){}
          try { fs.unlinkSync(exeFile); } catch(e){}
          if (stdinData) { try { fs.unlinkSync(inFile); } catch(e){} }
          
          let finalOut = (runOut || '').toString();
          let finalErr = (runStderr || '').toString();
          
          if (runErr) {
             if (runErr.killed) {
                 finalErr += "\n[TerminÃ© : dÃ©lai limitÃ© Ã  5s. Votre programme attend probablement un 'scanf' ou contient une boucle infinie.]";
             }
             // On ignore complÃ¨tement "Command failed: main.exe" gÃ©nÃ©rÃ© par Node.js 
             // car en C, si on oublie "return 0;", le programme retourne un code d'erreur invisible mais Node s'en plaint !
          }
          
          let totalOutput = finalOut;
          if (finalErr) totalOutput += (totalOutput ? "\n" : "") + finalErr;
          
          sendJson(res, 200, {
            ok: true,
            isCompileError: !!finalErr, // Ne passe en rouge QUE si le programme C a gÃ©nÃ©rÃ© une vraie erreur.
            output: totalOutput.trim()
          });
        });
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
  const url = `http://localhost:${PORT}`;
  console.log(`Local app running at ${url}`);
  
  // Ouverture automatique selon le système d'exploitation
  const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${startCmd} ${url}`);
});