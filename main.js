// --- הגדרות מערכת ---
let state = {
    screen: 'input', 
    words: [],
    listName: 'אוצר המילים שלי',
    quizIndex: 0,
    correctAnswers: 0,
    score: 0,
    nightMode: false,
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', maxAttempts: 5, isGameOver: false, wordIndex: 0 }
};

let learningState = { currentIndex: 0, isFlipped: false, knownWords: [] };

// --- CSS גלובלי (כולל גופן לראשית קריאה וניאון) ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Andika&display=swap');
    
    body { font-family: 'Andika', 'Comic Sans MS', sans-serif; transition: background 0.3s; margin: 0; }
    .perspective-1000 { perspective: 1000px; }
    .preserve-3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
    .backface-hidden { backface-visibility: hidden; position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
    .rotate-y-180 { transform: rotateY(180deg); }
    
    /* מצב לילה - ללא מסגרות */
    body.night-mode { background-color: #0f172a; color: #facc15; }
    .night-mode .bg-white, .night-mode .bg-blue-50 { background: transparent !important; color: #facc15 !important; border: none !important; }
    .night-mode .text-blue-600 { color: #facc15 !important; }
    .night-mode button:not(.bg-green-500):not(.bg-red-500) { background: transparent !important; border: 1.5px solid #334155 !important; color: #facc15; }
    
    /* הודעות ניאון */
    .neon-box-red { border: 4px solid #ef4444; box-shadow: 0 0 15px #ef4444, inset 0 0 15px #ef4444; }
    .neon-box-yellow { border: 4px solid #facc15; box-shadow: 0 0 15px #facc15, inset 0 0 15px #facc15; }
    .neon-box-blue { border: 4px solid #3b82f6; box-shadow: 0 0 15px #3b82f6, inset 0 0 15px #3b82f6; }

    .animate-pop { animation: pop 0.3s ease-out; }
    @keyframes pop { 0% { transform: scale(0.8); } 100% { transform: scale(1); } }
`;
document.head.appendChild(style);

// --- פונקציות ליבה ---
function toggleNightMode() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode', state.nightMode);
    render();
}

function speak(text) { 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text); 
    u.lang = 'en-US'; u.rate = 0.8; 
    window.speechSynthesis.speak(u); 
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const isDark = state.nightMode;

    const header = document.createElement('header');
    header.className = `flex flex-row-reverse justify-between items-center p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`;
    header.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-xl font-black text-blue-600">Word Academy</span>
            <img src="logo.png" alt="Logo" class="w-8 h-8 object-contain">
        </div>
        <button onclick="toggleNightMode()" class="p-2 text-xl">${isDark ? '☀️' : '🌙'}</button>
    `;
    app.appendChild(header);

    const content = document.createElement('div');
    content.className = "w-full max-w-4xl mx-auto p-4 flex-1 flex flex-col overflow-hidden";
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
        <div class="space-y-6 text-center">
            <h2 class="text-2xl font-black text-blue-600">רשימה חדשה</h2>
            <textarea id="wordInput" class="w-full h-40 p-4 border-4 rounded-3xl outline-none text-right font-bold ${state.nightMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-blue-50 text-slate-800'}" placeholder="שם הרשימה\ndog - כלב"></textarea>
            <button onclick="saveNewList()" class="w-full bg-blue-600 text-white py-4 rounded-3xl font-black text-xl shadow-lg">המשך ✨</button>
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
    container.innerHTML = `<div class="p-10 text-center"><h1 class="text-4xl font-black text-blue-600 mb-8">${state.listName}</h1><button onclick="state.screen='flashcards'; render();" class="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-2xl">מתחילים!</button></div>`;
}

function renderFlashcardsScreen(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
            <h1 class="text-2xl font-black text-blue-600">${state.listName}</h1>
            <div onclick="learningState.isFlipped = !learningState.isFlipped; render();" class="relative w-full aspect-video max-w-sm perspective-1000 cursor-pointer">
                <div class="w-full h-full preserve-3d ${learningState.isFlipped ? 'rotate-y-180' : ''}">
                    <div class="absolute inset-0 bg-white border-4 border-blue-100 rounded-[2rem] flex flex-col items-center justify-center backface-hidden shadow-xl">
                        <span class="text-4xl font-black text-blue-600">${word.eng}</span>
                        <button onclick="event.stopPropagation(); speak('${word.eng}')" class="mt-4 text-3xl">🔊</button>
                    </div>
                    <div class="absolute inset-0 bg-blue-600 rounded-[2rem] flex items-center justify-center backface-hidden rotate-y-180 shadow-xl">
                        <span class="text-4xl font-black text-white">${word.heb}</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-4 w-full max-w-sm">
                <button onclick="nextWord(false)" class="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">עוד לא</button>
                <button onclick="nextWord(true)" class="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold shadow-md">יודע ✅</button>
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
        <div class="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
            <span class="text-5xl font-black text-blue-600">${q.eng}</span>
            <button onclick="speak('${q.eng}')" class="text-3xl mb-2">🔊</button>
            <div class="grid gap-3 w-full max-w-sm">
                ${choices.map(c => `<button onclick="checkQuiz('${c}', '${q.heb}', this)" class="bg-white p-4 rounded-2xl font-black text-xl border-2 border-slate-100 shadow-sm text-slate-800">${c}</button>`).join('')}
            </div>
        </div>
    `;
}

function checkQuiz(sel, cor, btn) {
    if (sel === cor) { state.correctAnswers++; btn.classList.add('bg-green-500', 'text-white'); if(typeof confetti === 'function') confetti(); }
    else btn.classList.add('bg-red-500', 'text-white');
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.score = Math.round((state.correctAnswers / state.words.length) * 100); state.screen = 'report'; render(); }
    }, 800);
}

function renderReportScreen(container) {
    const canPlay = state.score >= 70;
    container.innerHTML = `
        <div class="p-6 text-center space-y-6 h-full flex flex-col justify-center">
            <div class="bg-white p-8 rounded-[2rem] shadow-2xl">
                <h2 class="text-2xl font-black mb-2">סיימת את האתגר!</h2>
                <div class="text-7xl font-black text-yellow-400 my-4">${state.score}%</div>
                <div class="flex flex-col gap-2">
                    <button onclick="openShareModal(true, ${state.score})" class="bg-blue-600 text-white py-3 rounded-xl font-bold">שיתוף תוצאה 🏆</button>
                </div>
            </div>
            ${canPlay ? 
                `<button onclick="state.screen='menu'; render();" class="w-full bg-green-500 text-white py-5 rounded-3xl font-black text-2xl shadow-xl animate-bounce">בואו נשחק! 🎮</button>` :
                `<div class="p-4 bg-red-50 text-red-600 rounded-2xl font-bold">צריך לפחות 70% כדי לפתוח את המשחקים. נסה שוב!</div>
                 <button onclick="state.screen='quiz'; state.quizIndex=0; state.correctAnswers=0; render();" class="bg-slate-700 text-white py-4 rounded-2xl font-bold">נסה שוב 🔄</button>`
            }
        </div>
    `;
}

// --- Game Menu ---

function renderMenuScreen(container) {
    container.innerHTML = `
        <div class="p-4 space-y-4 text-center">
            <div class="flex justify-between items-center max-w-md mx-auto mb-6">
                <button onclick="window.location.href='https://wordacademy.co.il'" class="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold">🏠 בית</button>
                <button onclick="state.screen='input'; render();" class="bg-slate-500 text-white px-4 py-2 rounded-xl font-bold">➕ רשימה חדשה</button>
            </div>
            <h1 class="text-3xl font-black text-blue-600 italic">Game Zone</h1>
            <div class="grid gap-4 max-w-sm mx-auto w-full">
                <button onclick="initMemoryGame()" class="bg-white p-5 rounded-2xl shadow-lg border-b-4 border-blue-400 flex items-center gap-4">
                    <span class="text-4xl">🧠</span><span class="font-black text-xl text-slate-800">משחק הזיכרון</span>
                </button>
                <button onclick="initConnect4()" class="bg-white p-5 rounded-2xl shadow-lg border-b-4 border-red-400 flex items-center gap-4">
                    <span class="text-4xl">🔴</span><span class="font-black text-xl text-slate-800">4 בשורה</span>
                </button>
                <button onclick="initWordQuest()" class="bg-white p-5 rounded-2xl shadow-lg border-b-4 border-green-400 flex items-center gap-4">
                    <span class="text-4xl">🔍</span><span class="font-black text-xl text-slate-800">הקוד הסודי</span>
                </button>
            </div>
        </div>
    `;
}

// --- 🧠 משחק הזיכרון ---

function initMemoryGame() {
    let cards = [];
    state.words.forEach((w, i) => {
        cards.push({ id: i, type: 'eng', content: w.eng, matched: false });
        cards.push({ id: i, type: 'heb', content: w.heb, matched: false });
    });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    state.screen = 'memory'; render();
}

function renderMemory(container) {
    const g = state.memoryGame;
    container.innerHTML = `
        <div class="flex flex-col items-center h-full">
            <div class="flex justify-between w-full mb-4 items-center">
                <button onclick="state.screen='menu'; render();" class="px-4 py-2 bg-slate-100 rounded-xl font-bold text-lg text-slate-800">⬅️ חזור</button>
                <div class="flex flex-col text-center">
                    <span class="font-bold">צעדים: ${g.steps}</span>
                    <span class="font-bold text-blue-600">זוגות: ${g.pairs}/${state.words.length}</span>
                </div>
            </div>
            <div class="grid grid-cols-4 gap-2 w-full max-w-sm">
                ${g.cards.map((card, i) => {
                    const flipped = g.flipped.includes(i) || card.matched;
                    return `<div onclick="handleMemoryClick(${i})" class="aspect-square perspective-1000">
                        <div class="w-full h-full preserve-3d ${flipped ? 'rotate-y-180' : ''}">
                            <div class="absolute inset-0 bg-blue-600 rounded-xl flex items-center justify-center backface-hidden shadow-md text-white text-2xl font-bold">?</div>
                            <div class="absolute inset-0 bg-white border-2 border-blue-400 rounded-xl flex items-center justify-center p-1 backface-hidden rotate-y-180 text-blue-700 font-bold text-sm text-center">${card.content}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
            ${g.pairs === state.words.length ? `
                <div class="mt-6 p-6 bg-slate-900 neon-box-blue rounded-3xl text-center">
                    <h3 class="text-xl font-bold text-white mb-2">כל הכבוד! 🏆</h3>
                    <p class="text-blue-300">מצאת הכל ב-${g.steps} צעדים.</p>
                    <p class="text-yellow-400 font-bold mt-2 text-lg">נראה לך שאפשר בפחות?</p>
                    <button onclick="initMemoryGame()" class="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl">שחק שוב</button>
                </div>
            ` : ''}
        </div>
    `;
}

function handleMemoryClick(i) {
    const g = state.memoryGame; if (g.isProcessing || g.flipped.includes(i) || g.cards[i].matched) return;
    g.flipped.push(i); render();
    if (g.flipped.length === 2) {
        g.steps++; g.isProcessing = true;
        const [f, s] = g.flipped;
        if (g.cards[f].id === g.cards[s].id && g.cards[f].type !== g.cards[s].type) {
            const engWord = g.cards[f].type === 'eng' ? g.cards[f].content : g.cards[s].content;
            speak(engWord);
            setTimeout(() => { g.cards[f].matched = true; g.cards[s].matched = true; g.pairs++; g.flipped = []; g.isProcessing = false; render(); }, 600);
        } else {
            setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000);
        }
    }
}

// --- 🔍 הקוד הסודי (WordQuest) ---

function initWordQuest() {
    const word = state.words[state.wordQuest.wordIndex % state.words.length];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(container) {
    const q = state.wordQuest;
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-between p-2">
            <div class="flex justify-between w-full px-4 mb-2">
                <button onclick="state.screen='menu'; render();" class="px-3 py-1 bg-slate-100 rounded-xl font-bold text-slate-800">⬅️ חזור</button>
                <span class="font-black">הקוד הסודי</span>
            </div>
            <div class="flex items-center gap-3 p-2 mb-2 ${state.nightMode ? '' : 'bg-blue-50 rounded-2xl'}">
                <span class="text-lg font-bold">רמז: ${q.heb}</span>
                <button onclick="speak('${q.target}')" class="text-xl">🔊</button>
            </div>
            <div class="grid gap-1 mb-4" style="direction: ltr;">
                ${Array(5).fill(null).map((_, i) => {
                    const guess = q.guesses[i] || (i === q.guesses.length ? q.currentGuess : '');
                    return `<div class="flex gap-1 justify-center">
                        ${Array(q.target.length).fill(null).map((_, j) => {
                            let char = guess[j] || '';
                            let color = "bg-white border-2 border-slate-200 text-slate-800";
                            if (q.guesses[i]) {
                                if (q.target[j] === char) color = "bg-[#facc15] text-black border-yellow-600 shadow-[0_0_10px_#facc15]"; // זהב - בול
                                else if (q.target.includes(char)) color = "bg-[#e2e8f0] text-black border-slate-400 shadow-[0_0_10px_#cbd5e1]"; // כסף - כמעט
                                else color = "bg-slate-400 text-white border-slate-500";
                            }
                            return `<div class="w-8 h-10 rounded-lg flex items-center justify-center font-black text-lg ${color}">${char}</div>`;
                        }).join('')}
                    </div>`;
                }).join('')}
            </div>
            <div class="w-full max-w-sm space-y-1" style="direction: ltr;">
                ${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(row => `<div class="flex justify-center gap-1">
                    ${row.split('').map(l => `<button onclick="handleWQKey('${l}')" class="flex-1 py-3 bg-white border-b-4 border-slate-200 rounded-lg font-bold text-slate-800">${l}</button>`).join('')}
                </div>`).join('')}
                <div class="flex gap-1">
                    <button onclick="handleWQKey('Enter')" class="flex-[1.5] py-3 bg-blue-600 text-white rounded-lg font-bold">ENTER</button>
                    <button onclick="handleWQKey('Backspace')" class="flex-1 py-3 bg-slate-300 rounded-lg font-bold">⌫</button>
                </div>
            </div>
            ${q.isGameOver ? `
                <div class="mt-4 p-4 bg-slate-900 neon-box-blue rounded-2xl text-center w-full max-w-xs">
                    <h3 class="font-bold text-white">המילה הייתה: ${q.target}</h3>
                    <button onclick="state.wordQuest.wordIndex++; initWordQuest();" class="mt-2 bg-green-500 text-white px-6 py-2 rounded-xl font-bold">למילה הבאה!</button>
                </div>` : ''}
        </div>
    `;
}

function handleWQKey(key) {
    const q = state.wordQuest; if (q.isGameOver) return;
    if (key === 'Enter' && q.currentGuess.length === q.target.length) {
        q.guesses.push(q.currentGuess);
        if (q.currentGuess === q.target || q.guesses.length >= 5) q.isGameOver = true;
        if (q.currentGuess === q.target && typeof confetti === 'function') confetti();
        q.currentGuess = '';
    } else if (key === 'Backspace') q.currentGuess = q.currentGuess.slice(0, -1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(key.toUpperCase())) q.currentGuess += key.toUpperCase();
    render();
}

// --- 🔴 4 בשורה ---

function initConnect4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1, winner: null };
    state.screen = 'connect4'; render();
}

function renderConnect4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="flex flex-col items-center h-full justify-between overflow-hidden">
            <div class="flex justify-between w-full px-4 items-center mb-2">
                <button onclick="state.screen='menu'; render();" class="px-4 py-2 bg-slate-100 rounded-xl font-bold text-lg text-slate-800">⬅️ חזור</button>
                <div class="flex gap-2 items-center bg-white/10 p-2 rounded-full px-4">
                    <div class="w-4 h-4 rounded-full ${g.turn === 1 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-yellow-400 shadow-[0_0_10px_yellow]'}"></div>
                    <span class="font-bold text-lg">${g.turn === 1 ? 'אדום' : 'צהוב'}</span>
                </div>
            </div>
            
            <button onclick="state.connect4.isAnswering=true; prepC4Q(); render();" class="bg-blue-600 text-white px-8 py-3 rounded-2xl text-xl font-black shadow-lg animate-pulse">שאלה ❓</button>

            <div class="mt-4 flex flex-col items-center">
                <div class="grid grid-cols-7 gap-1 w-full max-w-[300px] text-center font-black text-slate-400 text-sm">
                    ${[1,2,3,4,5,6,7].map(n => `<div>${n}</div>`).join('')}
                    ${[1,2,3,4,5,6,7].map(() => `<div class="text-xs">▼</div>`).join('')}
                </div>
                <div class="bg-blue-700 p-2 rounded-3xl shadow-2xl grid grid-cols-7 gap-1 w-full max-w-[300px] border-b-8 border-blue-900">
                    ${g.board.map((row, r) => row.map((cell, c) => {
                        // בדיקת ריצוד: הצג אסימון קבוע אלא אם זה האסימון שנופל כרגע
                        const val = (g.animatingRow === r && g.animatingCol === c) ? g.turn : cell;
                        return `<div onclick="handleC4Drop(${c})" class="aspect-square bg-blue-900 rounded-full flex items-center justify-center border-2 border-blue-800/30">
                            ${val === 1 ? '<div class="w-4/5 h-4/5 bg-red-500 rounded-full shadow-inner"></div>' : 
                              val === 2 ? '<div class="w-4/5 h-4/5 bg-yellow-400 rounded-full shadow-inner"></div>' : ''}
                        </div>`;
                    }).join('')).join('')}
                </div>
            </div>

            ${g.winner ? `
                <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
                    <div class="p-8 rounded-[2rem] bg-slate-900 ${g.winner === 1 ? 'neon-box-red' : 'neon-box-yellow'} text-center">
                        <h2 class="text-3xl font-black text-white mb-4">ניצחון ל${g.winner === 1 ? 'אדום' : 'צהוב'}! 🏆</h2>
                        <button onclick="initConnect4()" class="bg-white text-slate-900 px-8 py-3 rounded-xl font-black">שחק שוב</button>
                    </div>
                </div>
            ` : ''}

            ${g.isAnswering ? renderC4Modal() : ''}
        </div>
    `;
}

function renderC4Modal() {
    const q = state.connect4.q;
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
        <div class="bg-white p-8 rounded-[2rem] w-full max-w-sm text-center text-slate-900">
            <div class="flex flex-col items-center gap-2 mb-8">
                <span class="text-5xl font-black text-blue-600">${q.eng}</span>
                <button onclick="speak('${q.eng}')" class="text-3xl">🔊</button>
            </div>
            <div class="grid gap-3">
                ${q.choices.map(c => `<button onclick="checkC4Ans('${c}', this)" class="w-full py-5 border-2 border-slate-100 rounded-2xl font-black text-xl shadow-sm hover:bg-blue-50">${c}</button>`).join('')}
            </div>
        </div>
    </div>`;
}

function prepC4Q() {
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    state.connect4.q = { ...q, choices: [q.heb, ...state.words.filter(w => w.heb !== q.heb).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.heb)].sort() };
}

function checkC4Ans(sel) {
    if (sel === state.connect4.q.heb) { state.connect4.isAnswering = false; state.connect4.canDrop = true; render(); }
    else { 
        state.connect4.isAnswering = false; 
        state.connect4.turn = state.connect4.turn === 1 ? 2 : 1;
        render(); 
        if (state.connect4.turn === 2) setTimeout(makeCPUMove, 800);
    }
}

async function handleC4Drop(col) {
    const g = state.connect4; if (!g.canDrop || g.animatingRow !== -1 || g.winner) return;
    let targetRow = -1; for (let r = 5; r >= 0; r--) { if (!g.board[r][col]) { targetRow = r; break; } }
    if (targetRow === -1) return;
    g.canDrop = false;
    for (let r = 0; r <= targetRow; r++) { g.animatingRow = r; g.animatingCol = col; render(); await new Promise(res => setTimeout(res, 60)); }
    g.board[targetRow][col] = g.turn; g.animatingRow = -1;
    if (checkC4Win(targetRow, col, g.turn)) { g.winner = g.turn; if(typeof confetti === 'function') confetti(); render(); }
    else { g.turn = g.turn === 1 ? 2 : 1; render(); if (g.turn === 2) setTimeout(makeCPUMove, 800); }
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
    const g = state.connect4; let validCols = [];
    for (let c=0; c<7; c++) if (!g.board[0][c]) validCols.push(c);
    if (validCols.length > 0) {
        state.connect4.canDrop = true;
        handleC4Drop(validCols[Math.floor(Math.random()*validCols.length)]);
    }
}

// --- שיתוף ופענוח ---

function openShareModal(isResult, score = 0) {
    const text = isResult ? `קיבלתי ${score}% באתגר המילים! בואו לנסות:` : `הנה רשימת המילים "${state.listName}" לתרגול:`;
    const shareUrl = window.location.href;
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4";
    modal.innerHTML = `<div class="bg-white rounded-3xl w-full max-w-xs p-6 text-slate-800 text-center">
        <h3 class="text-xl font-bold mb-4">שיתוף</h3>
        <div class="grid gap-3">
            <a href="https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}" target="_blank" class="p-3 bg-green-500 text-white rounded-xl font-bold">WhatsApp</a>
            <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('הועתק!')" class="p-3 border-2 rounded-xl font-bold text-slate-700">העתק קישור</button>
            <button onclick="this.closest('.fixed').remove()" class="mt-2 text-slate-400">סגור</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

function parseWordsFromURL() {
    const params = new URLSearchParams(window.location.search);
    const wParam = params.get('w');
    if (wParam) {
        try {
            const decoded = decodeURIComponent(escape(atob(wParam)));
            const lines = decoded.split('\n');
            state.listName = lines[0];
            state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
                const [eng, heb] = l.split('-').map(s => s.trim());
                return { eng, heb };
            });
            state.screen = 'welcome';
        } catch (e) { console.error("URL Parse Error"); }
    }
}

window.onload = () => { parseWordsFromURL(); render(); };
