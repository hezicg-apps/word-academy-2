let state = {
    screen: 'welcome', 
    words: [],
    listName: 'אוצר המילים שלי',
    steps: 0,
    quizIndex: 0,
    correctAnswers: 0,
    masteryScore: 0,
    nightMode: false,
    memoryGame: { cards: [], flipped: [], pairs: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), mode: null, turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', maxAttempts: 6, isGameOver: false }
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

// פונקציית העתקה עם חיווי ויזואלי ל-3 שניות
function copyToClipboard(btn, url) {
    navigator.clipboard.writeText(url);
    const textSpan = btn.querySelector('span');
    const originalText = textSpan.innerText;
    textSpan.innerText = "הועתק! ✨";
    btn.classList.add('bg-green-100');
    setTimeout(() => {
        textSpan.innerText = originalText;
        btn.classList.remove('bg-green-100');
    }, 3000);
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = ''; 
    const isDark = state.nightMode;

    // Header מעודכן - לוגו גדול משמאל, כפתור לילה מימין
    const header = document.createElement('header');
    header.className = `flex flex-row-reverse justify-between items-center p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-b sticky top-0 z-50`;
    header.innerHTML = `
        <div class="flex items-center gap-3" style="direction: ltr;">
            <img src="logo.svg" alt="WA" class="h-14 w-14 object-contain">
            <div class="flex flex-col items-start">
                <span class="text-blue-600 font-black text-3xl leading-none">Word Academy</span>
                <span class="text-xs font-bold text-slate-400">Education & Fun</span>
            </div>
        </div>
        <button onclick="toggleNightMode()" class="p-3 rounded-2xl text-2xl border ${isDark ? 'bg-slate-800 text-yellow-400 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-100'}">
            ${isDark ? '☀️' : '🌙'}
        </button>
    `;
    app.appendChild(header);

    const content = document.createElement('div');
    content.className = "w-full max-w-4xl mx-auto p-4 min-h-[80vh] flex flex-col";
    app.appendChild(content);

    if (state.words.length === 0 && !window.location.search.includes('w=')) {
        renderInputScreen(content);
    } else {
        const screens = {
            input: renderInputScreen, welcome: renderWelcomeScreen, flashcards: renderFlashcardsScreen,
            quiz: renderQuizScreen, report: renderReportScreen, menu: renderMenuScreen,
            memory: renderMemory, connect4: renderConnect4, wordquest: renderWordQuest
        };
        if (screens[state.screen]) screens[state.screen](content);
    }
}

function openShareModal(isResult = false) {
    const shareUrl = window.location.href;
    const text = isResult ? `קיבלתי ${state.masteryScore}% באתגר המילים! בואו לנסות:` : `בואו ללמוד איתי אנגלית ב-Word Academy:`;
    
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-sm";
    modal.innerHTML = `
        <div class="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl animate-pop-in">
            <div class="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 class="text-2xl font-black text-blue-600">שיתוף רשימה</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-400 text-3xl">✕</button>
            </div>
            <div class="p-6 space-y-4">
                <a href="https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}" target="_blank" class="flex items-center gap-4 p-4 border-2 border-green-100 rounded-2xl hover:bg-green-50 transition-all">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" class="w-10 h-10">
                    <span class="font-bold text-lg">WhatsApp</span>
                </a>
                <a href="mailto:?subject=בואו ללמוד אנגלית&body=${encodeURIComponent(text + ' ' + shareUrl)}" class="flex items-center gap-4 p-4 border-2 border-red-100 rounded-2xl hover:bg-red-50">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" class="w-10 h-10">
                    <span class="font-bold text-lg">Gmail / Email</span>
                </a>
                <button onclick="copyToClipboard(this, '${shareUrl}')" class="w-full flex items-center gap-4 p-4 border-2 border-blue-100 rounded-2xl hover:bg-blue-50 transition-all">
                    <img src="https://www.svgrepo.com/show/474773/copy.svg" class="w-10 h-10">
                    <span class="font-bold text-lg"><span>העתק קישור</span></span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function renderInputScreen(container) {
    container.innerHTML = `
        <div class="p-6 space-y-6 text-center animate-fade-in">
            <h2 class="text-4xl font-black text-blue-600 mb-8">יצירת רשימה חדשה</h2>
            <textarea id="wordInput" class="w-full h-64 p-6 border-4 border-blue-50 rounded-[2rem] outline-none font-bold text-right text-xl shadow-inner" 
                placeholder="שם הרשימה\ndog - כלב\ncat - חתול"></textarea>
            <button onclick="saveNewList()" class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-xl hover:scale-105 transition-transform">המשך לכרטיסיות ✨</button>
        </div>
    `;
}

function saveNewList() {
    const text = document.getElementById('wordInput').value.trim();
    if (!text.includes('-')) return alert("נא להזין מילים במבנה: אנגלית - עברית");
    const lines = text.split('\n');
    state.listName = lines[0];
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { eng, heb };
    });
    state.screen = 'flashcards';
    render();
}

function renderFlashcardsScreen(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="p-4 space-y-8 text-center animate-fade-in">
            <h1 class="text-5xl font-black text-blue-600">${state.listName}</h1>
            <div onclick="learningState.isFlipped = !learningState.isFlipped; render();" class="relative w-full aspect-[4/3] max-w-md mx-auto cursor-pointer perspective-1000">
                <div class="w-full h-full transition-all duration-500 preserve-3d ${learningState.isFlipped ? 'rotate-y-180' : ''}">
                    <div class="absolute inset-0 bg-white border-8 border-blue-50 rounded-[3rem] flex flex-col items-center justify-center shadow-2xl backface-hidden">
                        <span class="text-6xl font-black text-blue-600">${word.eng}</span>
                        <button onclick="event.stopPropagation(); speak('${word.eng}')" class="mt-8 text-4xl p-4 bg-blue-50 rounded-full">🔊</button>
                    </div>
                    <div class="absolute inset-0 bg-blue-600 rounded-[3rem] flex items-center justify-center shadow-2xl backface-hidden rotate-y-180">
                        <span class="text-6xl font-black text-white">${word.heb}</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-4 max-w-md mx-auto">
                <button onclick="nextWord(false)" class="flex-1 bg-slate-200 py-6 rounded-3xl font-black text-xl">⌛ עוד לא</button>
                <button onclick="nextWord(true)" class="flex-1 bg-green-500 text-white py-6 rounded-3xl font-black text-xl shadow-lg">✅ יודע</button>
            </div>
        </div>
    `;
}

function nextWord(isKnown) {
    if (isKnown && !learningState.knownWords.includes(learningState.currentIndex)) learningState.knownWords.push(learningState.currentIndex);
    if (learningState.knownWords.length === state.words.length) {
        state.screen = 'quiz'; // מעבר אוטומטי לאתגר המילים
    } else {
        learningState.currentIndex = (learningState.currentIndex + 1) % state.words.length;
    }
    learningState.isFlipped = false;
    render();
}

function renderQuizScreen(container) {
    const q = state.words[state.quizIndex];
    let choices = shuffle([q.heb, ...shuffle(state.words.filter(w => w.heb !== q.heb)).slice(0, 3).map(w => w.heb)]);
    container.innerHTML = `
        <div class="p-6 text-center space-y-10 animate-fade-in">
            <h1 class="text-5xl font-black text-slate-800">אתגר המילים</h1>
            <div class="flex flex-col items-center gap-6">
                <span class="text-7xl font-black text-blue-600">${q.eng}</span>
                <button onclick="speak('${q.eng}')" class="text-4xl p-4 bg-blue-50 rounded-full">🔊</button>
            </div>
            <div class="grid gap-4 max-w-md mx-auto" id="quiz-options">
                ${choices.map(c => `<button onclick="checkQuiz('${c}', '${q.heb}', this)" class="bg-white p-6 rounded-3xl font-black text-2xl border-4 border-slate-50 shadow-md transition-all">${c}</button>`).join('')}
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
        <div class="p-6 text-center space-y-8 animate-fade-in">
            <div class="bg-white p-10 rounded-[3.5rem] shadow-2xl border-b-[12px] border-yellow-400">
                <h2 class="text-4xl font-black mb-4">כל הכבוד! סיימת</h2>
                <div class="text-9xl font-black text-yellow-400 my-8">${state.masteryScore}%</div>
                <div class="flex flex-wrap justify-center gap-4">
                    <button onclick="state.quizIndex=0; state.correctAnswers=0; state.screen='quiz'; render();" class="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black text-xl shadow-lg">🔄 תרגול חוזר</button>
                    <button onclick="openShareModal(true)" class="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xl shadow-lg">🔗 שיתוף תוצאה</button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <button onclick="location.reload()" class="bg-slate-800 text-white py-5 rounded-3xl font-black text-xl">🏠 בית</button>
                <button onclick="state.screen='input'; render();" class="bg-slate-500 text-white py-5 rounded-3xl font-black text-xl">➕ רשימה חדשה</button>
            </div>
            <button onclick="state.screen='menu'; render();" class="w-full bg-green-500 text-white py-8 rounded-[2.5rem] font-black text-3xl shadow-xl animate-bounce">בואו נשחק! 🎮</button>
        </div>
    `;
}

function renderMenuScreen(container) {
    container.innerHTML = `
        <div class="p-6 space-y-6 animate-fade-in">
            <h1 class="text-5xl font-black text-center text-blue-600 mb-10 italic">Word Games</h1>
            <div class="grid gap-6 max-w-md mx-auto">
                <button onclick="initMemoryGame()" class="group bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-blue-400 flex items-center gap-6 hover:scale-105 transition-all">
                    <span class="text-6xl group-hover:rotate-12 transition-transform">🧠</span>
                    <div class="text-right"><div class="font-black text-2xl">משחק הזיכרון</div><div class="text-slate-400">מצאו את הזוגות</div></div>
                </button>
                <button onclick="initConnect4()" class="group bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-red-400 flex items-center gap-6 hover:scale-105 transition-all">
                    <span class="text-6xl group-hover:rotate-12 transition-transform">🔴</span>
                    <div class="text-right"><div class="font-black text-2xl">4 בשורה</div><div class="text-slate-400">נצחו את המחשב</div></div>
                </button>
            </div>
            <div class="flex justify-center gap-6 mt-12">
                <button onclick="location.reload()" class="text-slate-400 font-bold underline">חזרה לבית</button>
                <button onclick="state.screen='input'; render();" class="text-slate-400 font-bold underline">רשימה חדשה</button>
            </div>
        </div>
    `;
}

// --- משחק הזיכרון המשופר ---
function initMemoryGame() {
    let cards = [];
    state.words.forEach((w, i) => {
        cards.push({ id: i, type: 'eng', content: w.eng, matched: false });
        cards.push({ id: i, type: 'heb', content: w.heb, matched: false });
    });
    state.memoryGame = { cards: shuffle(cards), flipped: [], pairs: 0, isProcessing: false };
    state.steps = 0; state.screen = 'memory'; render();
}

function renderMemory(container) {
    const g = state.memoryGame;
    container.innerHTML = `
        <div class="p-4 space-y-6 text-center h-full">
            <div class="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm mb-4">
                <button onclick="state.screen='menu'; render();" class="text-blue-600 font-black text-xl">⬅️ חזרה</button>
                <div class="text-2xl font-black text-slate-700">זוגות: ${g.pairs} / ${state.words.length}</div>
            </div>
            <div class="grid grid-cols-3 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                ${g.cards.map((card, i) => {
                    const flipped = g.flipped.includes(i) || card.matched;
                    return `
                        <div onclick="handleMemoryClick(${i})" class="aspect-square perspective-1000 cursor-pointer h-32 md:h-40">
                            <div class="relative w-full h-full transition-all duration-500 preserve-3d ${flipped ? 'rotate-y-180' : ''}">
                                <div class="absolute inset-0 bg-blue-600 rounded-[2rem] shadow-xl flex items-center justify-center backface-hidden border-b-8 border-blue-800">
                                    <span class="text-5xl text-white">❓</span>
                                </div>
                                <div class="absolute inset-0 bg-white border-4 border-blue-400 rounded-[2rem] flex items-center justify-center p-2 backface-hidden rotate-y-180 shadow-2xl">
                                    <span class="font-black text-blue-600 leading-tight text-center" style="font-size: clamp(18px, 5vw, 32px);">
                                        ${card.content}
                                    </span>
                                </div>
                            </div>
                        </div>`;
                }).join('')}
            </div>
        </div>
    `;
}

function handleMemoryClick(i) {
    const g = state.memoryGame;
    if (g.isProcessing || g.flipped.includes(i) || g.cards[i].matched) return;
    g.flipped.push(i); render();
    if (g.flipped.length === 2) {
        g.isProcessing = true;
        const [f, s] = g.flipped;
        if (g.cards[f].id === g.cards[s].id && g.cards[f].type !== g.cards[s].type) {
            const eng = g.cards[f].type === 'eng' ? g.cards[f].content : g.cards[s].content;
            setTimeout(() => { 
                speak(eng);
                g.cards[f].matched = true; g.cards[s].matched = true;
                g.pairs++; g.flipped = []; g.isProcessing = false;
                if (g.pairs === state.words.length) { triggerConfetti(); setTimeout(() => state.screen='menu', 2000); }
                render();
            }, 600);
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

// --- 4 בשורה ענק למחשב ---
function initConnect4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), mode: null, turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 };
    state.steps = 0; state.screen = 'connect4'; render();
}

function renderConnect4(container) {
    const g = state.connect4;
    if (!g.mode) {
        container.innerHTML = `<div class="p-10 text-center"><div class="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-blue-100 max-w-md mx-auto"><h2 class="text-5xl font-black text-blue-600 mb-10">4 בשורה</h2><button onclick="state.connect4.mode='pvp'; render();" class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-lg mb-6">משחק זוגי</button><button onclick="state.connect4.mode='pve'; render();" class="w-full bg-orange-600 text-white py-6 rounded-3xl font-black text-2xl shadow-lg">נגד המחשב</button></div></div>`;
        return;
    }
    container.innerHTML = `
        <div class="p-4 flex flex-col items-center animate-fade-in">
            <div class="w-full max-w-3xl flex justify-between items-center bg-slate-800 p-6 rounded-[2rem] text-white shadow-xl mb-8">
                <div class="flex items-center gap-4 text-2xl font-black">
                    <div class="w-8 h-8 rounded-full ${g.turn === 1 ? 'bg-red-500 shadow-[0_0_15px_red]' : 'bg-yellow-400 shadow-[0_0_15px_yellow]'}"></div>
                    תור: ${g.turn === 1 ? 'אדום' : 'צהוב'}
                </div>
                <div class="text-xl font-bold">צעדים: ${state.steps}</div>
                <button onclick="state.connect4.isAnswering=true; prepC4Q(); render();" ${g.canDrop || g.animatingRow!==-1 ? 'disabled' : ''} class="bg-blue-600 px-8 py-3 rounded-2xl font-black text-xl hover:scale-105 disabled:opacity-30 transition-all">שאלה לאסימון ❓</button>
            </div>
            <div class="bg-blue-700 p-6 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] grid grid-cols-7 gap-4 w-full max-w-3xl border-b-[16px] border-blue-900">
                ${[1,2,3,4,5,6,7].map(n => `<div class="text-blue-200 font-black text-2xl mb-2 text-center">${n}</div>`).join('')}
                ${g.board.map((row, r) => row.map((cell, c) => {
                    const isAnim = g.animatingRow === r && g.animatingCol === c;
                    const val = isAnim ? g.turn : cell;
                    return `<div onclick="handleC4Drop(${c})" class="aspect-square bg-blue-900 rounded-full flex items-center justify-center shadow-inner border-4 border-blue-800 cursor-pointer">
                        ${val === 1 ? '<div class="w-4/5 h-4/5 bg-red-500 rounded-full shadow-2xl border-4 border-red-400 animate-pop"></div>' : 
                          val === 2 ? '<div class="w-4/5 h-4/5 bg-yellow-400 rounded-full shadow-2xl border-4 border-yellow-300 animate-pop"></div>' : ''}
                    </div>`;
                }).join('')).join('')}
            </div>
        </div>`;
    if (g.isAnswering) renderC4Modal(container);
}

function prepC4Q() {
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    state.connect4.q = { ...q, choices: shuffle([q.heb, ...shuffle(state.words.filter(w => w.heb !== q.heb)).slice(0, 3).map(w => w.heb)]) };
}

function renderC4Modal(container) {
    const g = state.connect4;
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-6";
    modal.innerHTML = `<div class="bg-white p-10 rounded-[3.5rem] w-full max-w-md text-center shadow-2xl border-t-8 border-blue-600">
        <h3 class="text-6xl font-black text-blue-600 mb-10">${g.q.eng}</h3>
        <div class="grid gap-4" id="c4-opts">
            ${g.q.choices.map(c => `<button onclick="checkC4Ans('${c}', this)" class="w-full py-6 rounded-3xl border-4 border-slate-50 font-black text-2xl hover:bg-blue-50 transition-all shadow-sm">${c}</button>`).join('')}
        </div>
    </div>`;
    container.appendChild(modal);
}

function checkC4Ans(sel, btn) {
    const cor = state.connect4.q.heb;
    const btns = document.querySelectorAll('#c4-opts button');
    btns.forEach(b => b.disabled = true);
    if (sel === cor) {
        btn.classList.add('bg-green-500', 'text-white', 'border-green-600');
        setTimeout(() => { state.connect4.isAnswering = false; state.connect4.canDrop = true; render(); }, 1000);
    } else {
        btn.classList.add('bg-red-500', 'text-white', 'border-red-600');
        btns.forEach(b => { if(b.innerText === cor) b.classList.add('bg-green-500', 'text-white'); });
        setTimeout(() => { state.connect4.turn = state.connect4.turn === 1 ? 2 : 1; state.connect4.isAnswering = false; render(); }, 2000);
    }
}

async function handleC4Drop(col) {
    const g = state.connect4;
    if (!g.canDrop || g.animatingRow !== -1) return;
    let targetRow = -1;
    for (let r = 5; r >= 0; r--) { if (!g.board[r][col]) { targetRow = r; break; } }
    if (targetRow === -1) return;
    g.canDrop = false; state.steps++;
    for (let r = 0; r <= targetRow; r++) { g.animatingRow = r; g.animatingCol = col; render(); await new Promise(res => setTimeout(res, 200)); }
    g.board[targetRow][col] = g.turn; g.animatingRow = -1;
    if (checkC4Win(targetRow, col, g.turn)) { 
        triggerConfetti(); 
        setTimeout(() => { alert(`ניצחון ב-${state.steps} צעדים!`); initConnect4(); }, 500); 
    } else { g.turn = g.turn === 1 ? 2 : 1; render(); }
}

function checkC4Win(r, c, p) {
    const b = state.connect4.board;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        for (let s of [1, -1]) {
            let nr = r + dr*s, nc = c + dc*s;
            while (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && b[nr][nc] === p) { count++; nr += dr*s; nc += dc*s; }
        }
        if (count >= 4) return true;
    }
    return false;
}

// --- הקוד הסודי (Word Quest) ---
function initWordQuest() {
    const word = state.words[Math.floor(Math.random() * state.words.length)];
    state.wordQuest = { target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', maxAttempts: 6, isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(container) {
    const q = state.wordQuest;
    container.innerHTML = `<div class="p-6 text-center animate-fade-in"><h1 class="text-4xl font-black mb-8 text-blue-600">הקוד הסודי</h1><div class="mb-4 text-xl font-bold text-slate-400 italic">רמז: ${q.heb}</div><div class="grid gap-2 max-w-[320px] mx-auto">${Array(6).fill(null).map((_, i) => { const guess = q.guesses[i] || (i === q.guesses.length ? q.currentGuess : ''); return `<div class="grid grid-cols-${q.target.length} gap-2">${Array(q.target.length).fill(null).map((_, j) => { const char = guess[j] || ''; let color = 'bg-white border-slate-200'; if (q.guesses[i]) { if (q.target[j] === char) color = 'bg-green-500 text-white border-green-600'; else if (q.target.includes(char)) color = 'bg-yellow-400 text-white border-yellow-500'; else color = 'bg-slate-400 text-white border-slate-500'; } return `<div class="aspect-square border-4 rounded-xl flex items-center justify-center font-black text-2xl ${color}">${char}</div>`; }).join('')}</div>`; }).join('')}</div>${!q.isGameOver ? `<div class="mt-8 flex flex-wrap justify-center gap-2">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(l => `<button onclick="handleWQKey('${l}')" class="p-3 bg-white border-2 border-slate-100 rounded-xl font-black shadow-sm">${l}</button>`).join('')}<button onclick="handleWQKey('Backspace')" class="p-3 bg-slate-100 rounded-xl font-black">⌫</button><button onclick="handleWQKey('Enter')" class="p-3 bg-blue-600 text-white rounded-xl font-black">OK</button></div>` : `<div class="mt-8 bg-white p-6 rounded-[2rem] shadow-xl"><h3 class="text-2xl font-black mb-4">המילה הייתה: ${q.target}</h3><button onclick="initWordQuest()" class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold">שחק שוב</button><button onclick="state.screen='menu'; render();" class="mt-4 block mx-auto text-slate-400 underline">חזרה למשחקים</button></div>`}</div>`;
}

function handleWQKey(key) {
    const q = state.wordQuest; if (q.isGameOver) return;
    if (key === 'Enter' && q.currentGuess.length === q.target.length) {
        q.guesses.push(q.currentGuess);
        if (q.currentGuess === q.target) { q.isGameOver = true; triggerConfetti(); }
        else if (q.guesses.length >= 6) q.isGameOver = true;
        q.currentGuess = '';
    } else if (key === 'Backspace') q.currentGuess = q.currentGuess.slice(0, -1);
    else if (q.currentGuess.length < q.target.length && /^[a-zA-Z]$/.test(key)) q.currentGuess += key.toUpperCase();
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
window.addEventListener('keydown', (e) => { if (state.screen === 'wordquest') handleWQKey(e.key); });
