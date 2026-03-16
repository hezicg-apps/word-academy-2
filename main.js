// --- הגדרות מערכת ---
let state = {
    screen: 'input', 
    words: [],
    listName: 'אוצר המילים שלי',
    quizIndex: 0,
    correctAnswers: 0,
    lastScore: 0,
    nightMode: false,
    gameMode: 'pve', 
    showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0 }
};

let learningState = { currentIndex: 0, knownWords: [] };

// --- CSS ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: all 0.3s; }
    body.dark { background: #1a1a1a; color: white; }
    
    .card-container { perspective: 1000px; width: 100%; max-width: 400px; height: 250px; cursor: pointer; margin: 0 auto; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
    .card-inner.is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; border-radius: 2rem; border: 4px solid #f1f5f9; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
    .card-front { background: white; color: #1e293b; }
    .card-back { background: #2563eb; color: white; transform: rotateY(180deg); }

    .c4-board { background: #1e40af; border: 10px solid #1e3a8a; border-radius: 2rem; padding: 10px; }
    .arrow-indicator { font-size: 1.2rem; color: #1e3a8a; transition: all 0.3s; opacity: 0.5; }
    .arrow-active { color: #60a5fa; text-shadow: 0 0 10px #60a5fa; opacity: 1; }
    
    .btn-game { background: white; border-bottom: 6px solid #e2e8f0; transition: all 0.1s; cursor: pointer; border-radius: 2rem; color: #1e293b; }
    .btn-game:active { transform: translateY(4px); border-bottom-width: 0; }
    .locked { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: white; padding: 2rem; border-radius: 2.5rem; width: 90%; max-width: 350px; text-align: center; color: #1e293b; }
    
    .ltr-dir { direction: ltr !important; }
    .scroll-up-container { height: 220px; overflow-y: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
`;
document.head.appendChild(style);

// --- פונקציות עזר ---
function speak(text) { 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; 
    window.speechSynthesis.speak(u); 
}

function toggleNight() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('dark');
    render();
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    
    // Header קבוע
    const header = document.createElement('div');
    header.className = "w-full p-4 flex justify-between items-center bg-transparent";
    header.innerHTML = `
        <div class="text-2xl font-black italic text-blue-600">Word Adventure</div>
        <button onclick="toggleNight()" class="text-3xl border-none bg-none p-0 outline-none">
            ${state.nightMode ? '☀️' : '🌙'}
        </button>
    `;
    app.appendChild(header);

    const content = document.createElement('div');
    content.className = "w-full max-w-4xl mx-auto p-4 flex-1 flex flex-col";
    app.appendChild(content);

    const screens = {
        input: renderInputScreen, flashcards: renderFlashcardsScreen,
        quiz: renderQuizScreen, report: renderReportScreen, menu: renderMenuScreen,
        connect4: renderConnect4, wordquest: renderWordQuest
    };
    (screens[state.screen] || renderInputScreen)(content);
}

// --- מסכי קלט ולמידה ---
function renderInputScreen(container) {
    container.innerHTML = `
        <div class="space-y-6 text-center py-6">
            <h2 class="text-3xl font-black">הזנת מילים</h2>
            <textarea id="wordInput" class="w-full h-64 p-6 border-4 rounded-[2rem] text-right font-bold bg-blue-50 border-blue-100 text-slate-800" placeholder="שם היחידה\nמילה באנגלית - תרגום"></textarea>
            <button onclick="saveNewList()" class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-xl">בואו נלמד!</button>
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
            <div class="card-container" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
                <div class="card-inner">
                    <div class="card-face card-front">
                        <div class="flex items-center gap-4">
                            <span class="text-5xl font-black">${word.eng}</span>
                            <button onclick="event.stopPropagation(); speak('${word.eng}')" class="text-4xl">🔊</button>
                        </div>
                    </div>
                    <div class="card-face card-back"><span class="text-5xl font-black">${word.heb}</span></div>
                </div>
            </div>
            <div class="flex gap-4 w-full max-w-sm">
                <button onclick="nextWord(false)" class="flex-1 bg-red-500 text-white py-5 rounded-2xl font-black shadow-lg">עוד לא</button>
                <button onclick="nextWord(true)" class="flex-1 bg-green-500 text-white py-5 rounded-2xl font-black shadow-lg">יודע!</button>
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

// --- אתגר מילים ---
function renderQuizScreen(container) {
    const q = state.words[state.quizIndex];
    let choices = [q.heb, ...state.words.filter(w => w.heb !== q.heb).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.heb)].sort();
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center py-6 text-center space-y-8">
            <h2 class="text-4xl font-black text-blue-500">אתגר המילים</h2>
            <span class="text-6xl font-black">${q.eng}</span>
            <div class="grid gap-4 w-full max-w-lg">
                ${choices.map(c => `<button onclick="checkQuiz('${c}', '${q.heb}', this)" class="bg-white text-slate-800 p-5 rounded-2xl font-black text-xl border-2">${c}</button>`).join('')}
            </div>
        </div>
    `;
}

function checkQuiz(sel, cor, btn) {
    if (sel === cor) { state.correctAnswers++; btn.classList.add('bg-green-500', 'text-white'); }
    else btn.classList.add('bg-red-500', 'text-white');
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.screen = 'report'; state.lastScore = Math.round((state.correctAnswers / state.words.length) * 100); render(); }
    }, 600);
}

// --- דוח סיום ---
function renderReportScreen(container) {
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-slate-800">
                <h2 class="text-2xl font-black mb-4">הציון שלך:</h2>
                <div class="text-7xl font-black text-blue-600 mb-8">${state.lastScore}%</div>
                <div class="grid gap-3">
                    <button onclick="openShareUI('result')" class="bg-green-600 text-white py-4 rounded-xl font-bold">🏆 הצלחתי! שתפו בוואטסאפ</button>
                    <button onclick="openShareUI('list')" class="bg-blue-100 text-blue-700 py-4 rounded-xl font-bold">🔗 שיתוף רשימת המילים</button>
                    <button onclick="state.screen='flashcards'; learningState.knownWords=[]; render();" class="bg-slate-100 py-4 rounded-xl font-bold">🔄 נסה שוב לשיפור הציון</button>
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
                <button onclick="window.location.href='https://hezicg-apps.github.io/word-academy/'" class="text-xl font-bold text-blue-600">בית</button>
                <button onclick="state.screen='input'; render();" class="text-xl font-bold text-slate-500">רשימה חדשה +</button>
            </div>
            
            <h1 class="text-6xl font-black italic mb-8" style="font-family: 'Assistant'; letter-spacing: 2px;">GAME ZONE</h1>
            
            <div class="grid gap-5 max-w-md mx-auto">
                <button onclick="${isLocked ? '' : 'state.showC4Menu=true; render();'}" class="btn-game p-6 shadow-lg flex items-center justify-between px-10 ${isLocked ? 'locked' : ''}">
                    <div class="flex gap-2"><div class="w-6 h-6 rounded-full bg-red-500"></div><div class="w-6 h-6 rounded-full bg-yellow-400"></div></div>
                    <span class="font-bold text-2xl">4 בשורה</span>
                </button>
                <button onclick="${isLocked ? '' : 'initWordQuest()'}" class="btn-game p-6 shadow-lg flex items-center justify-center gap-4 ${isLocked ? 'locked' : ''}">
                    <span class="text-4xl">🔍</span><span class="font-bold text-2xl">הקוד הסודי</span>
                </button>
            </div>

            ${isLocked ? `<div class="mt-10 p-6 bg-red-50 rounded-2xl"><p class="text-red-600 font-bold">המשחקים נעולים. עליך לקבל 70% ומעלה באתגר המילים.</p>
            <button onclick="state.screen='flashcards'; render();" class="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg">חזרה לשיפור הציון</button></div>` : ''}
        </div>
        ${state.showC4Menu ? renderC4Menu() : ''}
    `;
}

function renderC4Menu() {
    return `<div class="modal-overlay" onclick="state.showC4Menu=false; render();">
        <div class="modal-card" onclick="event.stopPropagation()">
            <h2 class="text-2xl font-black mb-6">בחר מצב משחק</h2>
            <button onclick="state.gameMode='pve'; state.showC4Menu=false; initConnect4();" class="w-full py-4 mb-3 bg-blue-600 text-white rounded-2xl font-bold">משחק נגד המחשב</button>
            <button onclick="state.gameMode='pvp'; state.showC4Menu=false; initConnect4();" class="w-full py-4 bg-slate-100 rounded-2xl font-bold">משחק זוגי באותו מסך</button>
        </div>
    </div>`;
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
            <div class="w-full max-w-[360px] flex justify-between items-center mb-6 font-bold text-xl">
                <button onclick="state.connect4.isAnswering=true; prepC4Q(); render();" class="bg-blue-600 text-white px-4 py-2 rounded-xl">שאלה ❓</button>
                <div class="flex items-center gap-2"><span>תור:</span><div class="w-8 h-8 rounded-full ${g.turn === 1 ? 'bg-red-500' : 'bg-yellow-400'} border-2 border-white"></div></div>
            </div>
            
            <div class="c4-board w-full max-w-[360px] mb-8">
                <div class="grid grid-cols-7 gap-2 mb-2 text-center text-white font-bold">
                    ${[1,2,3,4,5,6,7].map(n => `<div><div>${n}</div><div class="arrow-indicator ${g.canDrop ? 'arrow-active' : ''}">▼</div></div>`).join('')}
                </div>
                <div class="grid grid-cols-7 gap-2">
                    ${g.board.map((row, r) => row.map((cell, c) => {
                        const isAnimating = g.animatingRow === r && g.animatingCol === c;
                        const fill = isAnimating ? g.turn : cell;
                        return `<div onclick="handleC4Drop(${c})" class="aspect-square bg-blue-900 rounded-full flex items-center justify-center">
                            ${fill ? `<div class="w-4/5 h-4/5 rounded-full ${fill === 1 ? 'bg-red-500' : 'bg-yellow-400'} border-b-4 border-black/20"></div>` : ''}
                        </div>`;
                    }).join('')).join('')}
                </div>
            </div>
            <button onclick="state.screen='menu'; render();" class="bg-slate-200 text-slate-700 px-10 py-3 rounded-xl font-bold mx-auto">חזרה</button>
        </div>
        ${g.isAnswering ? renderC4Question() : ''}
    `;
}

function renderC4Question() {
    const q = state.connect4.q;
    return `<div class="modal-overlay"><div class="modal-card w-full max-w-md">
        <h3 class="text-5xl font-black text-blue-600 mb-8">${q.eng}</h3>
        <div class="grid gap-3">${q.choices.map(c => `<button onclick="checkC4Ans('${c}', this)" class="w-full py-5 border-2 rounded-2xl font-bold text-xl text-slate-800">${c}</button>`).join('')}</div>
    </div></div>`;
}

async function handleC4Drop(col) {
    const g = state.connect4; if (!g.canDrop || g.animatingRow !== -1) return;
    let targetRow = -1; for (let r = 5; r >= 0; r--) { if (!g.board[r][col]) { targetRow = r; break; } }
    if (targetRow === -1) return;
    g.canDrop = false;
    for (let r = 0; r <= targetRow; r++) { g.animatingRow = r; g.animatingCol = col; render(); await new Promise(res => setTimeout(res, 100)); }
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

// --- הקוד הסודי (מותאם מקלדת) ---
function initWordQuest() {
    const word = state.words[state.wordQuest.wordIndex % state.words.length];
    state.wordQuest = { target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false, wordIndex: state.wordQuest.wordIndex };
    state.screen = 'wordquest'; render();
}

function renderWordQuest(container) {
    const q = state.wordQuest;
    const displayGuesses = q.guesses.slice(-3); // מציג רק 3 אחרונים
    container.innerHTML = `
        <div class="flex-1 flex flex-col max-w-md mx-auto w-full ltr-dir">
            <div class="flex justify-between items-center py-2 px-4" style="direction: rtl;">
                <button onclick="state.screen='menu'; render();" class="text-xl">❌</button>
                <div class="flex items-center gap-2 font-black text-2xl"><span>${q.heb}</span><button onclick="speak('${q.target}')">🔊</button></div>
            </div>
            
            <div class="scroll-up-container px-4">
                ${displayGuesses.map(guess => `<div class="flex justify-center gap-2 mb-2">${Array(q.target.length).fill(null).map((_, j) => {
                    let char = guess[j]; let color = q.target[j] === char ? "bg-green-500" : (q.target.includes(char) ? "bg-yellow-400" : "bg-slate-300");
                    return `<div class="w-12 h-14 rounded-lg flex items-center justify-center font-black text-2xl text-white ${color}">${char}</div>`;
                }).join('')}</div>`).join('')}
                
                ${!q.isGameOver ? `<div class="flex justify-center gap-2">${Array(q.target.length).fill(null).map((_, j) => {
                    let char = q.currentGuess[j] || '';
                    return `<div class="w-12 h-14 rounded-lg flex items-center justify-center font-black text-2xl bg-white border-2 border-slate-200 text-slate-800">${char}</div>`;
                }).join('')}</div>` : ''}
            </div>

            <div class="mt-auto py-2 space-y-1 bg-slate-100 p-1 rounded-t-3xl">
                ${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(row => `<div class="flex justify-center gap-1">${row.split('').map(l => `<button onclick="handleWQKey('${l}')" class="flex-1 py-3 bg-white border-b-2 border-slate-300 rounded-lg font-black text-slate-800">${l}</button>`).join('')}</div>`).join('')}
                <div class="flex gap-1"><button onclick="handleWQKey('Enter')" class="flex-[1.5] py-3 bg-blue-600 text-white rounded-lg font-black">ENTER</button><button onclick="handleWQKey('Backspace')" class="flex-1 py-3 bg-slate-400 text-white rounded-lg font-black">⌫</button></div>
            </div>
        </div>
    `;
}

function handleWQKey(key) {
    const q = state.wordQuest; if (q.isGameOver) return;
    if (key === 'Enter' && q.currentGuess.length === q.target.length) {
        q.guesses.push(q.currentGuess); if (q.currentGuess === q.target || q.guesses.length >= 6) { q.isGameOver = true; setTimeout(() => { alert(`התשובה הייתה: ${q.target}`); state.wordQuest.wordIndex++; initWordQuest(); }, 500); }
        q.currentGuess = '';
    } else if (key === 'Backspace') q.currentGuess = q.currentGuess.slice(0, -1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/i.test(key)) q.currentGuess += key.toUpperCase();
    render();
}

// --- שיתוף מעוצב ---
function openShareUI(type) {
    let msg = "";
    if (type === 'result') {
        msg = `הצלחתי! קיבלתי ${state.lastScore}% באתגר המילים של Word Academy!`;
    } else {
        const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify({ name: state.listName, words: state.words }))));
        const shareUrl = `${window.location.href.split('?')[0]}?list=${encodedData}`;
        msg = `בואו לתרגל איתי את רשימת המילים "${state.listName}": ${shareUrl}`;
    }

    const div = document.createElement('div');
    div.className = "modal-overlay";
    div.onclick = () => div.remove();
    div.innerHTML = `
        <div class="modal-card" onclick="event.stopPropagation()">
            <h3 class="text-xl font-bold mb-6">שתפו עם חברים</h3>
            <div class="flex justify-around gap-4">
                <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(msg)}')">
                    <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.63 1.432h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <div class="text-sm font-bold mt-2">וואטסאפ</div>
                </button>
                <button onclick="navigator.clipboard.writeText('${msg}'); alert('הקישור הועתק!');">
                    <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">📋</div>
                    <div class="text-sm font-bold mt-2">העתק</div>
                </button>
            </div>
        </div>`;
    document.body.appendChild(div);
}

// --- טעינת רשימה משותפת ---
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const listData = params.get('list');
    if (listData) {
        try {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(listData))));
            state.words = decoded.words;
            state.listName = decoded.name;
            state.screen = 'flashcards';
        } catch(e) { console.error("Error loading shared list"); }
    }
    render();
};
