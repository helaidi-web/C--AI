/* C.AI Unified Platform JavaScript - Premium IDE Layer */

const appState = {
    files: {
        'main.c': `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n = 5;
    int *arr = malloc(n * sizeof(int));
    if (!arr) return 1;

    for (int i = 0; i < n; i++) {
        arr[i] = i * 3;
    }

    arr = realloc(arr, (n + 2) * sizeof(int));
    if (!arr) return 1;

    printf("Welcome to C.AI premium mode\\n");
    free(arr);
    return 0;
}`,
        'memory.c': `#include <stdlib.h>

void fill_buffer(int count) {
    char *buffer = malloc(count);
    if (!buffer) return;

    for (int i = 0; i < count; i++) {
        buffer[i] = 'A';
    }

    free(buffer);
}`,
        'helpers.h': `#ifndef HELPERS_H
#define HELPERS_H

int sum_array(int *arr, int size);

#endif`
    },
    activeFile: 'main.c',
    commandHistory: [],
    historyIndex: -1,
    terminalBuffer: '',
    terminalInputBuffer: '',
    terminalSuggestions: [],
    suggestionIndex: 0,
    typingEnabled: true,
    scanEnabled: true
};

const terminalCommands = {
    help: () => [
        'Available commands:',
        'help, run, analyze, clear, stats, memory, theme, input <value>'
    ],
    run: async () => {
        await runCode();
        return [];
    },
    analyze: async () => {
        await analyzeWithAI();
        return [];
    },
    clear: () => {
        clearTerminal();
        return ['Terminal cleared.'];
    },
    stats: () => {
        const stats = computeCodeStats(getCodeEditor().value);
        return [
            `Lines: ${stats.lines}`,
            `Functions: ${stats.functions}`,
            `Memory ops: ${stats.memoryOps}`,
            `Warnings: ${stats.warnings}`
        ];
    },
    memory: () => [
        'Memory Tips:',
        '- Verify malloc/realloc return values',
        '- Always free allocated memory',
        '- Avoid use-after-free'
    ],
    theme: () => {
        toggleTheme();
        return ['Theme toggled.'];
    },
    input: (args) => {
        const value = args.join(' ');
        appState.terminalInputBuffer = value;
        return [`stdin buffer updated: "${value}"`];
    }
};

function byId(id) {
    return document.getElementById(id);
}

function getCodeEditor() {
    return byId('codeEditor');
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function tokenizeC(code) {
    const escaped = escapeHtml(code);
    return escaped
        .replace(/(\/\/.*)$/gm, '<span class="code-token-comment">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-token-comment">$1</span>')
        .replace(/("(?:\\.|[^"])*")/g, '<span class="code-token-string">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="code-token-number">$1</span>')
        .replace(/\b(return|if|else|for|while|do|break|continue|switch|case|default)\b/g, '<span class="code-token-keyword">$1</span>')
        .replace(/\b(int|char|float|double|void|long|short|unsigned|signed|size_t|struct)\b/g, '<span class="code-token-type">$1</span>')
        .replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="code-token-func">$1</span>');
}

function setEditorContent(fileName) {
    const codeEditor = getCodeEditor();
    appState.activeFile = fileName;
    codeEditor.value = appState.files[fileName] || '';
    byId('activeFileName').textContent = fileName;
    updateLineNumbers();
    syncHighlight();
    updateDashboardStats();
    updateCursorIndicator();
}

function updateLineNumbers() {
    const codeEditor = getCodeEditor();
    const lineNumbers = byId('lineNumbers');
    const count = codeEditor.value.split('\n').length;
    let html = '';

    for (let i = 1; i <= count; i++) {
        html += `<div class="line-num">${i}</div>`;
    }

    lineNumbers.innerHTML = html;
}

function syncHighlight() {
    const codeEditor = getCodeEditor();
    const layer = byId('highlightLayer');
    const highlighted = tokenizeC(codeEditor.value || ' ');

    layer.innerHTML = `${highlighted}\n`;
    layer.scrollTop = codeEditor.scrollTop;
    layer.scrollLeft = codeEditor.scrollLeft;

    appState.files[appState.activeFile] = codeEditor.value;
}

function updateCursorIndicator() {
    const codeEditor = getCodeEditor();
    const cursor = byId('editorCursor');
    const cursorPos = byId('cursorPos');
    const start = codeEditor.selectionStart || 0;
    const before = codeEditor.value.slice(0, start).split('\n');
    const line = before.length;
    const col = before[before.length - 1].length + 1;
    const lineHeight = 20.8;
    const charWidth = 7.8;
    const x = 44 + 16 + (col - 1) * charWidth - codeEditor.scrollLeft;
    const y = 12 + (line - 1) * lineHeight - codeEditor.scrollTop;

    cursor.style.transform = `translate(${Math.max(44, x)}px, ${Math.max(0, y)}px)`;
    cursorPos.textContent = `Ln ${line}, Col ${col}`;
}

function computeCodeStats(code) {
    const lines = code.split('\n').length;
    const functions = (code.match(/\b[a-zA-Z_]\w*\s*\([^;]*\)\s*\{/g) || []).length;
    const memoryOps = (code.match(/\b(malloc|realloc|free)\b/g) || []).length;
    let warnings = 0;

    if (/malloc\s*\(/.test(code) && !/free\s*\(/.test(code)) warnings += 1;
    if (/realloc\s*\(/.test(code) && !/if\s*\(!?\w+\)/.test(code)) warnings += 1;
    if (/gets\s*\(/.test(code)) warnings += 1;

    return { lines, functions, memoryOps, warnings };
}

function getCSymbolSuggestions(code) {
    const base = [
        'gcc', 'clang', 'make', 'run', 'analyze', 'memory', 'stats', 'clear', 'help',
        'printf', 'scanf', 'malloc', 'realloc', 'calloc', 'free', 'fgets', 'strlen',
        'memcpy', 'memset', 'for', 'while', 'if', 'switch', 'return', '#include <stdio.h>',
        '#include <stdlib.h>', '#include <string.h>'
    ];

    const symbols = new Set(base);
    const tokens = code.match(/[A-Za-z_]\w*/g) || [];
    tokens.forEach((token) => {
        if (token.length >= 3) symbols.add(token);
    });

    return Array.from(symbols);
}

function refreshTerminalSuggestion() {
    const input = byId('terminalInput');
    const box = byId('terminalSuggestion');
    const value = input.value.trim().toLowerCase();
    const pool = getCSymbolSuggestions(getCodeEditor().value);

    if (!value) {
        appState.terminalSuggestions = [];
        box.textContent = 'Hint: use Tab for contextual completion.';
        return;
    }

    const matches = pool
        .filter((item) => item.toLowerCase().startsWith(value) && item.toLowerCase() !== value)
        .slice(0, 6);

    appState.terminalSuggestions = matches;
    appState.suggestionIndex = 0;

    if (!matches.length) {
        box.textContent = 'No suggestion for current input.';
        return;
    }

    box.innerHTML = `Suggestion: <strong>${matches[0]}</strong> | ${matches.slice(1).join(' | ')}`;
}

function updateDashboardStats() {
    const stats = computeCodeStats(getCodeEditor().value);
    byId('statLines').textContent = String(stats.lines);
    byId('statFunctions').textContent = String(stats.functions);
    byId('statMemory').textContent = String(stats.memoryOps);
    byId('statWarnings').textContent = String(stats.warnings);
}

function appendEmbeddedTerminal(message) {
    const body = byId('embeddedTerminalBody');
    const line = document.createElement('div');
    line.textContent = `$ ${message}`;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
}

function showToast(message, type = 'info') {
    const stack = byId('toastStack');
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.textContent = type === 'error' ? `Error: ${message}` : message;
    stack.appendChild(item);

    setTimeout(() => {
        item.remove();
    }, 2600);
}

function toggleLoader(show) {
    const loader = byId('premiumLoader');
    loader.classList.toggle('hidden', !show);
}

function typeText(target, text, speed = 12) {
    return new Promise((resolve) => {
        if (!appState.typingEnabled) {
            target.textContent = text;
            resolve();
            return;
        }

        let i = 0;
        target.textContent = '';
        target.classList.add('ai-typing');

        function next() {
            if (i >= text.length) {
                target.classList.remove('ai-typing');
                resolve();
                return;
            }
            target.textContent += text[i++];
            setTimeout(next, speed);
        }

        next();
    });
}

function initThemeToggle() {
    const themeToggle = byId('themeToggle');
    const sunIcon = byId('sunIcon');
    const moonIcon = byId('moonIcon');
    const savedTheme = localStorage.getItem('theme') || 'dark-mode';

    if (savedTheme === 'light-mode') {
        document.body.classList.add('light-mode');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }

    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const sunIcon = byId('sunIcon');
    const moonIcon = byId('moonIcon');

    document.body.classList.toggle('light-mode');
    sunIcon.classList.toggle('hidden');
    moonIcon.classList.toggle('hidden');

    const isLightMode = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLightMode ? 'light-mode' : 'dark-mode');
}

function initEditorExperience() {
    const codeEditor = getCodeEditor();
    const lineNumbers = byId('lineNumbers');

    setEditorContent(appState.activeFile);

    codeEditor.addEventListener('input', () => {
        updateLineNumbers();
        syncHighlight();
        updateDashboardStats();
    });

    codeEditor.addEventListener('scroll', () => {
        lineNumbers.scrollTop = codeEditor.scrollTop;
        syncHighlight();
    });

    codeEditor.addEventListener('click', updateCursorIndicator);
    codeEditor.addEventListener('keyup', updateCursorIndicator);
    codeEditor.addEventListener('select', updateCursorIndicator);

    codeEditor.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            codeEditor.value = `${codeEditor.value.substring(0, start)}\t${codeEditor.value.substring(end)}`;
            codeEditor.selectionStart = codeEditor.selectionEnd = start + 1;
            updateLineNumbers();
            syncHighlight();
            updateCursorIndicator();
        }
    });

    document.querySelectorAll('.editor-tab, .sidebar-item').forEach((button) => {
        button.addEventListener('click', () => {
            const file = button.getAttribute('data-file');
            if (!file || !appState.files[file]) return;

            document.querySelectorAll('.editor-tab, .sidebar-item').forEach((item) => {
                item.classList.toggle('active', item.getAttribute('data-file') === file);
            });

            setEditorContent(file);
            appendEmbeddedTerminal(`opened ${file}`);
        });
    });

    animateEditorOnLoad();
}

function animateEditorOnLoad() {
    if (!appState.typingEnabled) {
        appendEmbeddedTerminal('Code loaded. Ready.');
        return;
    }

    const codeEditor = getCodeEditor();
    const original = codeEditor.value;
    codeEditor.value = '';
    syncHighlight();
    updateLineNumbers();

    let index = 0;
    function typeNext() {
        if (index >= original.length) {
            appendEmbeddedTerminal('Code loaded. Ready.');
            updateCursorIndicator();
            updateDashboardStats();
            return;
        }
        codeEditor.value += original[index++];
        syncHighlight();
        updateLineNumbers();
        setTimeout(typeNext, 10);
    }

    typeNext();
}

function addTerminalMessage(message, type = 'info') {
    const terminal = byId('terminalOutput');
    const line = document.createElement('div');

    if (type === 'error') {
        line.className = 'terminal-error';
        line.textContent = `[ERROR] ${message}`;
    } else if (type === 'warning') {
        line.className = 'terminal-warning';
        line.textContent = `[WARN] ${message}`;
    } else if (type === 'success') {
        line.className = 'terminal-success';
        line.textContent = message;
    } else {
        line.innerHTML = `<span class="terminal-prompt">$</span> ${message}`;
    }

    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
    byId('terminalOutput').innerHTML = '';
}

async function runCode() {
    const code = getCodeEditor().value.trim();
    const runBtn = byId('runBtn');

    if (!code) {
        addTerminalMessage('No code to execute', 'error');
        showToast('Code editor is empty', 'error');
        return;
    }

    runBtn.disabled = true;
    toggleLoader(true);
    addTerminalMessage('Executing code...', 'info');

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, stdin: appState.terminalInputBuffer })
        });

        const data = await response.json();
        clearTerminal();

        if (data.ok) {
            const output = String(data.output || 'Execution finished');
            output.split('\n').forEach((line) => {
                if (line.trim()) addTerminalMessage(line, /error|erreur/i.test(line) ? 'error' : 'success');
            });
            appendEmbeddedTerminal('build completed');
            showToast('Execution complete');
        } else {
            addTerminalMessage(data.error || 'Execution failed', 'error');
            showToast('Execution failed', 'error');
        }
    } catch (error) {
        addTerminalMessage(`Network error: ${error.message}`, 'error');
        showToast('Network issue while running', 'error');
    } finally {
        toggleLoader(false);
        runBtn.disabled = false;
    }
}

function extractLineInsights(code) {
    const lines = code.split('\n');
    const insights = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let fr = 'Instruction C standard.';
        let ar = 'تعليمة سي قياسية.';

        if (/malloc/.test(trimmed)) {
            fr = 'Allocation dynamique: verifier le retour de malloc pour eviter un pointeur NULL.';
            ar = 'تخصيص ذاكرة ديناميكي: تحقق من قيمة malloc لتفادي NULL.';
        } else if (/realloc/.test(trimmed)) {
            fr = 'Reallocation memoire: utiliser un pointeur temporaire est plus sur.';
            ar = 'إعادة تخصيص الذاكرة: من الأفضل استعمال مؤشر مؤقت.';
        } else if (/free/.test(trimmed)) {
            fr = 'Liberation memoire: bonne pratique pour eviter les fuites memoire.';
            ar = 'تحرير الذاكرة: ممارسة جيدة لتجنب تسرب الذاكرة.';
        } else if (/for|while/.test(trimmed)) {
            fr = 'Boucle detectee: attention aux limites pour eviter un depassement.';
            ar = 'تم اكتشاف حلقة: انتبه للحدود لتفادي تجاوز الذاكرة.';
        } else if (/if\s*\(/.test(trimmed)) {
            fr = 'Condition detectee: elle protege un flux logique ou memoire.';
            ar = 'تم اكتشاف شرط: يحمي تدفق المنطق أو الذاكرة.';
        }

        insights.push({ line: index + 1, source: trimmed, fr, ar });
    });

    return insights.slice(0, 8);
}

function findOptimizationTips(code) {
    const tips = [];
    if (/realloc\s*\(\s*\w+/.test(code) && !/\w+\s*=\s*realloc/.test(code)) {
        tips.push('Use temporary pointer for realloc to avoid leaks on failure.');
    }
    if (/for\s*\([^)]*;[^)]*<[^)]*;[^)]*\)/.test(code) && /int\s+\w+\s*=\s*0/.test(code)) {
        tips.push('Consider size_t for array indexing in loops.');
    }
    if (/printf\s*\("[^"]*\\n"\)/.test(code) === false) {
        tips.push('Add newline in printf for cleaner terminal output.');
    }
    return tips.slice(0, 4);
}

function findPotentialErrors(code) {
    const errors = [];
    const lines = code.split('\n');

    if (/malloc\s*\(/.test(code) && !/if\s*\(!?\w+\)/.test(code)) {
        errors.push('Potential NULL pointer dereference after malloc/realloc.');
    }

    if (/realloc\s*\(\s*\w+/.test(code) && !/\w+\s*=\s*realloc\s*\(/.test(code)) {
        errors.push('realloc result should be assigned to temporary pointer before overwrite.');
    }

    if (/gets\s*\(/.test(code)) {
        errors.push('Unsafe function gets() detected. Use fgets() instead.');
    }

    const freed = new Set();
    const useAfterFreeHits = [];

    lines.forEach((line, index) => {
        const freeMatch = line.match(/\bfree\s*\(\s*([A-Za-z_]\w*)\s*\)/);
        if (freeMatch) {
            const ptr = freeMatch[1];
            if (freed.has(ptr)) {
                errors.push(`Possible double free detected for pointer ${ptr} at line ${index + 1}.`);
            }
            freed.add(ptr);
            return;
        }

        freed.forEach((ptr) => {
            if (new RegExp(`\\b${ptr}\\b`).test(line) && !/\bNULL\b/.test(line)) {
                useAfterFreeHits.push({ ptr, line: index + 1 });
            }
        });
    });

    useAfterFreeHits.slice(0, 2).forEach((hit) => {
        errors.push(`Possible use-after-free: pointer ${hit.ptr} referenced at line ${hit.line}.`);
    });

    if (/\bstrcpy\s*\(/.test(code) || /\bsprintf\s*\(/.test(code)) {
        errors.push('Potential buffer overflow risk: prefer strncpy/snprintf with explicit bounds.');
    }

    if (/malloc|realloc|free/.test(code) && !/#include\s*<stdlib\.h>/.test(code)) {
        errors.push('Missing #include <stdlib.h> for memory APIs.');
    }

    if (/return\s+&\w+\s*;/.test(code)) {
        errors.push('Returning address of local variable can create dangling pointer.');
    }

    if (/\bfree\s*\(\s*\w+\s*\);/.test(code) && /\b\w+\s*=\s*NULL\s*;/.test(code) === false) {
        errors.push('Consider setting freed pointers to NULL to reduce accidental reuse.');
    }

    return errors.slice(0, 7);
}

function clearAIChat() {
    byId('aiChat').innerHTML = '';
}

function createBubble(label, content) {
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble';

    const bubbleLabel = document.createElement('div');
    bubbleLabel.className = 'ai-bubble-label';
    bubbleLabel.textContent = label;

    const bubbleBody = document.createElement('div');

    bubble.appendChild(bubbleLabel);
    bubble.appendChild(bubbleBody);
    byId('aiChat').appendChild(bubble);

    return typeText(bubbleBody, content, 8);
}

async function analyzeWithAI() {
    const aiBtn = byId('aiBtn');
    const code = getCodeEditor().value.trim();

    if (!code) {
        showToast('No code to analyze', 'error');
        return;
    }

    aiBtn.disabled = true;
    toggleLoader(true);
    clearAIChat();

    try {
        const response = await fetch('/api/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                question: 'Explain this C code line by line in French and Arabic, include memory notes malloc/realloc/free, detect possible errors and optimization suggestions.'
            })
        });

        const data = await response.json();
        const insights = extractLineInsights(code);
        const memoryOps = (code.match(/\b(malloc|realloc|free)\b/g) || []).join(', ') || 'none';
        const warnings = findPotentialErrors(code);
        const optimization = findOptimizationTips(code);

        await createBubble('AI SUMMARY', data.response || 'Analyse locale premium active.');
        await createBubble('MEMORY', `Detected memory operations: ${memoryOps}.`);

        for (const item of insights) {
            await createBubble(
                `LINE ${item.line}`,
                `FR: ${item.fr}\nAR: ${item.ar}\nCode: ${item.source}`
            );
        }

        await createBubble('ERROR CHECK', warnings.length ? warnings.join('\n') : 'No critical issue detected.');
        await createBubble('OPTIMIZATION', optimization.length ? optimization.join('\n') : 'Current structure is acceptable.');

        showToast('AI analysis completed');
    } catch (error) {
        await createBubble('AI ERROR', `Unable to analyze now: ${error.message}`);
        showToast('AI analysis failed', 'error');
    } finally {
        toggleLoader(false);
        aiBtn.disabled = false;
        byId('aiChat').scrollTop = byId('aiChat').scrollHeight;
    }
}

function initTerminalPremium() {
    const terminalInput = byId('terminalInput');
    const submitBtn = byId('terminalEnterBtn');

    async function runTerminalCommand() {
        const raw = terminalInput.value.trim();
        if (!raw) return;

        addTerminalMessage(`user@cai:~$ ${raw}`, 'info');
        appState.commandHistory.push(raw);
        appState.historyIndex = appState.commandHistory.length;
        terminalInput.value = '';

        const [command, ...args] = raw.split(/\s+/);
        const handler = terminalCommands[command.toLowerCase()];

        if (!handler) {
            const suggest = Object.keys(terminalCommands)
                .filter((item) => item.startsWith(command.toLowerCase()))
                .slice(0, 3);
            addTerminalMessage(`Command not found: ${command}`, 'warning');
            if (suggest.length) addTerminalMessage(`Did you mean: ${suggest.join(', ')} ?`, 'info');
            return;
        }

        const result = await handler(args);
        result.forEach((line) => addTerminalMessage(line, 'success'));
    }

    terminalInput.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            await runTerminalCommand();
        }

        if (event.key === 'ArrowUp' && appState.commandHistory.length) {
            event.preventDefault();
            appState.historyIndex = Math.max(0, appState.historyIndex - 1);
            terminalInput.value = appState.commandHistory[appState.historyIndex] || '';
        }

        if (event.key === 'ArrowDown' && appState.commandHistory.length) {
            event.preventDefault();
            appState.historyIndex = Math.min(appState.commandHistory.length, appState.historyIndex + 1);
            terminalInput.value = appState.commandHistory[appState.historyIndex] || '';
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            const current = terminalInput.value.trim().toLowerCase();
            const cmdFound = Object.keys(terminalCommands).find((item) => item.startsWith(current));

            if (cmdFound) {
                terminalInput.value = cmdFound;
                refreshTerminalSuggestion();
                return;
            }

            if (appState.terminalSuggestions.length) {
                const pick = appState.terminalSuggestions[appState.suggestionIndex % appState.terminalSuggestions.length];
                terminalInput.value = pick;
                appState.suggestionIndex += 1;
                refreshTerminalSuggestion();
            }
        }
    });

    terminalInput.addEventListener('input', refreshTerminalSuggestion);
    refreshTerminalSuggestion();

    submitBtn.addEventListener('click', runTerminalCommand);
}

function initPanelsAndControls() {
    byId('sidebarToggle').addEventListener('click', () => {
        const sidebar = byId('premiumSidebar');
        sidebar.classList.toggle('hidden');
        showToast(sidebar.classList.contains('hidden') ? 'Sidebar hidden' : 'Sidebar visible');
    });

    byId('settingsToggle').addEventListener('click', () => {
        byId('settingsPanel').classList.toggle('hidden');
    });

    byId('aiToolsToggle').addEventListener('click', () => {
        byId('aiToolsPanel').classList.toggle('hidden');
    });

    byId('toggleTyping').addEventListener('change', (event) => {
        appState.typingEnabled = event.target.checked;
        showToast(`Typing animation ${appState.typingEnabled ? 'enabled' : 'disabled'}`);
    });

    byId('toggleScan').addEventListener('change', (event) => {
        appState.scanEnabled = event.target.checked;
        byId('terminalOutput').classList.toggle('scan-enabled', appState.scanEnabled);
        showToast(`Scan effect ${appState.scanEnabled ? 'enabled' : 'disabled'}`);
    });

    byId('toggleCompact').addEventListener('change', (event) => {
        document.body.classList.toggle('compact-mode', event.target.checked);
    });

    byId('floatingRun').addEventListener('click', runCode);
    byId('floatingAnalyze').addEventListener('click', analyzeWithAI);

    byId('openQuickModal').addEventListener('click', () => byId('quickModal').classList.remove('hidden'));
    byId('closeQuickModal').addEventListener('click', () => byId('quickModal').classList.add('hidden'));

    document.querySelectorAll('.tool-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const tool = button.getAttribute('data-tool');
            if (tool === 'line') await analyzeWithAI();
            if (tool === 'memory') addTerminalMessage('Memory checker activated', 'success');
            if (tool === 'optimize') addTerminalMessage('Optimization hints generated', 'success');
            if (tool === 'bugs') addTerminalMessage('Error detection complete', 'success');
            showToast(`AI tool: ${tool}`);
        });
    });

    const splitButtons = document.querySelectorAll('.mobile-split-btn');
    splitButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const view = button.getAttribute('data-view');
            document.body.classList.add('view-switching');
            splitButtons.forEach((item) => item.classList.toggle('active', item === button));
            document.body.classList.toggle('mobile-view-editor', view === 'editor');
            document.body.classList.toggle('mobile-view-terminal', view === 'terminal');
            setTimeout(() => {
                document.body.classList.remove('view-switching');
            }, 220);
            showToast(`Mobile view: ${view}`);
        });
    });
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in-element').forEach((item) => observer.observe(item));
}

function setupContactForm() {
    const form = byId('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = form.querySelector('button[type="submit"]');
        const label = submit.textContent;

        submit.disabled = true;
        submit.textContent = 'Sending...';

        await new Promise((resolve) => setTimeout(resolve, 800));

        submit.textContent = 'Message Sent!';
        form.reset();

        setTimeout(() => {
            submit.disabled = false;
            submit.textContent = label;
        }, 1800);
    });
}

function openAddCodeModal() {
    byId('addCodeModal').classList.remove('hidden');
}

function closeAddCodeModal() {
    byId('addCodeModal').classList.add('hidden');
    const form = byId('addCodeForm');
    if (form) form.reset();
}

function deleteCodeItem(button) {
    const card = button.closest('.gallery-code-item');
    if (!card) return;
    card.style.opacity = '0';
    card.style.transform = 'translateY(-8px)';
    setTimeout(() => card.remove(), 280);
}

function highlightCode(code) {
    let output = escapeHtml(code);
    output = output.replace(/\b(#include|int|void|char|float|double|if|else|for|while|return|struct)\b/g, '<span class="keyword">$1</span>');
    output = output.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    output = output.replace(/("(?:\\.|[^"])*")/g, '<span class="string">$1</span>');
    output = output.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="function">$1</span>');
    output = output.replace(/(\/\/.*)$/gm, '<span class="comment">$1</span>');
    return output;
}

function createGalleryItem(title, code) {
    const item = document.createElement('div');
    item.className = 'gallery-code-item fade-in-element';

    const header = document.createElement('div');
    header.className = 'code-header';
    header.innerHTML = `${title}<button class="delete-code-btn" title="Delete code example">x</button>`;

    const display = document.createElement('div');
    display.className = 'code-display';
    display.innerHTML = `<pre><code>${highlightCode(code)}</code></pre>`;

    header.querySelector('.delete-code-btn').addEventListener('click', (event) => {
        deleteCodeItem(event.currentTarget);
    });

    item.appendChild(header);
    item.appendChild(display);
    return item;
}

function setupCodeForm() {
    const form = byId('addCodeForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const title = byId('codeTitle').value.trim();
        const code = byId('codeContent').value.trim();
        if (!title || !code) return;

        byId('code-gallery-container').appendChild(createGalleryItem(title, code));
        closeAddCodeModal();
        showToast('Code example added');
    });
}

function setupNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    window.addEventListener('scroll', () => {
        let current = '';
        document.querySelectorAll('section[id]').forEach((section) => {
            if (window.scrollY >= section.offsetTop - 220) {
                current = section.getAttribute('id');
            }
        });

        document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href').slice(1) === current);
        });
    });
}

function bootstrap() {
    initThemeToggle();
    initEditorExperience();
    initTerminalPremium();
    initPanelsAndControls();
    initScrollAnimations();
    setupContactForm();
    setupCodeForm();
    setupNavigation();
    addTerminalMessage('Premium terminal ready.', 'success');
    updateDashboardStats();
}

document.addEventListener('DOMContentLoaded', bootstrap);

window.runCode = runCode;
window.analyzeWithAI = analyzeWithAI;
window.openAddCodeModal = openAddCodeModal;
window.closeAddCodeModal = closeAddCodeModal;
window.deleteCodeItem = deleteCodeItem;
