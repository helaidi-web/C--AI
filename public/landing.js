/* C.AI Unified Platform JavaScript */

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initLineNumbers();
    initScrollAnimations();
    setupContactForm();
    animateEditorOnLoad();
});

// Update line numbers based on code
function initLineNumbers() {
    const codeEditor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');

    function updateLineNumbers() {
        const lines = codeEditor.value.split('\n').length;
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<div class="line-num">${i}</div>`;
        }
        lineNumbers.innerHTML = html;
    }

    updateLineNumbers();
    codeEditor.addEventListener('input', updateLineNumbers);
    codeEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            codeEditor.value = codeEditor.value.substring(0, start) + '\t' + codeEditor.value.substring(end);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + 1;
            updateLineNumbers();
        }
    });
}

// Animate editor on load
function animateEditorOnLoad() {
    const codeEditor = document.getElementById('codeEditor');
    const originalCode = codeEditor.value;
    codeEditor.value = '';

    let index = 0;
    const speed = 20; // milliseconds between characters

    function typeNextChar() {
        if (index < originalCode.length) {
            codeEditor.value += originalCode[index];
            index++;
            setTimeout(typeNextChar, speed);
        } else {
            addTerminalMessage('Code loaded. Ready to execute.', 'success');
        }
    }

    typeNextChar();
}

// Run code execution
async function runCode() {
    const codeEditor = document.getElementById('codeEditor');
    const runBtn = document.getElementById('runBtn');
    const code = codeEditor.value.trim();

    if (!code) {
        addTerminalMessage('Error: No code to execute', 'error');
        return;
    }

    runBtn.disabled = true;
    clearTerminal();
    addTerminalMessage('Executing code...', 'info');

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (data.ok) {
            clearTerminal();
            const output = data.output || 'Code executed successfully';
            output.split('\n').forEach(line => {
                if (line.trim()) addTerminalMessage(line, 'success');
            });
        } else {
            addTerminalMessage(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        addTerminalMessage(`Network error: ${error.message}`, 'error');
    } finally {
        runBtn.disabled = false;
    }
}

// AI Analysis
async function analyzeWithAI() {
    const codeEditor = document.getElementById('codeEditor');
    const aiBtn = document.getElementById('aiBtn');
    const code = codeEditor.value.trim();

    if (!code) {
        addAIMessage('Please enter some code first.', false);
        return;
    }

    aiBtn.disabled = true;
    showAIThinking();

    try {
        const response = await fetch('/api/assistant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, question: 'Please analyze this code and explain what it does.' })
        });

        const data = await response.json();
        clearAIChat();

        if (data.ok || data.response) {
            const explanation = data.response || data.explanation || 'Analysis complete';
            addAIMessage(explanation, true);
        } else {
            addAIMessage('Unable to analyze code at the moment.', true);
        }
    } catch (error) {
        clearAIChat();
        addAIMessage(`Error: ${error.message}`, false);
    } finally {
        aiBtn.disabled = false;
    }
}

// Terminal Messages
function addTerminalMessage(message, type = 'info') {
    const terminal = document.getElementById('terminalOutput');
    const line = document.createElement('div');

    switch (type) {
        case 'error':
            line.className = 'terminal-error';
            line.textContent = `[ERROR] ${message}`;
            break;
        case 'warning':
            line.className = 'terminal-warning';
            line.textContent = `[WARN] ${message}`;
            break;
        case 'success':
            line.className = 'terminal-success';
            line.textContent = message;
            break;
        default:
            line.className = '';
            line.innerHTML = `<span class="terminal-prompt">$</span> ${message}`;
    }

    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
    const terminal = document.getElementById('terminalOutput');
    terminal.innerHTML = '';
}

// AI Chat Messages
function showAIThinking() {
    clearAIChat();
    const chatArea = document.getElementById('aiChat');
    const thinking = document.createElement('div');
    thinking.className = 'ai-thinking';
    thinking.innerHTML = `
        <span>AI is analyzing</span>
        <div class="thinking-dots">
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
        </div>
    `;
    chatArea.appendChild(thinking);
}

function addAIMessage(message, isAI = true) {
    const chatArea = document.getElementById('aiChat');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-message';

    // Format the message (basic markdown-like formatting)
    const formatted = message
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-400">$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    msgDiv.innerHTML = `<p>${formatted}</p>`;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function clearAIChat() {
    const chatArea = document.getElementById('aiChat');
    chatArea.innerHTML = '';
}

// Scroll animations for sections below
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-element').forEach(el => {
        observer.observe(el);
    });
}

// Contact form
function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            await new Promise(resolve => setTimeout(resolve, 1000));

            submitBtn.textContent = 'Message Sent!';
            submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

            form.reset();

            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
            }, 3000);
        } catch (error) {
            console.error('Form submission error:', error);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Add Code Modal Functions
function openAddCodeModal() {
    document.getElementById('addCodeModal').classList.remove('hidden');
}

function closeAddCodeModal() {
    document.getElementById('addCodeModal').classList.add('hidden');
    document.getElementById('addCodeForm').reset();
}

// Delete code item from gallery
function deleteCodeItem(button) {
    const codeItem = button.closest('.gallery-code-item');
    codeItem.style.opacity = '0';
    codeItem.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        codeItem.remove();
    }, 300);
}

// Handle code submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addCodeForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('codeTitle').value.trim();
            const code = document.getElementById('codeContent').value.trim();

            if (!title || !code) {
                alert('Please fill in both title and code');
                return;
            }

            // Create gallery item with syntax highlighting
            const galleryItem = createGalleryItem(title, code);
            const container = document.getElementById('code-gallery-container');
            container.appendChild(galleryItem);

            // Close modal and reset form
            closeAddCodeModal();
        });
    }
});

function createGalleryItem(title, code) {
    const item = document.createElement('div');
    item.className = 'gallery-code-item fade-in-element';

    const header = document.createElement('div');
    header.className = 'code-header';
    header.textContent = title;

    const display = document.createElement('div');
    display.className = 'code-display';

    // Basic syntax highlighting
    const highlighted = highlightCode(code);
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.innerHTML = highlighted;
    pre.appendChild(codeEl);

    display.appendChild(pre);
    item.appendChild(header);
    item.appendChild(display);

    return item;
}

function highlightCode(code) {
    // Basic C syntax highlighting
    let highlighted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Keywords
    const keywords = ['#include', 'int', 'void', 'char', 'float', 'double', 'if', 'else', 'for', 'while', 'return', 'break', 'continue'];
    keywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'g');
        highlighted = highlighted.replace(regex, `<span class="keyword">${kw}</span>`);
    });

    // Strings
    highlighted = highlighted.replace(/"[^"]*"/g, (match) => `<span class="string">${match}</span>`);

    // Comments
    highlighted = highlighted.replace(/\/\/[^\n]*/g, (match) => `<span class="comment">${match}</span>`);
    highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, (match) => `<span class="comment">${match}</span>`);

    // Numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');

    return highlighted;
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Active nav link on scroll
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section[id]');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});