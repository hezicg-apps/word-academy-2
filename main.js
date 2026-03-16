// --- הגדרות מערכת ---
let state = {
    screen: 'input', 
    words: [],
    listName: 'אוצר המילים שלי',
    quizIndex: 0,
    correctAnswers: 0,
    lastScore: 0,
    isLoggedIn: false, 
    nightMode: false,
    gameMode: 'pve', 
    memoryGame: { cards: [], flipped: [], pairs: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, showIntro: true }
};

let learningState = { currentIndex: 0, isFlipped: false, knownWords: [] };

const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; background: #f8fafc; color: #1e293b; }
    
    /* אנימציית סיבוב כרטיסיות */
    .card-container { perspective: 1000px; width: 100%; max-width: 400px; height: 250px; cursor: pointer; margin: 0 auto; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
    .card-inner.is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; border-radius: 2rem; border: 4px solid #f1f5f9; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
    .card-front { background: white; }
    .card-back { background: #2563eb; color: white; transform: rotateY(180deg); }

    /* עיצוב 4 בשורה */
    .c4-board { background: #1e40af; border: 12px solid #1e3a8a; border-radius: 2.5rem; padding: 15px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); }
    .arrow-indicator { font-size: 1.2rem; color: #1e3a8a; transition: all 0.3s; opacity: 0.5; }
    .arrow-active { color: #60a5fa; text-shadow: 0 0 10px #60a5fa; opacity: 1; transform: translateY(2px); }
    
    .btn-game { background: white; border-bottom: 6px solid #e2e8f0; transition: all 0.1s; cursor: pointer; border-radius: 2rem; }
    .btn-game:active { transform: translateY(4px); border-bottom-width: 0; }
    .locked { opacity: 0.5; filter: grayscale(1); cursor: not-allowed !important; }

    /* שיתוף */
    .share-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .share-card { background: white; padding: 2rem; border-radius: 2.5rem; width: 90%; max-width: 320px; text-align: center; }
    
    .ltr-dir { direction: ltr !important; }
    .score-circle { width: 180px; height: 180px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; background: white; box-shadow: inset 0 0 20px rgba(0,0,0,0.05); border: 8px solid #f1f5f9; }
`;
document.head.appendChild(style);

function speak(text) { 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; 
    window.speechSynthesis.speak(u); 
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const content = document.createElement('div');
    content.className = "w-full max-w-4xl mx-auto p-4 flex-1 flex flex-col min-h-screen";
    app.appendChild(content);

    const screens = {
        input: renderInputScreen, flashcards: renderFlashcardsScreen,
        quiz: renderQuizScreen, report: renderReportScreen, menu: renderMenuScreen,
        memory: renderMemory, connect4: renderConnect4, wordquest: renderWordQuest
    };
    (screens[state.screen] || renderInputScreen)(content);
}

// --- מסכי למידה ---
function renderInputScreen(container) {
    container.innerHTML = `
        <div class="space-y-6 text-center py-10">
            <h2 class="text-3xl font-black">הזנת מילים ל-Word Academy</h2>
            <textarea id="wordInput" class="w-full h-64 p-6 border-4 rounded-[2rem] text-right font-bold bg-blue-50 border-blue-100" placeholder="שם היחידה\nמילה באנגלית - תרגום"></textarea>
            <button onclick="saveNewList()" class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-xl">בואו נלמד! 🚀</button>
        </div>
    `;
}

function saveNewList() {
    const text = document.getElementById('wordInput').value.trim();
    if (!text.includes('-')) return;
    const lines = text.split('\n');
    state.listName = lines[0];
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { eng, heb };
    });
    state.screen = 'flashcards'; render();
}

function renderFlashcardsScreen(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-8 text-center">
            <p class="text-lg font-bold text-blue-500">לחצו על הכרטיסייה לסיבוב 🔄</p>
            <div class="card-container" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
                <div class="card-inner">
                    <div class="card-face card-front">
                        <div class="flex items-center gap-4">
                            <span class="text-5xl font-black">${word.eng}</span>
                            <button onclick="event.stopPropagation(); speak('${word.eng}')" class="text-4xl">🔊</button>
                        </div>
                    </div>
                    <div class="card-face card-back">
                        <span class="text-5xl font-black">${word.heb}</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-4 w-full max-w-sm">
                <button onclick="nextWord(false)" class="flex-1 bg-red-500 text-white py-5 rounded-2xl font-black text-xl shadow-lg">עוד לא</button>
                <button onclick="nextWord(true)" class="flex-1 bg-green-500 text-white py-5 rounded-2xl font-black text-xl shadow-lg">יודע! ✅</button>
            </div>
        </div>
    `;
}

function nextWord(isKnown) {
    if (isKnown && !learningState.knownWords.includes(learningState.currentIndex)) learningState.knownWords.push(learningState.currentIndex);
    if (learningState.knownWords.length === state.words.length) {
        state.quizIndex = 0; state.correctAnswers = 0; state.screen = 'quiz';
    } else {
        learningState.currentIndex = (learningState.currentIndex + 1) % state.words.length;
    }
    render();
}

// --- אתגר ודוח ---
function renderQuizScreen(container) {
    const q = state.words[state.quizIndex];
    let choices = [q.heb, ...state.words.filter(w => w.heb !== q.heb).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.heb)].sort();
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-8 text-center">
            <span class="text-6xl font-black text-blue-600">${q.eng}</span>
            <div class="grid gap-4 w-full max-w-lg">
                ${choices.map(c => `<button onclick="checkQuiz('${c}', '${q.heb}', this)" class="bg-white p-5 rounded-2xl font-black text-xl border-2 shadow-sm">${c}</button>`).join('')}
            </div>
        </div>
    `;
}

function checkQuiz(sel, cor, btn) {
    if (sel === cor) { state.correctAnswers++; btn.classList.add('bg-green-500', 'text-white', 'border-green-600'); }
    else btn.classList.add('bg-red-500', 'text-white', 'border-red-600');
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.screen = 'report'; state.lastScore = Math.round((state.correctAnswers / state.words.length) * 100); render(); }
    }, 600);
}

function renderReportScreen(container) {
    const score = state.lastScore;
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md">
                <h2 class="text-2xl font-black mb-4">הציון שלך:</h2>
                <div class="score-circle"><span class="text-7xl font-black text-blue-600">${score}%</span></div>
                <div class="grid gap-3 mt-8">
                    <button onclick="openShareUI('result')" class="bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">🏆 הצלחתי! שתפו</button>
                    <button onclick="openShareUI('list')" class="bg-blue-100 text-blue-700 py-4 rounded-xl font-bold">🔗 שיתוף הרשימה</button>
                    <button onclick="state.screen='flashcards'; learningState.knownWords=[]; render();" class="bg-slate-100 py-4 rounded-xl font-bold">🔄 תרגול חוזר</button>
                </div>
            </div>
            <button onclick="state.screen='menu'; render();" class="w-full max-w-md bg-blue-600 text-white py-6 rounded-full font-black text-2xl shadow-xl">לתפריט המשחקים 🎮</button>
        </div>
    `;
}

// --- תפריט משחקים ---
function renderMenuScreen(container) {
    const isLocked = state.lastScore < 70;
    container.innerHTML = `
        <div class="p-4 space-y-6 text-center w-full">
            <div class="flex justify-between items-center mb-10">
                <button onclick="state.screen='input'; render();" class="text-xl font-bold text-slate-500">➕ רשימה חדשה</button>
                <button onclick="window.location.href='#'" class="text-xl font-bold text-blue-600">🏠 בית</button>
            </div>
            <h1 class="text-5xl font-black italic mb-4">GAME ZONE</h1>
            ${isLocked ? `<p class="text-red-500 font-bold mb-4">המשחקים נעולים! השג 70% ומעלה באתגר המילים כדי לפתוח אותם.</p>` : ''}
            <div class="grid gap-5 max-w-md mx-auto">
                <button onclick="${isLocked ? '' : 'initMemoryGame()'}" class="btn-game p-6 shadow-lg flex items-center gap-6 ${isLocked ? 'locked' : ''}">
                    <span class="text-5xl">🧠</span><span class="font-bold text-2xl">משחק הזיכרון</span>
                </button>
                <button onclick="${isLocked ? '' : 'state.gameMode=\'pve\'; initConnect4()'}" class="btn-game p-6 shadow-lg flex items-center gap-6 ${isLocked ? 'locked' : ''}">
                    <span class="text-5xl">🤖</span><span class="font-bold text-2xl">4 בשורה - נגד מחשב</span>
                </button>
                <button onclick="${isLocked ? '' : 'state.gameMode=\'pvp\'; initConnect4()'}" class="btn-game p-6 shadow-lg flex items-center gap-6 ${isLocked ? 'locked' : ''}">
                    <span class="text-5xl">👥</span><span class="font-bold text-2xl">4 בשורה - 2 שחקנים</span>
                </button>
                <button onclick="${isLocked ? '' : 'initWordQuest()'}" class="btn-game p-6 shadow-lg flex items-center gap-6 ${isLocked ? 'locked' : ''}">
                    <span class="text-5xl">🔍</span><span class="font-bold text-2xl">הקוד הסודי</span>
                </button>
            </div>
        </div>
    `;
}

// --- 4 בשורה ---
function initConnect4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 };
    state.screen = 'connect4'; render();
}

function renderConnect4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="flex flex-col items-center py-4">
            <div class="w-full max-w-[350px] flex justify-between items-center mb-6">
                <div class="flex items-center gap-2 font-bold text-xl">
                    <span>תור:</span><div class="w-8 h-8 rounded-full ${g.turn === 1 ? 'bg-red-500' : 'bg-yellow-400'} border-2 border-white"></div>
                </div>
                <button onclick="state.connect4.isAnswering=true; prepC4Q(); render();" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg">שאלה ❓</button>
            </div>
            <div class="c4-board w-full max-w-[360px] mb-8">
                <div class="grid grid-cols-7 gap-2 mb-2 text-center text-white font-bold">
                    ${[1,2,3,4,5,6,7].map(n => `<div><div>${n}</div><div class="arrow-indicator ${g.canDrop ? 'arrow-active' : ''}">▼</div></div>`).join('')}
                </div>
                <div class="grid grid-cols-7 gap-2">
                    ${g.board.map((row, r) => row.map((cell, c) => {
                        const isAnimating = g.animatingRow === r && g.animatingCol === c;
                        const fill = isAnimating ? g.turn : cell;
                        return `<div onclick="handleC4Drop(${c})" class="aspect-square bg-blue-900 rounded-full flex items-center justify-center shadow-inner">
                            ${fill ? `<div class="w-4/5 h-4/5 rounded-full ${fill === 1 ? 'bg-red-500' : 'bg-yellow-400'} border-b-4 border-black/20"></div>` : ''}
                        </div>`;
                    }).join('')).join('')}
                </div>
            </div>
            <button onclick="state.screen='menu'; render();" class="bg-slate-200 text-slate-700 px-8 py-3 rounded-xl font-bold">חזרה</button>
        </div>
        ${g.isAnswering ? renderC4Overlay() : ''}
    `;
}

function renderC4Overlay() {
    const q = state.connect4.q;
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"><div class="bg-white p-10 rounded-[3rem] w-full max-w-sm text-center">
        <h3 class="text-5xl font-black text-blue-600 mb-6">${q.eng}</h3>
        <div class="grid gap-3">${q.choices.map(c => `<button onclick="checkC4Ans('${c}', this)" class="w-full py-4 border-2 rounded-2xl font-bold text-xl">${c}</button>`).join('')}</div>
    </div></div>`;
}

async function handleC4Drop(col) {
    const g = state.connect4; if (!g.canDrop || g.animatingRow !== -1) return;
    let targetRow = -1; for (let r = 5; r >= 0; r--) { if (!g.board[r][col]) { targetRow = r; break; } }
    if (targetRow === -1) return;
    g.canDrop = false;
    for (let r = 0; r <= targetRow; r++) {
        g.animatingRow = r; g.animatingCol = col; render();
        await new Promise(res => setTimeout(res, 120));
    }
    g.board[targetRow][col] = g.turn; g.animatingRow = -1;
    if (checkC4Win(targetRow, col, g.turn)) { setTimeout(() => { alert('ניצחון!'); initConnect4(); }, 300); }
    else { g.turn = g.turn === 1 ? 2 : 1; render(); if (state.gameMode === 'pve' && g.turn === 2) setTimeout(makeCPUMove, 600); }
}

function checkC4Win(r, c, p) {
    const b = state.connect4.board; const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        for (let s of [1, -1]) {
            let nr = r+dr*s, nc = c+dc*s;
            while (nr>=0 && nr<6 && nc>=0 && nc<7 && b[nr][nc] === p) { count++; nr+=dr*s; nc+=dc*s; }
        }
        if (count >= 4) return true;
    }
    return false;
}

function makeCPUMove() {
    let validCols = []; for (let c=0; c<7; c++) if (!state.connect4.board[0][c]) validCols.push(c);
    if (validCols.length > 0) { state.connect4.canDrop = true; handleC4Drop(validCols[Math.floor(Math.random()*validCols.length)]); }
}

function checkC4Ans(sel, btn) {
    if (sel === state.connect4.q.heb) { btn.classList.add('bg-green-500', 'text-white'); setTimeout(() => { state.connect4.isAnswering = false; state.connect4.canDrop = true; render(); }, 600); }
    else { btn.classList.add('bg-red-500', 'text-white'); setTimeout(() => { state.connect4.isAnswering = false; state.connect4.turn = (state.connect4.turn === 1 ? 2 : 1); render(); }, 600); }
}

function prepC4Q() {
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    state.connect4.q = { ...q, choices: [q.heb, ...state.words.filter(w => w.heb !== q.heb).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.heb)].sort() };
}

// --- הקוד הסודי ---
function initWordQuest() {
    const word = state.words[state.wordQuest.wordIndex % state.words.length];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false, showIntro: true };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(container) {
    const q = state.wordQuest;
    if (q.showIntro) {
        container.innerHTML = `<div class="flex-1 flex flex-col items-center justify-center text-center p-6"><h2 class="text-4xl font-black mb-6 italic">הקוד הסודי</h2><button onclick="state.wordQuest.showIntro=false; render();" class="bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-2xl">התחל משחק</button></div>`;
        return;
    }
    container.innerHTML = `<div class="flex-1 flex flex-col max-w-md mx-auto w-full py-4 ltr-dir">
        <div class="flex justify-between items-center mb-6 px-4" style="direction: rtl;"><button onclick="state.screen='menu'; render();" class="text-2xl">❌</button><span class="font-bold">ניסיונות: ${q.guesses.length}/6</span></div>
        <div class="flex items-center justify-center gap-4 mb-8" style="direction: rtl;"><span class="text-3xl font-black">${q.heb}</span><button onclick="speak('${q.target}')" class="text-3xl">🔊</button></div>
        <div class="grid gap-2 mb-8 px-4">${Array(6).fill(null).map((_, i) => {
            const guess = q.guesses[i] || (i === q.guesses.length ? q.currentGuess : '');
            return `<div class="flex justify-center gap-2">${Array(q.target.length).fill(null).map((_, j) => {
                let char = guess[j] || ''; let color = "bg-white border-2 border-slate-200";
                if (q.guesses[i]) {
                    if (q.target[j] === char) color = "bg-green-500 text-white border-none";
                    else if (q.target.includes(char)) color = "bg-yellow-400 text-white border-none";
                    else color = "bg-slate-300 text-white border-none";
                }
                return `<div class="w-12 h-14 rounded-lg flex items-center justify-center font-black text-2xl shadow-sm ${color}">${char}</div>`;
            }).join('')}</div>`;
        }).join('')}</div>
        <div class="mt-auto space-y-2 px-2">
            ${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(row => `<div class="flex justify-center gap-1">${row.split('').map(l => `<button onclick="handleWQKey('${l}')" class="flex-1 py-4 bg-white border-b-4 border-slate-300 rounded-xl font-black text-lg active:translate-y-1">${l}</button>`).join('')}</div>`).join('')}
            <div class="flex gap-1"><button onclick="handleWQKey('Enter')" class="flex-[1.5] py-4 bg-blue-600 text-white rounded-xl font-black">ENTER</button><button onclick="handleWQKey('Backspace')" class="flex-1 py-4 bg-slate-300 rounded-xl font-black">⌫</button></div>
        </div>
    </div>`;
}

function handleWQKey(key) {
    const q = state.wordQuest; if (q.isGameOver) return;
    if (key === 'Enter' && q.currentGuess.length === q.target.length) {
        q.guesses.push(q.currentGuess); if (q.currentGuess === q.target || q.guesses.length >= 6) q.isGameOver = true; q.currentGuess = '';
    } else if (key === 'Backspace') q.currentGuess = q.currentGuess.slice(0, -1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/i.test(key)) q.currentGuess += key.toUpperCase();
    render();
}

// --- משחק זיכרון ---
function initMemoryGame() {
    let cards = [];
    state.words.forEach((w, i) => {
        cards.push({ id: i, type: 'eng', content: w.eng, matched: false });
        cards.push({ id: i, type: 'heb', content: w.heb, matched: false });
    });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, isProcessing: false };
    state.screen = 'memory'; render();
}

function renderMemory(container) {
    const g = state.memoryGame;
    container.innerHTML = `<div class="p-2 flex flex-col items-center h-full"><div class="flex justify-between w-full mb-6 px-4 items-center"><button onclick="state.screen='menu'; render();" class="bg-slate-200 px-4 py-2 rounded-xl font-bold">⬅️ חזרה</button><span class="text-2xl font-black">זוגות: ${g.pairs}/${state.words.length}</span></div>
    <div class="grid grid-cols-4 gap-3 w-full max-w-xl">${g.cards.map((card, i) => {
        const flipped = g.flipped.includes(i) || card.matched;
        return `<div onclick="handleMemoryClick(${i})" class="aspect-square perspective-1000"><div class="preserve-3d ${flipped ? 'rotate-y-180' : ''} h-full w-full">
            <div class="backface-hidden bg-blue-600 rounded-2xl flex items-center justify-center text-white text-4xl">?</div>
            <div class="backface-hidden rotate-y-180 bg-white border-2 border-blue-400 rounded-2xl flex items-center justify-center p-2 text-center text-lg font-bold">${card.content}</div>
        </div></div>`;
    }).join('')}</div></div>`;
}

function handleMemoryClick(i) {
    const g = state.memoryGame; if (g.isProcessing || g.flipped.includes(i) || g.cards[i].matched) return;
    g.flipped.push(i); render();
    if (g.flipped.length === 2) {
        g.isProcessing = true; const [f, s] = g.flipped;
        if (g.cards[f].id === g.cards[s].id && g.cards[f].type !== g.cards[s].type) {
            setTimeout(() => { g.cards[f].matched = true; g.cards[s].matched = true; g.pairs++; g.flipped = []; g.isProcessing = false; render(); }, 600);
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1200); }
    }
}

// --- שיתוף מעוצב ---
function openShareUI(type) {
    const msg = type === 'result' ? `הצלחתי! קיבלתי ${state.lastScore}% ב-Word Academy!` : `בואו ללמוד איתי את הרשימה "${state.listName}":`;
    const url = window.location.href;
    const div = document.createElement('div');
    div.className = "share-overlay";
    div.onclick = (e) => { if(e.target === div) div.remove(); };
    div.innerHTML = `<div class="share-card"><h3 class="text-xl font-bold mb-6">איך תרצו לשתף?</h3><div class="flex justify-around gap-4">
        <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(msg + ' ' + url)}')"><div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">💬</div><div class="text-sm font-bold mt-2">וואטסאפ</div></button>
        <button onclick="navigator.clipboard.writeText('${url}'); alert('הקישור הועתק!');"><div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">📋</div><div class="text-sm font-bold mt-2">העתק</div></button>
    </div><button onclick="this.closest('.share-overlay').remove()" class="mt-8 text-slate-400 underline">סגור</button></div>`;
    document.body.appendChild(div);
}

window.onload = render;
