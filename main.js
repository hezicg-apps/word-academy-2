// --- הגדרות מערכת ---
let state = {
    screen: 'input', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, correctCount: 0 }
};

let learningState = { currentIndex: 0, knownWords: [] };

// --- CSS ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; }
    body.dark { background: #121212; color: #e2e8f0; }
    
    /* Header */
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }
    .logo-group { display: flex; align-items: center; gap: 10px; }

    /* צבעים וכותרות */
    .game-zone-title { font-size: 4rem; font-weight: 900; italic; margin-bottom: 2rem; }
    body:not(.dark) .game-zone-title { color: #2563eb; text-shadow: 2px 2px #bfdbfe; }
    body.dark .game-zone-title { color: #60a5fa; text-shadow: 0 0 15px #2563eb; }

    /* 4 בשורה */
    .c4-board { background: #1e40af; border: 10px solid #1e3a8a; border-radius: 2rem; padding: 10px; }
    .neon-win-red { border: 5px solid #ff0000; box-shadow: 0 0 20px #ff0000; color: #ff0000; }
    .neon-win-yellow { border: 5px solid #facc15; box-shadow: 0 0 20px #facc15; color: #facc15; }
    body.dark .neon-summary { border: 5px solid #22c55e; box-shadow: 0 0 20px #22c55e; }

    /* הקוד הסודי */
    .scroll-area { height: 180px; overflow-y: auto; display: flex; flex-direction: column-reverse; gap: 8px; padding: 10px; }
    .key-gray { background: #e2e8f0; }
    .key-yellow { background: #facc15; color: black; }
    .card-container { perspective: 1000px; width: 300px; height: 200px; margin: 0 auto; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: 0.6s; transform-style: preserve-3d; cursor: pointer; }
    .card-inner.is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 1.5rem; display: flex; align-items: center; justify-content: center; border: 2px solid #ddd; }
    .card-back { transform: rotateY(180deg); background: #2563eb; color: white; }
`;
document.head.appendChild(style);

function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    
    const header = document.createElement('header');
    header.className = "site-header";
    header.innerHTML = `
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl border-none bg-none outline-none">
            ${state.nightMode ? '☀️' : '🌙'}
        </button>
        <div class="logo-group">
            <span class="text-2xl font-black text-blue-600">Word Adventure</span>
            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">WA</div>
        </div>
    `;
    app.appendChild(header);

    const content = document.createElement('main');
    content.className = "p-4 flex-1 flex flex-col max-w-2xl mx-auto w-full";
    app.appendChild(content);

    const screens = {
        input: renderInput, flashcards: renderCards, quiz: renderQuiz, 
        report: renderReport, menu: renderMenu, connect4: renderC4, wordquest: renderWQ, memory: renderMem
    };
    (screens[state.screen] || renderInput)(content);
}

// --- מסכי הזנה ולמידה ---
function renderInput(container) {
    container.innerHTML = `<div class="py-10 space-y-6 text-center">
        <h2 class="text-3xl font-bold">הזנת מילים</h2>
        <textarea id="wordInput" class="w-full h-48 p-4 border-2 rounded-2xl text-right" placeholder="שם הרשימה\nEnglish - עברית"></textarea>
        <button onclick="saveList()" class="w-full bg-blue-600 text-white py-4 rounded-xl text-xl font-bold">מתחילים</button>
    </div>`;
}

function saveList() {
    const lines = document.getElementById('wordInput').value.split('\n');
    state.listName = lines[0];
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { eng, heb };
    });
    state.screen = 'flashcards'; render();
}

function renderCards(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-6">
            <div class="card-container" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
                <div class="card-inner">
                    <div class="card-face bg-white text-3xl font-bold">${word.eng} <button onclick="event.stopPropagation(); speak('${word.eng}')" class="mr-2">🔊</button></div>
                    <div class="card-face card-back text-3xl font-bold">${word.heb}</div>
                </div>
            </div>
            <div class="flex gap-4 w-full">
                <button onclick="nextCard(false)" class="flex-1 bg-red-500 text-white py-4 rounded-xl font-bold">עוד לא</button>
                <button onclick="nextCard(true)" class="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold">יודע!</button>
            </div>
        </div>
    `;
}

function nextCard(known) {
    if (known && !learningState.knownWords.includes(learningState.currentIndex)) learningState.knownWords.push(learningState.currentIndex);
    if (learningState.knownWords.length === state.words.length) { state.screen = 'quiz'; state.quizIndex = 0; }
    else learningState.currentIndex = (learningState.currentIndex + 1) % state.words.length;
    render();
}

function renderQuiz(container) {
    const q = state.words[state.quizIndex];
    let choices = [q.heb, ...state.words.filter(w => w.heb !== q.heb).map(w => w.heb)].sort(() => 0.5 - Math.random()).slice(0, 4);
    if (!choices.includes(q.heb)) choices[0] = q.heb;
    container.innerHTML = `
        <div class="text-center space-y-8 py-10">
            <h2 class="text-2xl font-bold text-blue-500">אתגר המילים</h2>
            <div class="text-5xl font-black">${q.eng}</div>
            <div class="grid gap-4">${choices.map(c => `<button onclick="checkQ('${c}','${q.heb}',this)" class="p-4 border-2 rounded-xl text-xl font-bold bg-white">${c}</button>`).join('')}</div>
        </div>
    `;
}

function checkQ(s, c, b) {
    if (s === c) { state.correctAnswers++; b.classList.add('bg-green-500', 'text-white'); }
    else b.classList.add('bg-red-500', 'text-white');
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; render(); }
    }, 600);
}

function renderReport(container) {
    container.innerHTML = `
        <div class="text-center py-10 space-y-6">
            <div class="bg-white p-8 rounded-3xl shadow-xl text-slate-800 border-4 ${state.nightMode ? 'neon-summary' : 'border-blue-500'}">
                <h2 class="text-2xl font-bold">הציון שלך:</h2>
                <div class="text-7xl font-black text-blue-600">${state.lastScore}%</div>
                <button onclick="state.screen='menu'; render();" class="mt-8 w-full bg-blue-600 text-white py-4 rounded-xl font-bold">לתפריט המשחקים</button>
            </div>
        </div>
    `;
}

// --- תפריט משחקים ---
function renderMenu(container) {
    const locked = state.lastScore < 70;
    container.innerHTML = `
        <div class="flex justify-between mb-8">
             <button onclick="state.screen='input'; render();" class="text-slate-500 font-bold">רשימה חדשה +</button>
             <button onclick="window.location.reload();" class="text-blue-600 font-bold">בית</button>
        </div>
        <h1 class="game-zone-title text-center">GAME ZONE</h1>
        <div class="grid gap-4">
            <button onclick="${locked ? '' : 'state.showC4Menu=true; render()'}" class="p-6 bg-white rounded-2xl shadow flex justify-between items-center ${locked ? 'opacity-50' : ''}">
                <div class="flex gap-1"><div class="w-4 h-4 rounded-full bg-red-500"></div><div class="w-4 h-4 rounded-full bg-yellow-400"></div></div>
                <span class="text-xl font-bold">4 בשורה</span>
            </button>
            <button onclick="${locked ? '' : 'startWQ()'}" class="p-6 bg-white rounded-2xl shadow flex justify-center gap-4 ${locked ? 'opacity-50' : ''}">
                <span class="text-xl font-bold text-slate-800">הקוד הסודי</span> 🔍
            </button>
            <button onclick="${locked ? '' : 'state.screen=\'memory\'; initMem(); render();'}" class="p-6 bg-white rounded-2xl shadow flex justify-center gap-4 ${locked ? 'opacity-50' : ''}">
                <span class="text-xl font-bold text-slate-800">משחק הזיכרון</span> 🧠
            </button>
        </div>
        ${state.showC4Menu ? `<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6" onclick="state.showC4Menu=false; render()">
            <div class="bg-white p-6 rounded-3xl w-full space-y-4 text-slate-800" onclick="event.stopPropagation()">
                <button onclick="state.gameMode='pve'; initC4();" class="w-full p-4 bg-blue-600 text-white rounded-xl font-bold">משחק נגד מחשב</button>
                <button onclick="state.gameMode='pvp'; initC4();" class="w-full p-4 bg-slate-200 rounded-xl font-bold">משחק זוגי</button>
            </div>
        </div>` : ''}
    `;
}

// --- 4 בשורה חכם ---
function initC4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null };
    state.screen = 'connect4'; state.showC4Menu = false; render();
}

function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="flex flex-col items-center gap-4">
            <div class="w-full flex justify-between font-bold">
                <button onclick="prepC4Q()" class="bg-blue-600 text-white px-4 py-2 rounded-lg">שאלה ❓</button>
                <div class="flex items-center gap-2">תור: <div class="w-6 h-6 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'}"></div></div>
            </div>
            <div class="c4-board w-full aspect-square max-w-[350px] grid grid-cols-7 gap-1">
                ${g.board.map((row, r) => row.map((cell, c) => `
                    <div onclick="dropToken(${c})" class="bg-blue-900 rounded-full flex items-center justify-center">
                        ${cell ? `<div class="w-4/5 h-4/5 rounded-full ${cell===1?'bg-red-500':'bg-yellow-400'}"></div>` : ''}
                    </div>
                `).join('')).join('')}
            </div>
            <button onclick="state.screen='menu'; render()" class="bg-slate-300 px-6 py-2 rounded-xl">חזרה</button>
        </div>
        ${g.isAnswering ? `<div class="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
            <div class="bg-white p-8 rounded-3xl w-full text-center text-slate-800">
                <div class="text-4xl font-bold mb-6">${g.q.eng}</div>
                <div class="grid gap-2">${g.q.choices.map(c => `<button onclick="ansC4('${c}')" class="p-4 border-2 rounded-xl font-bold">${c}</button>`).join('')}</div>
            </div>
        </div>` : ''}
        ${g.winner ? `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6">
            <div class="p-10 rounded-3xl text-center bg-white text-slate-800 ${state.nightMode ? (g.winner===1?'neon-win-red':'neon-win-yellow') : 'border-4 border-blue-500'}">
                <h2 class="text-3xl font-bold mb-4">כל הכבוד!</h2>
                <p class="text-xl">ניצחון לשחקן ה${g.winner===1?'אדום':'צהוב'}</p>
                <button onclick="initC4()" class="mt-6 bg-blue-600 text-white px-8 py-2 rounded-full font-bold">משחק חדש</button>
            </div>
        </div>` : ''}
    `;
}

function prepC4Q() {
    const q = state.words[Math.floor(Math.random()*state.words.length)];
    state.connect4.q = { eng: q.eng, heb: q.heb, choices: [q.heb, ...state.words.filter(w=>w.heb!==q.heb).map(w=>w.heb)].sort(()=>0.5-Math.random()).slice(0,3) };
    state.connect4.isAnswering = true; render();
}

function ansC4(s) {
    if (s === state.connect4.q.heb) { state.connect4.canDrop = true; state.connect4.isAnswering = false; }
    else { state.connect4.turn = state.connect4.turn === 1 ? 2 : 1; state.connect4.isAnswering = false; if(state.gameMode==='pve' && state.connect4.turn===2) moveAI(); }
    render();
}

async function dropToken(c) {
    if (!state.connect4.canDrop) return;
    let r = -1; for(let i=5; i>=0; i--) { if(!state.connect4.board[i][c]) { r=i; break; } }
    if (r === -1) return;
    state.connect4.board[r][c] = state.connect4.turn;
    state.connect4.canDrop = false;
    if (checkWin(r, c)) { state.connect4.winner = state.connect4.turn; }
    else { state.connect4.turn = state.connect4.turn === 1 ? 2 : 1; if(state.gameMode==='pve' && state.connect4.turn===2) moveAI(); }
    render();
}

function moveAI() {
    let board = state.connect4.board;
    let bestCol = -1;
    // 1. נסה לנצח
    for(let c=0; c<7; c++) { 
        let r = getRow(c); if(r!==-1) { board[r][c]=2; if(checkWin(r,c)){bestCol=c;} board[r][c]=null; }
    }
    // 2. חסום שחקן
    if(bestCol===-1) {
        for(let c=0; c<7; c++) {
            let r = getRow(c); if(r!==-1) { board[r][c]=1; if(checkWin(r,c)){bestCol=c;} board[r][c]=null; }
        }
    }
    if(bestCol===-1) {
        let valid = []; for(let c=0; c<7; c++) if(getRow(c)!==-1) valid.push(c);
        bestCol = valid[Math.floor(Math.random()*valid.length)];
    }
    state.connect4.canDrop = true; dropToken(bestCol);
}
function getRow(c) { for(let i=5; i>=0; i--) if(!state.connect4.board[i][c]) return i; return -1; }
function checkWin(r, c) {
    const b = state.connect4.board; const p = b[r][c]; const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for(let [dr,dc] of dirs) {
        let count = 1;
        for(let s of [1,-1]) {
            let nr=r+dr*s, nc=c+dc*s;
            while(nr>=0 && nr<6 && nc>=0 && nc<7 && b[nr][nc]===p) { count++; nr+=dr*s; nc+=dc*s; }
        }
        if(count>=4) return true;
    }
    return false;
}

// --- הקוד הסודי ---
function startWQ() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWQ(container) {
    const q = state.wordQuest;
    container.innerHTML = `
        <div class="flex-1 flex flex-col ltr-dir">
            <div class="text-center py-2" style="direction:rtl">
                <div class="text-blue-500 font-bold mb-1">רמז: ${q.heb}</div>
            </div>
            <div class="scroll-area">
                ${q.guesses.map(g => `<div class="flex justify-center gap-1">${g.split('').map((l,i) => {
                    let color = q.target[i]===l ? 'bg-yellow-400' : 'bg-slate-400';
                    return `<div class="w-10 h-12 flex items-center justify-center text-white font-bold rounded ${color}">${l}</div>`
                }).join('')}</div>`).join('')}
                ${!q.isGameOver ? `<div class="flex justify-center gap-1">${Array(q.target.length).fill('').map((_,i) => `<div class="w-10 h-12 border-2 flex items-center justify-center font-bold rounded bg-white text-slate-800">${q.currentGuess[i]||''}</div>`).join('')}</div>`:''}
            </div>
            
            <div class="mt-auto pb-4 px-2 space-y-1">
                ${['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(row => `<div class="flex justify-center gap-1">${row.split('').map(l => `<button onclick="handleKey('${l}')" class="flex-1 py-3 key-gray rounded font-bold text-slate-800">${l}</button>`).join('')}</div>`).join('')}
                <div class="flex gap-1">
                    <button onclick="handleKey('Enter')" class="flex-[1.5] py-3 bg-blue-600 text-white rounded font-bold">ENTER</button>
                    <button onclick="handleKey('Backspace')" class="flex-1 py-3 bg-slate-300 rounded font-bold">⌫</button>
                </div>
            </div>
        </div>
        ${q.isGameOver ? renderWQSummary() : ''}
    `;
}

function handleKey(k) {
    const q = state.wordQuest;
    if (k === 'Enter' && q.currentGuess.length === q.target.length) {
        if(q.currentGuess === q.target) q.correctCount++;
        q.guesses.push(q.currentGuess);
        if(q.currentGuess === q.target || q.guesses.length >= 6) {
            if(state.wordQuest.wordIndex < state.words.length - 1) {
                state.wordQuest.wordIndex++;
                setTimeout(() => startWQ(), 1000);
            } else { q.isGameOver = true; }
        }
        q.currentGuess = '';
    } else if (k === 'Backspace') q.currentGuess = q.currentGuess.slice(0,-1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k;
    render();
}

function renderWQSummary() {
    const score = Math.round((state.wordQuest.correctCount / state.words.length) * 100);
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6">
        <div class="p-10 rounded-3xl text-center bg-white text-slate-800 ${state.nightMode ? 'neon-win-yellow' : 'border-4 border-blue-500'}">
            <h2 class="text-3xl font-bold mb-4">סיימת את כל המילים!</h2>
            <p class="text-xl mb-2">מילים נכונות: ${state.wordQuest.correctCount} מתוך ${state.words.length}</p>
            <div class="text-5xl font-black text-blue-600 mb-6">${score}%</div>
            <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white px-8 py-2 rounded-full font-bold">חזרה לתפריט</button>
        </div>
    </div>`;
}

// --- משחק זיכרון ---
let memCards = []; let flipped = [];
function initMem() {
    memCards = [];
    state.words.forEach((w, i) => {
        memCards.push({ id: i, text: w.eng, type: 'eng', match: false });
        memCards.push({ id: i, text: w.heb, type: 'heb', match: false });
    });
    memCards.sort(() => 0.5 - Math.random());
}
function renderMem(container) {
    container.innerHTML = `
        <div class="grid grid-cols-4 gap-2">
            ${memCards.map((c, i) => `<div onclick="flip(${i})" class="aspect-square bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold cursor-pointer text-xs p-1 text-center">
                ${c.match || flipped.includes(i) ? c.text : '?'}
            </div>`).join('')}
        </div>
        <button onclick="state.screen='menu'; render()" class="mt-6 w-full py-2 bg-slate-200 rounded">חזרה</button>
    `;
}
function flip(i) {
    if(flipped.length === 2 || memCards[i].match) return;
    flipped.push(i); render();
    if(flipped.length === 2) {
        if(memCards[flipped[0]].id === memCards[flipped[1]].id) {
            memCards[flipped[0]].match = true; memCards[flipped[1]].match = true; flipped = [];
        } else { setTimeout(() => { flipped = []; render(); }, 1000); }
    }
}

window.onload = render;
