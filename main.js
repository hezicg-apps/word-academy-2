let state = {
    screen: 'welcome', 
    words: [],
    listName: 'אוצר המילים שלי',
    nightMode: false, 
    quizIndex: 0, 
    correctAnswers: 0,
    masteryScore: 0,
    memoryGame: { cards: [], flipped: [], pairs: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), mode: null, turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', maxAttempts: 6, isGameOver: false },
    winner: null
};

let learningState = { currentIndex: 0, isFlipped: false, knownWords: [] };

function triggerConfetti() { if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function toggleNightMode() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode', state.nightMode);
    render();
}

function render() {
    const app = document.getElementById('app');
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';
    app.innerHTML = ''; 

    const isDark = state.nightMode;
    const header = document.createElement('header');
    header.className = `flex flex-row-reverse justify-between items-center p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-b sticky top-0 z-50 transition-all`;
    
    header.innerHTML = `
        <div class="flex items-center gap-3" style="direction: ltr; text-align: left;">
            <img src="logo.svg" alt="WA" class="h-12 w-12 object-contain" style="background: transparent;">
            <div class="flex flex-col items-start">
                <span class="text-blue-600 font-black text-2xl leading-none">Word Academy</span>
                <span class="text-[11px] font-bold text-slate-400 mt-1">תרגול אוצר מילים בכיף 🦉</span>
            </div>
        </div>
        <button onclick="toggleNightMode()" class="p-2 rounded-2xl transition-all text-2xl border ${isDark ? 'bg-slate-800 text-yellow-400 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-100'}">
            ${isDark ? '☀️' : '🌙'}
        </button>
    `;
    app.appendChild(header);

    const content = document.createElement('div');
    content.className = "w-full max-w-4xl mx-auto p-4";
    app.appendChild(content);

    if (state.words.length === 0 && !window.location.search.includes('w=')) {
        renderInputScreen(content);
    } else {
        const screens = {
            input: renderInputScreen,
            welcome: renderWelcomeScreen,
            flashcards: renderFlashcardsScreen,
            quiz: renderQuizScreen,
            report: renderReportScreen,
            menu: renderMenuScreen,
            memory: renderMemory,
            connect4: renderConnect4,
            wordquest: renderWordQuest
        };
        if (screens[state.screen]) screens[state.screen](content);
    }
}

function renderInputScreen(container) {
    container.innerHTML = `
        <div class="p-6 space-y-6 animate-fade-in text-center">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-blue-100">
                <h2 class="text-2xl font-black mb-4">יצירת רשימה חדשה 📝</h2>
                <textarea id="wordInput" class="w-full h-64 p-4 border-2 border-slate-100 rounded-2xl outline-none font-medium text-right" 
                    placeholder="שם הרשימה\ndog - כלב\ncat - חתול"></textarea>
                <button onclick="saveNewList()" class="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg">צור ושתף קישור! ✨</button>
            </div>
        </div>
    `;
}

function saveNewList() {
    const text = document.getElementById('wordInput').value.trim();
    if (!text || !text.includes('-')) return alert("נא להזין מילים במבנה: אנגלית - עברית");
    const lines = text.split('\n');
    state.listName = lines[0];
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { eng, heb };
    });
    const encoded = btoa(unescape(encodeURIComponent(text)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?w=${encoded}`;
    navigator.clipboard.writeText(shareUrl);
    alert("הקישור הועתק! עכשיו תוכל להדביק אותו באתר שלך.");
    state.screen = 'welcome';
    render();
}

function renderWelcomeScreen(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center text-center space-y-8 mt-16 p-6 animate-fade-in">
            <div class="bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-blue-100 w-full max-w-md">
                <h3 class="text-xl font-bold text-blue-600 mb-2">${state.listName}</h3>
                <h2 class="text-3xl font-black text-slate-800 mb-8">מוכנים להתחיל?</h2>
                <button onclick="state.screen='flashcards'; render();" class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-lg">בואו נתחיל! 🚀</button>
            </div>
        </div>
    `;
}

function renderFlashcardsScreen(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="p-4 space-y-6 text-center">
            <h3 class="text-2xl font-black">${state.listName}</h3>
            <div onclick="learningState.isFlipped = !learningState.isFlipped; render();" class="relative w-full aspect-[4/3] max-w-sm mx-auto cursor-pointer perspective-1000">
                <div class="w-full h-full transition-all duration-500 preserve-3d ${learningState.isFlipped ? 'rotate-y-180' : ''}">
                    <div class="absolute inset-0 bg-white border-4 border-blue-100 rounded-[2.5rem] flex flex-col items-center justify-center shadow-xl backface-hidden">
                        <h2 class="text-5xl font-black text-blue-600">${word.eng}</h2>
                        <button onclick="event.stopPropagation(); speak('${word.eng}')" class="mt-6 text-3xl">🔊</button>
                    </div>
                    <div class="absolute inset-0 bg-blue-50 border-4 border-blue-200 rounded-[2.5rem] flex items-center justify-center shadow-xl backface-hidden rotate-y-180">
                        <h2 class="text-5xl font-black text-slate-800">${word.heb}</h2>
                    </div>
                </div>
            </div>
            <div class="flex gap-4 max-w-sm mx-auto">
                <button onclick="nextWord(false)" class="flex-1 bg-orange-600 text-white py-5 rounded-2xl font-black shadow-lg">⌛ עוד לא</button>
                <button onclick="nextWord(true)" class="flex-1 bg-green-600 text-white py-5 rounded-2xl font-black shadow-lg">✅ יודע</button>
            </div>
            ${learningState.knownWords.length === state.words.length ? `<button onclick="state.screen='quiz'; render();" class="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-2xl shadow-xl animate-bounce mt-4">אני מוכן למבחן! 🏆</button>` : ''}
        </div>
    `;
}

function nextWord(isKnown) {
    if (isKnown && !learningState.knownWords.includes(learningState.currentIndex)) learningState.knownWords.push(learningState.currentIndex);
    learningState.currentIndex = (learningState.currentIndex + 1) % state.words.length;
    learningState.isFlipped = false;
    render();
}

function renderQuizScreen(container) {
    const q = state.words[state.quizIndex];
    let choices = shuffle([q.heb, ...shuffle(state.words.filter(w => w.heb !== q.heb)).slice(0, 3).map(w => w.heb)]);
    container.innerHTML = `
        <div class="p-6 text-center space-y-8">
            <h2 class="text-6xl font-black text-blue-600">${q.eng}</h2>
            <div class="grid gap-4 max-w-sm mx-auto" id="quiz-options">
                ${choices.map(c => `<button onclick="checkQuiz('${c}', '${q.heb}', this)" class="bg-white p-5 rounded-2xl font-bold text-xl border-2 border-slate-100 shadow-sm transition-all">${c}</button>`).join('')}
            </div>
        </div>
    `;
}

function checkQuiz(sel, cor, btn) {
    const buttons = document.querySelectorAll('#quiz-options button');
    buttons.forEach(b => b.disabled = true);
    if (sel === cor) { 
        state.correctAnswers++; 
        btn.classList.add('bg-green-500', 'text-white', 'border-green-600'); 
        triggerConfetti(); 
    } else { 
        btn.classList.add('bg-red-500', 'text-white', 'border-red-600'); 
        buttons.forEach(b => { if(b.innerText === cor) b.classList.add('bg-green-500', 'text-white'); });
    }
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.masteryScore = Math.round((state.correctAnswers / state.words.length) * 100); state.screen = 'report'; render(); }
    }, 1500);
}

function renderReportScreen(container) {
    container.innerHTML = `
        <div class="p-6 text-center space-y-6">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-yellow-400">
                <h2 class="text-3xl font-black">כל הכבוד!</h2>
                <div class="text-7xl font-black text-yellow-400">${state.masteryScore}%</div>
            </div>
            <div class="bg-blue-50 p-6 rounded-3xl space-y-4">
                <input type="text" id="studentName" placeholder="שם התלמיד" class="w-full p-4 rounded-xl text-center font-bold">
                <button onclick="state.screen='menu'; render();" class="w-full bg-green-500 text-white py-4 rounded-xl font-black text-xl shadow-lg">פתח משחקים ✅</button>
            </div>
        </div>
    `;
}

function renderMenuScreen(container) {
    container.innerHTML = `
        <div class="p-6 space-y-4">
            <h2 class="text-2xl font-black text-center mb-6">בחר משחק 🎮</h2>
            <button onclick="initMemoryGame()" class="w-full p-6 bg-white rounded-3xl shadow-md border-b-4 border-blue-400 flex items-center gap-4">
                <span class="text-4xl">🧠</span> <div class="text-right font-bold text-lg">משחק הזיכרון</div>
            </button>
            <button onclick="initConnect4()" class="w-full p-6 bg-white rounded-3xl shadow-md border-b-4 border-red-400 flex items-center gap-4">
                <span class="text-4xl">🔴</span> <div class="text-right font-bold text-lg">4 בשורה</div>
            </button>
            <button onclick="initWordQuest()" class="w-full p-6 bg-white rounded-3xl shadow-md border-b-4 border-green-400 flex items-center gap-4">
                <span class="text-4xl">🕵️</span> <div class="text-right font-bold text-lg">הקוד הסודי</div>
            </button>
        </div>
    `;
}

// --- משחק הזיכרון ---
function initMemoryGame() {
    let cards = [];
    state.words.forEach((word, index) => {
        cards.push({ id: index, type: 'eng', content: word.eng, matched: false });
        cards.push({ id: index, type: 'heb', content: word.heb, matched: false });
    });
    state.memoryGame = { cards: shuffle(cards), flipped: [], pairs: 0, isProcessing: false };
    state.screen = 'memory';
    render();
}

function renderMemory(container) {
    const g = state.memoryGame;
    container.innerHTML = `
        <div class="p-4 space-y-4 text-center">
            <div class="flex justify-between items-center mb-4"><button onclick="state.screen='menu'; render();" class="text-blue-600 font-bold">⬅️ חזרה</button><div class="bg-blue-100 px-4 py-2 rounded-full font-bold">זוגות: ${g.pairs} / ${state.words.length}</div></div>
            <div class="grid grid-cols-3 gap-3">
                ${g.cards.map((card, index) => {
                    const isFlipped = g.flipped.includes(index) || card.matched;
                    return `<div onclick="handleMemoryClick(${index})" class="aspect-square rounded-2xl flex items-center justify-center p-2 text-center transition-all duration-300 transform shadow-sm cursor-pointer ${isFlipped ? 'bg-white border-2 border-blue-400' : 'bg-blue-600 shadow-lg'}"><span class="${isFlipped ? 'opacity-100' : 'opacity-0'} font-bold text-sm">${card.content}</span></div>`;
                }).join('')}
            </div>
        </div>
    `;
}

function handleMemoryClick(index) {
    const g = state.memoryGame;
    if (g.isProcessing || g.flipped.includes(index) || g.cards[index].matched) return;
    g.flipped.push(index); render();
    if (g.flipped.length === 2) {
        g.isProcessing = true;
        const [f, s] = g.flipped;
        if (g.cards[f].id === g.cards[s].id && g.cards[f].type !== g.cards[s].type) {
            setTimeout(() => { g.cards[f].matched = true; g.cards[s].matched = true; g.pairs++; g.flipped = []; g.isProcessing = false; if (g.pairs === state.words.length) triggerConfetti(); render(); }, 500);
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

// --- 4 בשורה המלא עם אנימציה ---
function initConnect4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), mode: null, turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 };
    state.screen = 'connect4'; render();
}

function renderConnect4(container) {
    const g = state.connect4;
    if (!g.mode) {
        container.innerHTML = `<div class="p-6 text-center"><div class="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-blue-200"><h2 class="text-3xl font-black mb-8">4 בשורה</h2><button onclick="state.connect4.mode='pvp'; render();" class="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mb-4">משחק זוגי</button><button onclick="state.connect4.mode='pve'; render();" class="w-full bg-orange-600 text-white py-4 rounded-xl font-bold">נגד המחשב</button></div></div>`;
        return;
    }
    container.innerHTML = `
        <div class="p-4 flex flex-col items-center text-center">
            <div class="w-full flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-2xl text-white">
                <span>תור: ${g.turn === 1 ? '🔴' : '🟡'}</span>
                <button onclick="state.connect4.isAnswering = true; prepC4Question(); render();" ${g.canDrop || g.animatingRow !== -1 ? 'disabled' : ''} class="bg-blue-600 px-4 py-2 rounded-xl font-bold disabled:opacity-30">שאלה לאסימון</button>
            </div>
            <div class="bg-blue-600 p-3 rounded-3xl grid grid-cols-7 gap-2 w-full max-w-[350px]">
                ${[1,2,3,4,5,6,7].map(n => `<div class="text-white font-bold">${n}</div>`).join('')}
                ${g.board.map((row, r) => row.map((cell, c) => {
                    const isAnim = g.animatingRow === r && g.animatingCol === c;
                    const color = (isAnim ? g.turn : cell) === 1 ? 'bg-red-500' : (isAnim ? g.turn : cell) === 2 ? 'bg-yellow-400' : 'bg-blue-800';
                    return `<div onclick="handleC4Drop(${c})" class="aspect-square ${color} rounded-full border-2 border-blue-900"></div>`;
                }).join('')).join('')}
            </div>
        </div>`;
    if (g.isAnswering) renderC4Modal(container);
}

function prepC4Question() {
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    state.connect4.q = { ...q, choices: shuffle([q.heb, ...shuffle(state.words.filter(w => w.heb !== q.heb)).slice(0, 3).map(w => w.heb)]) };
}

function renderC4Modal(container) {
    const g = state.connect4;
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-[100]";
    modal.innerHTML = `<div class="bg-white p-8 rounded-[2rem] w-full max-w-sm text-center">
        <h3 class="text-4xl font-black text-blue-600 mb-6">${g.q.eng}</h3>
        <div class="grid gap-3" id="c4-opts">
            ${g.q.choices.map(c => `<button onclick="checkC4Ans('${c}', this)" class="w-full py-4 rounded-xl border-2 font-bold text-xl">${c}</button>`).join('')}
        </div>
    </div>`;
    container.appendChild(modal);
}

function checkC4Ans(sel, btn) {
    const cor = state.connect4.q.heb;
    if (sel === cor) {
        btn.classList.add('bg-green-500', 'text-white');
        setTimeout(() => { state.connect4.isAnswering = false; state.connect4.canDrop = true; render(); }, 1000);
    } else {
        btn.classList.add('bg-red-500', 'text-white');
        setTimeout(() => { state.connect4.turn = state.connect4.turn === 1 ? 2 : 1; state.connect4.isAnswering = false; render(); }, 1500);
    }
}

async function handleC4Drop(col) {
    const g = state.connect4;
    if (!g.canDrop) return;
    let targetRow = -1;
    for (let r = 5; r >= 0; r--) { if (!g.board[r][col]) { targetRow = r; break; } }
    if (targetRow === -1) return;
    g.canDrop = false;
    for (let r = 0; r <= targetRow; r++) { g.animatingRow = r; g.animatingCol = col; render(); await new Promise(res => setTimeout(res, 200)); }
    g.board[targetRow][col] = g.turn; g.animatingRow = -1;
    if (checkC4Win(targetRow, col, g.turn)) { triggerConfetti(); alert("ניצחון!"); initConnect4(); }
    else { g.turn = g.turn === 1 ? 2 : 1; render(); }
}

function checkC4Win(r, c, p) {
    const directions = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of directions) {
        let count = 1;
        for (let s of [1, -1]) {
            let nr = r + dr*s, nc = c + dc*s;
            while (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && state.connect4.board[nr][nc] === p) { count++; nr += dr*s; nc += dc*s; }
        }
        if (count >= 4) return true;
    }
    return false;
}

// --- הקוד הסודי ---
function initWordQuest() {
    const word = state.words[Math.floor(Math.random() * state.words.length)];
    state.wordQuest = { target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', maxAttempts: 6, isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(container) {
    const q = state.wordQuest;
    container.innerHTML = `<div class="p-4 text-center">
        <div class="flex justify-between mb-4"><button onclick="state.screen='menu'; render();">⬅️</button><span>רמז: ${q.heb}</span></div>
        <div class="grid gap-2 max-w-[300px] mx-auto">
            ${Array(6).fill(null).map((_, i) => {
                const guess = q.guesses[i] || (i === q.guesses.length ? q.currentGuess : '');
                return `<div class="grid grid-cols-${q.target.length} gap-2">${Array(q.target.length).fill(null).map((_, j) => {
                    const char = guess[j] || '';
                    let color = 'bg-white';
                    if (q.guesses[i]) {
                        if (q.target[j] === char) color = 'bg-green-500 text-white';
                        else if (q.target.includes(char)) color = 'bg-yellow-400 text-white';
                        else color = 'bg-slate-400 text-white';
                    }
                    return `<div class="aspect-square border-2 rounded flex items-center justify-center font-bold text-xl ${color}">${char}</div>`;
                }).join('')}</div>`;
            }).join('')}
        </div>
        ${!q.isGameOver ? `<div class="mt-4 flex flex-wrap justify-center gap-1">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(l => `<button onclick="handleWQKey('${l}')" class="p-2 border rounded bg-white font-bold">${l}</button>`).join('')}<button onclick="handleWQKey('Enter')" class="p-2 bg-blue-600 text-white rounded">OK</button></div>` : `<div class="mt-4 p-4 bg-white rounded-xl shadow-lg"><h3 class="font-bold">המילה הייתה: ${q.target}</h3><button onclick="initWordQuest()" class="mt-2 bg-blue-600 text-white p-2 rounded">שחק שוב</button></div>`}
    </div>`;
}

function handleWQKey(key) {
    const q = state.wordQuest;
    if (q.isGameOver) return;
    if (key === 'Enter' && q.currentGuess.length === q.target.length) {
        q.guesses.push(q.currentGuess);
        if (q.currentGuess === q.target) { q.isGameOver = true; triggerConfetti(); }
        else if (q.guesses.length >= 6) q.isGameOver = true;
        q.currentGuess = '';
    } else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(key)) q.currentGuess += key;
    render();
}

function decodeBase64(str) { try { return decodeURIComponent(escape(atob(str))); } catch (e) { return ''; } }
function parseWordsFromURL() {
    const params = new URLSearchParams(window.location.search);
    const wParam = params.get('w');
    if (wParam) {
        const decoded = decodeBase64(wParam);
        if (decoded) {
            const lines = decoded.split('\n');
            state.listName = lines[0] || 'אוצר המילים שלי';
            state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
                const [eng, heb] = l.split('-').map(s => s.trim());
                return { eng, heb };
            });
        }
    }
}
window.addEventListener('load', () => { parseWordsFromURL(); render(); });

