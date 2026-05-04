const fs = require('fs');
const file = 'server.js';
let content = fs.readFileSync(file, 'utf8');

const start = content.indexOf('function buildLocalAnswer(code, question) {');
const end = content.indexOf('function serveStatic(req, res, pathname) {');

const newCode = `function buildLocalAnswer(code, question) {
  const analysis = extractCodeSignals(code);
  const questionText = (question || '').trim();
  const functions = extractFunctionNames(code);
  const variables = extractVariableHints(code);
  const answerLines = [];

  answerLines.push('⚠️ **Mode Hors-ligne (Quota API dépassé)**');
  answerLines.push('Voici une analyse locale et détaillée de votre code :\\n');
  
  answerLines.push('🔍 **1. Aperçu général du programme**');
  if (analysis.signals.some(s => s.key === 'scanf') && analysis.signals.some(s => s.key === 'printf')) {
      answerLines.push("Il s'agit d'un programme **interactif** : il demande des informations à l'utilisateur (via \`scanf\`), les traite, puis affiche le résultat (via \`printf\`).");
  } else if (analysis.signals.some(s => s.key === 'printf')) {
      answerLines.push("C'est un programme d'**affichage** : son but principal est de formater et d'émettre des résultats ou des messages à l'écran.");
  } else {
      answerLines.push("C'est un script C classique.");
  }

  answerLines.push('\\n⚙️ **2. Décomposition de la Logique**');
  if (functions.length > 0) {
    answerLines.push('* **Structure des fonctions :**');
    for (const item of functions) {
      if (item.name === 'main') {
          answerLines.push(\`  - \\\`main()\\\` : Le point d'entrée principal du programme.\`);
      } else {
          answerLines.push(\`  - \\\`\${item.name} (\${item.params})\\\` : Une fonction locale pour séparer la logique.\`);
      }
    }
  }

  if (variables.length > 0) {
    answerLines.push('* **Gestion de la mémoire :**');
    answerLines.push(\`  Variables détectées : \\\`\${variables.join('\\`, \\`')}\\\`.\`);
  }

  if (analysis.signals.length > 0) {
      answerLines.push('\\n🛠️ **3. Mécanismes de contrôle détectés**');
      for (const signal of analysis.signals) {
           answerLines.push(\`- **\${signal.label}** : \${signal.detail}\`);
           if (signal.key === 'for' || signal.key === 'while') {
               answerLines.push("  *(Note: Boucle répétitive détectée).*");
           }
           if (signal.key === 'if') {
               answerLines.push("  *(Note: Condition logique détectée).*");
           }
      }
  } else {
    answerLines.push('\\n- Aucun mécanisme complexe détecté.');
  }
  
  answerLines.push('\\n💡 **4. Conseils & Bugs éventuels**');
  if (analysis.signals.some((signal) => signal.key === 'scanf')) {
    answerLines.push('- Vérifiez que \`scanf\` reçoit bien des adresses mémoires (ex: \`&variable\`).');
  }
  if (!analysis.signals.some((signal) => signal.key === 'int main') && !analysis.signals.some((signal) => signal.key === 'main')) {
    answerLines.push("- La fonction \`main\` n'a pas été trouvée, le programme risque de ne pas s'exécuter correctement.");
  }

  if (questionText) {
    answerLines.push('');
    answerLines.push(\`❓ **Votre Question :** \${questionText}\`);
    answerLines.push('- *(Impossible de répondre précisément sans OpenAI, mais référez-vous à l\'analyse ci-dessus)*.');
  }

  return answerLines.join('\\n');
}

async function askOpenAI({ code, question, analysis }) {
  if (!OPENAI_API_KEY) {
    console.log('[OpenAI] No API key - using local fallback');
    return {
      usedOpenAI: false,
      answer: buildLocalAnswer(code, question),
      note: 'OPENAI_API_KEY manquante. Réponse locale utilisée.'
    };
  }

  const prompt = [
    'Tu es "C.AI", un professeur expert et passionné de programmation C.',
    'Réponds entièrement en français et utilise des icônes ou emojis pour structurer le texte.',
    'Ta réponse doit IMPÉRATIVEMENT être structurée avec ces parties en Markdown :',
    '1. 🔍 Analyse Globale : Quel est le but du code ?',
    '2. ⚙️ Explication de la Logique : Comment les calculs ou boucles sont structurés.',
    '3. 🐞 Erreurs ou Améliorations : Pistes d\\'optimisation (si possible).',
    '4. ❓ Réponse à la demande : ' + (question || 'Explique-moi ce code.'),
    'Sois très précis et pédagogue.',
    '---',
    'Code C :',
    code
  ].join('\\n');

  try {
    console.log(\`[OpenAI] Sending request to /v1/chat/completions with model: \${OPENAI_MODEL}\`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${OPENAI_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
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
        note: \`OpenAI error (\${response.status}) - using local fallback\`
      };
    }

    const answer = data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
    console.log('[OpenAI] ✓ Success - received response');
    
    return {
      usedOpenAI: true,
      answer,
      note: \`Model: \${OPENAI_MODEL} ✓\`
    };
  } catch (error) {
    console.error('[OpenAI] Request failed:', error.message);
    const fallback = buildLocalAnswer(code, question);
    return {
      usedOpenAI: false,
      answer: fallback,
      note: \`Request failed - using local fallback\`
    };
  }
}

`;

content = content.substring(0, start) + newCode + content.substring(end);
fs.writeFileSync(file, content, 'utf8');
console.log("Patched server.js local AI fallback and prompt.");
