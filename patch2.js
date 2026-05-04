const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

const newFunc = `function buildLocalAnswer(code, question) {
  const analysis = extractCodeSignals(code);
  const questionText = (question || '').trim();
  const functions = extractFunctionNames(code);
  const variables = extractVariableHints(code);
  const answerLines = [];

  answerLines.push('⚠️ **Mode Hors-ligne (Fallback AI local)**');
  answerLines.push('Notre vrai moteur IA OpenAI n\\'est pas disponible car la clé API a dépassé son quota. Voici une analyse générée localement par notre moteur de secours interne :\\n');

  answerLines.push('🔍 **1. Aperçu général du programme**');
  if (analysis.signals.some(s => s.key === 'scanf') && analysis.signals.some(s => s.key === 'printf')) {
      answerLines.push("Il s'agit d'un programme **interactif** : il demande des informations à l'utilisateur (via \`scanf\`), les traite, puis affiche le résultat (via \`printf\`).");
  } else if (analysis.signals.some(s => s.key === 'printf')) {
      answerLines.push("C'est un programme d'**affichage** : son but principal est de formater et d'émettre des résultats ou messages à l'écran.");
  } else {
      answerLines.push("C'est un script C classique.");
  }

  answerLines.push('\\n⚙️ **2. Décomposition de la Logique**');
  if (functions.length > 0) {
    answerLines.push('* **Structure des fonctions détectées :**');
    for (const item of functions) {
      if (item.name === 'main') {
          answerLines.push('  - \`main()\` : Point d\\'entrée du programme.');
      } else {
          answerLines.push('  - \`' + item.name + ' (' + item.params + ')\` : Fonction locale utilitaire.');
      }
    }
  }

  if (variables.length > 0) {
    answerLines.push('* **Gestion de la mémoire :**');
    answerLines.push('  - Variables détectées : \`' + variables.join('\`, \`') + '\`');
  }

  if (analysis.signals.length > 0) {
      answerLines.push('\\n🛠️ **3. Mécanismes de code détectés**');
      for (const signal of analysis.signals) {
           answerLines.push('- **' + signal.label + '** : ' + signal.detail);
      }
  }
  
  answerLines.push('\\n💡 **4. Conseils & Bugs éventuels**');
  if (analysis.signals.some((signal) => signal.key === 'scanf')) {
    answerLines.push('- Vérifiez que vos \`scanf\` utilisent bien les adresses des variables (ajoutez \`&\`).');
  }
  if (!analysis.signals.some((signal) => signal.key === 'main')) {
    answerLines.push('- Aucune fonction \`main\` détectée : si c\\'est votre script principal, il ne pourra pas se lancer sans elle.');
  }

  if (questionText) {
    answerLines.push('');
    answerLines.push('❓ **Votre question :** ' + questionText);
    answerLines.push('*(Nous ne pouvons actuellement pas y répondre d\\'une façon personnalisée en mode hors-ligne, mais la structure ci-dessus devrait vous aider !)*');
  }

  return answerLines.join('\\n');
}`;

// Find the boundaries
const startIdx = serverCode.indexOf('function buildLocalAnswer');
const startAsk = serverCode.indexOf('async function askOpenAI');

if (startIdx !== -1 && startAsk !== -1) {
    const finalCode = serverCode.substring(0, startIdx) + newFunc + "\\n\\n" + serverCode.substring(startAsk);
    fs.writeFileSync('server.js', finalCode, 'utf8');
    console.log("Success patched!");
} else {
    console.log("Could not patch.");
}
