// --- הגדרות מערכת ---
let state = {
    screen: 'input', 
    words: [],
    listName: 'אוצר המילים שלי',
    quizIndex: 0,
    correctAnswers: 0,
    lastScore: 0, // מעקב אחרי הציון האחרון לפתיחת משחקים
    isLoggedIn: false, // סטטוס התחברות לדיווח למורה
    nightMode: false,
    gameMode: 'pve', // pve או pvp
    memoryGame: { cards: [], flipped: [], pairs: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, showIntro: true }
};

let learningState = { currentIndex: 0, isFlipped: false, knownWords: [] };

const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; transition: background 0.3; overflow-x: hidden; }
    
    .perspective-1000 { perspective: 1000px; }
    .preserve-3d { transform-style: preserve-3d; transition: transform 0.6s ease; width: 100%; height: 100%; position: relative; }
    .backface-hidden { backface-visibility: hidden; position: absolute; inset: 0; }
    .rotate-y-180 { transform: rotateY(180deg); }
    
    button { outline: none !important; border: none !important; cursor: pointer; transition: all 0.2s; }
    .speaker-btn { background: none; border: none; padding: 0; cursor: pointer; }

    /* אנימציית נפילה 4 בשורה */
    .token-step { transition: transform 0.15s linear; }
    
    .night-mode { background-color: #0f172a; color: #facc15; }
    .night-mode .bg-white { background-color: #1e293b !important; color: #facc15 !important; }
    
    .locked { opacity: 0.5; filter: grayscale(1); cursor: not-allowed !important; }
    
    /* סידור הקוד הסודי - שמאל לימין */
    .ltr-dir { direction: ltr !important; }
`;
document.head.appendChild(style);

function toggleNightMode() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode', state.nightMode);
    render();
}

function speak(text) { 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; 
    window.speechSynthesis.speak(u); 
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const isDark = state.nightMode;

    // Header
    const header = document.createElement('header');
    header.className = `flex flex-row-reverse justify-between items-center p-4 ${isDark ? 'bg-slate-900' : 'bg-white border-b'}`;
    header.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-2xl font-extrabold ${isDark ? 'text-yellow-400' : 'text-blue-600'}">Word Academy</span>
            <img src="logo.svg" alt="" class="w-10 h-10" onerror="this.style.display='none'">
        </div>
        <button onclick="toggleNightMode()" class="text-3xl bg-transparent">${isDark ? '☀️' : '🌙'}</button>
    `;
    app.appendChild(header);

    const content = document.createElement('div');
    content.className = "w-full max-w-4xl mx-auto p-4 flex-1 flex flex-col";
    app.appendChild(content);

    const screens = {
        input: renderInputScreen, welcome: renderWelcomeScreen, flashcards: renderFlashcardsScreen,
        quiz: renderQuizScreen, report: renderReportScreen, menu: renderMenuScreen,
        memory: renderMemory, connect4: renderConnect4, wordquest: renderWordQuest
    };
    (screens[state.screen] || renderInputScreen)(content);
}

// --- מסכי למידה ---
function renderInputScreen(container) {
    container.innerHTML = `
        <div class="space-y-6 text-center py-10">
            <h2 class="text-3xl font-black">הזנת תוכן</h2>
            <textarea id="wordInput" class="w-full h-64 p-6 border-4 rounded-[2rem] text-right font-bold ${state.nightMode ? 'bg-slate-800 border-yellow-500 text-white' : 'bg-blue-50 border-blue-100 text-slate-800'}" placeholder="שם היחידה\nמילה באנגלית - תרגום לעברית"></textarea>
            <button onclick="saveNewList()" class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-xl">מתחילים 🚀</button>
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

function renderWelcomeScreen(container) {
    container.innerHTML = `<div class="flex-1 flex flex-col items-center justify-center text-center"><h1 class="text-6xl font-black mb-8">${state.listName}</h1><button onclick="state.screen='flashcards'; render();" class="bg-blue-600 text-white px-12 py-6 rounded-full font-black text-4xl shadow-2xl">קדימה!</button></div>`;
}

function renderFlashcardsScreen(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
            <p class="text-lg font-bold text-blue-500">לחצו על הכרטיסייה לסיבוב 🔄</p>
            <div onclick="learningState.isFlipped = !learningState.isFlipped; render();" class="relative w-full aspect-video max-w-md perspective-1000 cursor-pointer">
                <div class="preserve-3d ${learningState.isFlipped ? 'rotate-y-180' : ''}">
                    <div class="backface-hidden bg-white border-4 rounded-[2rem] flex flex-col items-center justify-center shadow-xl">
                        <span class="text-5xl font-black">${word.eng}</span>
                        <button onclick="event.stopPropagation(); speak('${word.eng}')" class="mt-4 text-4xl bg-transparent">🔊</button>
                    </div>
                    <div class="backface-hidden rotate-y-180 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl">
                        <span class="text-5xl font-black text-white">${word.heb}</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-4 w-full max-w-md">
                <button onclick="nextWord(false)" class="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold">עוד לא</button>
                <button onclick="nextWord(true)" class="flex-1 bg-green-500 text-white py-4 rounded-2xl font-bold">יודע! ✅</button>
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
    learningState.isFlipped = false; render();
}

function renderQuizScreen(container) {
    const q = state.words[state.quizIndex];
    let choices = [q.heb, ...state.words.filter(w => w.heb !== q.heb).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.heb)].sort();
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-8 text-center">
            <span class="text-6xl font-black text-blue-600">${q.eng}</span>
            <button onclick="speak('${q.eng}')" class="text-4xl bg-transparent">🔊</button>
            <div class="grid gap-4 w-full max-w-lg">
                ${choices.map(c => `<button onclick="checkQuiz('${c}', '${q.heb}', this)" class="bg-white p-5 rounded-2xl font-black text-xl border-2 shadow-sm">${c}</button>`).join('')}
            </div>
        </div>
    `;
}

function checkQuiz(sel, cor, btn) {
    if (sel === cor) { 
        state.correctAnswers++; 
        btn.classList.add('bg-green-500', 'text-white'); 
    } else {
        btn.classList.add('bg-red-500', 'text-white');
    }
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.screen = 'report'; state.lastScore = Math.round((state.correctAnswers / state.words.length) * 100); render(); }
    }, 600);
}

function renderReportScreen(container) {
    const score = state.lastScore;
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md flex flex-col items-center">
                <h2 class="text-3xl font-black mb-2">הציון שלך:</h2>
                <div class="text-8xl font-black text-yellow-400 my-2">${score}%</div>
                
                <div class="grid grid-cols-1 gap-3 w-full mt-4">
                    <button onclick="state.screen='flashcards'; learningState.knownWords=[]; render();" class="bg-blue-100 text-blue-700 py-4 rounded-xl font-bold">🔄 תרגול חוזר</button>
                    <button onclick="openShareModal(false)" class="bg-slate-100 text-slate-700 py-4 rounded-xl font-bold">🔗 שיתוף רשימה</button>
                    <button onclick="reportToTeacher(${score})" class="${state.isLoggedIn ? 'bg-green-600' : 'bg-slate-300 locked'} text-white py-4 rounded-xl font-bold">
                        ${state.isLoggedIn ? '📩 דווח למורה' : '🔒 דווח למורה (לרשומים)'}
                    </button>
                </div>
            </div>
            <button onclick="state.screen='menu'; render();" class="w-full max-w-md bg-green-500 text-white py-6 rounded-full font-black text-3xl shadow-xl">בואו נשחק! 🎮</button>
        </div>
    `;
}

function reportToTeacher(score) {
    if(!state.isLoggedIn) return;
    alert(`הציון ${score}% נשלח בהצלחה למורה!`);
}

// --- תפריט משחקים ---
function renderMenuScreen(container) {
    const isLocked = state.lastScore < 70;
    container.innerHTML = `
        <div class="p-4 space-y-6 text-center">
            <div class="flex justify-between items-center max-w-lg mx-auto mb-4">
                <button onclick="state.screen='input'; render();" class="text-lg font-bold text-slate-500">➕ רשימה חדשה</button>
                <button onclick="window.location.href='https://hezicg-apps.github.io/word-academy/'" class="text-lg font-bold text-blue-600 flex items-center gap-1">🏠 בית</button>
            </div>
            
            <h1 class="text-4xl font-black italic">GAME ZONE</h1>
            ${isLocked ? `<p class="text-red-500 font-bold">המשחקים נעולים! השג 70% ומעלה באתגר כדי לפתוח אותם.</p>` : ''}
            
            <div class="grid gap-4 max-w-lg mx-auto w-full">
                <button onclick="${isLocked ? '' : 'initMemoryGame()'}" class="bg-white p-6 rounded-3xl shadow-lg flex items-center gap-6 ${isLocked ? 'locked' : ''}">
                    <span class="text-5xl">🧠</span><span class="font-bold text-2xl">משחק הזיכרון</span>
                </button>
                <button onclick="${isLocked ? '' : 'state.gameMode=\'pve\'; initConnect4()'}" class="bg-white p-6 rounded-3xl shadow-lg flex items-center gap-6 ${isLocked ? 'locked' : ''}">
                    <span class="text-5xl">🔴</span><span class="font-bold text-2xl">4 בשורה (נגד מחשב)</span>
                </button>
                <button onclick="${isLocked ? '' : 'state.gameMode=\'pvp\'; initConnect4()'}" class="bg-white p-6 rounded-3xl shadow-lg flex items-center gap-6 ${isLocked ? 'locked' : ''}">
                    <span class="text-5xl">👥</span><span class="font-bold text-2xl">4 בשורה (2 שחקנים)</span>
                </button>
                <button onclick="${isLocked ? '' : 'initWordQuest()'}" class="bg-white p-6 rounded-3xl shadow-lg flex items-center gap-6 ${isLocked ? 'locked' : ''}">
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
        <div class="flex flex-col items-center py-4 h-full">
            <div class="w-full max-w-[360px] flex justify-between items-center px-2 mb-4">
                <div class="flex items-center gap-2 font-bold text-xl">
                    <div class="w-6 h-6 rounded-full ${g.turn === 1 ? 'bg-red-500' : 'bg-yellow-400'}"></div>
                    <span>תור:</span>
                </div>
                <button onclick="state.connect4.isAnswering=true; prepC4Q(); render();" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg">שאלה ❓</button>
            </div>
            
            <div class="mt-4 mb-8 bg-blue-800 p-4 rounded-[2.5rem] shadow-2xl w-full max-w-[350px]">
                <div class="grid grid-cols-7 gap-2">
                    ${g.board.map((row, r) => row.map((cell, c) => {
                        const isAnimating = g.animatingRow === r && g.animatingCol === c;
                        return `<div onclick="handleC4Drop(${c})" class="aspect-square bg-blue-950 rounded-full flex items-center justify-center relative">
                            ${(cell || isAnimating) ? `<div class="w-4/5 h-4/5 rounded-full ${ (isAnimating ? g.turn : cell) === 1 ? 'bg-red-500' : 'bg-yellow-400'}"></div>` : ''}
                        </div>`;
                    }).join('')).join('')}
                </div>
            </div>

            <button onclick="state.screen='menu'; render();" class="bg-slate-200 text-slate-700 px-8 py-3 rounded-xl font-bold">חזרה לתפריט</button>

            ${g.isAnswering ? `
                <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
                    <div class="bg-white p-10 rounded-[3rem] w-full max-w-sm text-center">
                        <h3 class="text-4xl font-black text-blue-600 mb-6">${g.q.eng}</h3>
                        <div class="grid gap-3">
                            ${g.q.choices.map(c => `<button onclick="checkC4Ans('${c}', this)" class="w-full py-4 border-2 rounded-2xl font-bold text-xl">${c}</button>`).join('')}
                        </div>
                    </div>
                </div>` : ''}
        </div>
    `;
}

async function handleC4Drop(col) {
    const g = state.connect4; if (!g.canDrop || g.animatingRow !== -1) return;
    let targetRow = -1; for (let r = 5; r >= 0; r--) { if (!g.board[r][col]) { targetRow = r; break; } }
    if (targetRow === -1) return;
    
    g.canDrop = false;
    // אנימציית "מעבר" דרך התאים
    for (let r = 0; r <= targetRow; r++) {
        g.animatingRow = r; g.animatingCol = col; render();
        await new Promise(res => setTimeout(res, 150));
    }
    g.board[targetRow][col] = g.turn; g.animatingRow = -1;
    
    if (checkC4Win(targetRow, col, g.turn)) {
        setTimeout(() => { alert(`שחקן ${g.turn === 1 ? 'אדום' : 'צהוב'} ניצח! 🎉`); initConnect4(); }, 300);
    } else {
        g.turn = g.turn === 1 ? 2 : 1; render();
        if (state.gameMode === 'pve' && g.turn === 2) setTimeout(makeCPUMove, 600);
    }
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
    if (validCols.length > 0) {
        state.connect4.canDrop = true;
        handleC4Drop(validCols[Math.floor(Math.random()*validCols.length)]);
    }
}

function checkC4Ans(sel, btn) {
    if (sel === state.connect4.q.heb) {
        btn.classList.add('bg-green-500', 'text-white');
        setTimeout(() => { state.connect4.isAnswering = false; state.connect4.canDrop = true; render(); }, 600);
    } else {
        btn.classList.add('bg-red-500', 'text-white');
        setTimeout(() => { state.connect4.isAnswering = false; state.connect4.turn = (state.connect4.turn === 1 ? 2 : 1); render(); }, 600);
    }
}

function prepC4Q() {
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    state.connect4.q = { ...q, choices: [q.heb, ...state.words.filter(w => w.heb !== q.heb).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.heb)].sort() };
}

// --- הקוד הסודי ---
function initWordQuest() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false, showIntro: true };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(container) {
    const q = state.wordQuest;
    if (q.showIntro) {
        container.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center text-center p-6">
                <h2 class="text-4xl font-black mb-6">איך משחקים?</h2>
                <div class="space-y-4 text-xl font-bold mb-8">
                    <p><span class="text-green-600">ירוק:</span> אות נכונה במקום.</p>
                    <p><span class="text-yellow-500">זהוב:</span> אות קיימת במקום אחר.</p>
                    <p><span class="text-slate-400">אפור:</span> אות לא קיימת.</p>
                </div>
                <button onclick="state.wordQuest.showIntro=false; render();" class="bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-2xl">התחל משחק</button>
            </div>
        `; return;
    }

    container.innerHTML = `
        <div class="flex-1 flex flex-col max-w-md mx-auto w-full py-4 ltr-dir">
            <div class="flex justify-between items-center mb-6 px-4" style="direction: rtl;">
                <button onclick="state.screen='menu'; render();" class="text-2xl">❌</button>
                <span class="font-bold">ניסיונות: ${q.guesses.length}/6</span>
            </div>

            <div class="flex items-center justify-center gap-4 mb-8" style="direction: rtl;">
                <span class="text-3xl font-black">${q.heb}</span>
                <button onclick="speak('${q.target}')" class="text-3xl bg-transparent">🔊</button>
            </div>

            <div class="grid gap-2 mb-8 px-4">
                ${Array(6).fill(null).map((_, i) => {
                    const guess = q.guesses[i] || (i === q.guesses.length ? q.currentGuess : '');
                    return `<div class="flex justify-center gap-2">
                        ${Array(q.target.length).fill(null).map((_, j) => {
                            let char = guess[j] || '';
                            let color = "bg-white border-2 border-slate-200 text-slate-800";
                            if (q.guesses[i]) {
                                if (q.target[j] === char) color = "bg-green-500 text-white border-none";
                                else if (q.target.includes(char)) color = "bg-yellow-400 text-white border-none";
                                else color = "bg-slate-300 text-white border-none";
                            }
                            return `<div class="w-12 h-14 rounded-lg flex items-center justify-center font-black text-2xl shadow-sm ${color}">${char}</div>`;
                        }).join('')}
                    </div>`;
                }).join('')}
            </div>

            <div class="mt-auto space-y-2 px-2">
                ${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(row => `<div class="flex justify-center gap-1">
                    ${row.split('').map(l => `<button onclick="handleWQKey('${l}')" class="flex-1 py-4 bg-white border-b-4 border-slate-300 rounded-xl font-black text-slate-800 text-lg active:translate-y-1 active:border-b-0">${l}</button>`).join('')}
                </div>`).join('')}
                <div class="flex gap-1">
                    <button onclick="handleWQKey('Enter')" class="flex-[1.5] py-4 bg-blue-600 text-white rounded-xl font-black">ENTER</button>
                    <button onclick="handleWQKey('Backspace')" class="flex-1 py-4 bg-slate-300 rounded-xl font-black">⌫</button>
                </div>
            </div>
            
            ${q.isGameOver ? `<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]">
                <div class="bg-white p-10 rounded-[3rem] text-center" style="direction: rtl;">
                    <h3 class="text-3xl font-black mb-4">${q.currentGuess === q.target ? 'ניצחת! 🎉' : 'לא נורא...'}</h3>
                    <p class="text-xl mb-6 font-bold">המילה היא: <span class="text-blue-600">${q.target}</span></p>
                    <button onclick="state.wordQuest.wordIndex++; initWordQuest();" class="bg-green-500 text-white px-10 py-4 rounded-full font-bold text-xl">המילה הבאה</button>
                </div>
            </div>` : ''}
        </div>
    `;
}

function handleWQKey(key) {
    const q = state.wordQuest; if (q.isGameOver) return;
    if (key === 'Enter') {
        if (q.currentGuess.length === q.target.length) {
            q.guesses.push(q.currentGuess);
            if (q.currentGuess === q.target) q.isGameOver = true;
            else if (q.guesses.length >= 6) q.isGameOver = true;
            q.currentGuess = '';
        }
    } else if (key === 'Backspace') q.currentGuess = q.currentGuess.slice(0, -1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(key.toUpperCase())) q.currentGuess += key.toUpperCase();
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
    container.innerHTML = `
        <div class="p-2 flex flex-col items-center h-full">
            <div class="flex justify-between w-full mb-6 px-4 items-center">
                <button onclick="state.screen='menu'; render();" class="bg-slate-200 px-4 py-2 rounded-xl font-bold">⬅️ חזרה</button>
                <span class="text-2xl font-black">זוגות: ${g.pairs}/${state.words.length}</span>
            </div>
            <div class="grid grid-cols-4 gap-3 w-full max-w-xl">
                ${g.cards.map((card, i) => {
                    const flipped = g.flipped.includes(i) || card.matched;
                    return `<div onclick="handleMemoryClick(${i})" class="aspect-square perspective-1000">
                        <div class="preserve-3d ${flipped ? 'rotate-y-180' : ''}">
                            <div class="backface-hidden bg-blue-600 rounded-2xl flex items-center justify-center text-white text-4xl">?</div>
                            <div class="backface-hidden rotate-y-180 bg-white border-2 border-blue-400 rounded-2xl flex items-center justify-center p-2 text-center text-lg font-bold">${card.content}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
}

function handleMemoryClick(i) {
    const g = state.memoryGame; if (g.isProcessing || g.flipped.includes(i) || g.cards[i].matched) return;
    g.flipped.push(i); render();
    if (g.flipped.length === 2) {
        g.isProcessing = true; const [f, s] = g.flipped;
        if (g.cards[f].id === g.cards[s].id && g.cards[f].type !== g.cards[s].type) {
            speak(state.words[g.cards[f].id].eng);
            setTimeout(() => { g.cards[f].matched = true; g.cards[s].matched = true; g.pairs++; g.flipped = []; g.isProcessing = false; render(); }, 600);
        } else {
            setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1200);
        }
    }
}

function openShareModal(isResult) {
    const shareUrl = window.location.href;
    alert("הקישור הועתק! ניתן לשלוח אותו בוואטסאפ או במייל.");
    navigator.clipboard.writeText(shareUrl);
}

window.onload = render;
