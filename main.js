// --- הגדרות מערכת ---
let state = {
    screen: 'input', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, correctCount: 0 },
    memoryGame: { cards: [], flipped: [], pairs: 0, isProcessing: false }
};

let learningState = { currentIndex: 0, knownWords: [] };

// --- CSS המכיל את כל חוקי העיצוב ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; overflow-x: hidden; }
    body.dark { background: #121212; color: #facc15; }
    
    /* Header & Logo */
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }
    .logo-group { display: flex; align-items: center; gap: 8px; flex-direction: row-reverse; }
    .site-logo { width: 40px; height: 40px; }

    /* Dark Mode Transparency */
    body.dark textarea, body.dark .btn-game, body.dark .card-face, body.dark .modal-card { 
        background: transparent !important; color: #facc15 !important; border-color: #facc15 !important; 
    }
    body.dark .game-zone-title { color: #facc15; text-shadow: 0 0 15px rgba(250, 204, 21, 0.5); }

    /* 4 בשורה - לוח ריבועי והנפשות */
    .c4-board { background: #1e40af; border: 10px solid #1e3a8a; border-radius: 2rem; padding: 10px; width: 340px; height: 340px; margin: 0 auto; display: grid; grid-template-rows: repeat(6, 1fr); gap: 5px; }
    .c4-row { display: grid; grid-template-cols: repeat(7, 1fr); gap: 5px; }
    .arrow-indicator { font-size: 1.2rem; opacity: 0.3; transition: 0.3s; }
    .arrow-active { opacity: 1; color: #60a5fa; }
    
    /* ניאון סוף משחק */
    .neon-red { border: 4px solid #ff0000; box-shadow: 0 0 20px #ff0000; }
    .neon-yellow { border: 4px solid #facc15; box-shadow: 0 0 20px #facc15; }

    /* הקוד הסודי - מקלדת וניסיונות */
    .wq-grid { height: 200px; display: flex; flex-direction: column-reverse; gap: 5px; overflow-y: hidden; }
    .ltr { direction: ltr !important; }

    /* זיכרון - סיבוב קלפים */
    .mem-card { perspective: 1000px; aspect-ratio: 1; cursor: pointer; }
    .mem-inner { position: relative; width: 100%; height: 100%; transition: 0.5s; transform-style: preserve-3d; }
    .mem-inner.is-flipped { transform: rotateY(180deg); }
    .mem-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; padding: 4px; text-align: center; }
    .mem-front { background: #2563eb; color: white; }
    .mem-back { background: white; color: #1e293b; transform: rotateY(180deg); border: 2px solid #2563eb; }
`;
document.head.appendChild(style);

function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    
    // Header
    const header = document.createElement('header');
    header.className = "site-header";
    header.innerHTML = `
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl bg-transparent border-none">
            ${state.nightMode ? '☀️' : '🌙'}
        </button>
        <div class="logo-group">
            <span class="text-2xl font-black ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">Word Adventure</span>
            <img src="logo.svg" alt="logo" class="site-logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3898/3898082.png'">
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

// --- מסכי למידה ---
function renderInput(container) {
    container.innerHTML = `<div class="py-6 space-y-6 text-center">
        <h2 class="text-3xl font-bold">הזנת מילים</h2>
        <textarea id="wordInput" class="w-full h-48 p-4 border-2 rounded-2xl text-right bg-white" placeholder="שם הרשימה\nEnglish - עברית"></textarea>
        <button onclick="saveList()" class="w-full bg-blue-600 text-white py-5 rounded-2xl text-xl font-bold shadow-lg">מתחילים</button>
    </div>`;
}

function saveList() {
    const lines = document.getElementById('wordInput').value.split('\n');
    state.listName = lines[0] || 'רשימה חדשה';
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { eng, heb };
    });
    if(state.words.length) { state.screen = 'flashcards'; render(); }
}

function renderCards(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-10">
            <div class="card-container w-72 h-48" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
                <div class="card-inner relative w-full h-full transition-all duration-500 preserve-3d">
                    <div class="card-face absolute inset-0 backface-hidden bg-white border-4 rounded-3xl flex items-center justify-center text-3xl font-bold">
                        ${word.eng} <button onclick="event.stopPropagation(); speak('${word.eng}')" class="mr-3">🔊</button>
                    </div>
                    <div class="card-face absolute inset-0 backface-hidden bg-blue-600 text-white rounded-3xl flex items-center justify-center text-3xl font-bold rotate-y-180">
                        ${word.heb}
                    </div>
                </div>
            </div>
            <div class="flex gap-4 w-full">
                <button onclick="nextCard(false)" class="flex-1 bg-red-500 text-white py-5 rounded-2xl font-bold">עוד לא</button>
                <button onclick="nextCard(true)" class="flex-1 bg-green-500 text-white py-5 rounded-2xl font-bold">יודע!</button>
            </div>
        </div>
    `;
}

function nextCard(known) {
    if (known && !learningState.knownWords.includes(learningState.currentIndex)) learningState.knownWords.push(learningState.currentIndex);
    if (learningState.knownWords.length === state.words.length) { state.screen = 'quiz'; state.quizIndex = 0; state.correctAnswers = 0; }
    else learningState.currentIndex = (learningState.currentIndex + 1) % state.words.length;
    render();
}

function renderQuiz(container) {
    const q = state.words[state.quizIndex];
    let choices = [q.heb, ...state.words.filter(w => w.heb !== q.heb).map(w => w.heb)].sort(() => 0.5 - Math.random()).slice(0, 4);
    if (!choices.includes(q.heb)) choices[0] = q.heb;
    container.innerHTML = `
        <div class="text-center space-y-10 py-6">
            <h2 class="text-2xl font-bold text-blue-500">אתגר המילים</h2>
            <div class="text-5xl font-black">${q.eng}</div>
            <div class="grid gap-4">${choices.map(c => `<button onclick="checkQ('${c}','${q.heb}',this)" class="p-5 border-2 rounded-2xl text-xl font-bold bg-white">${c}</button>`).join('')}</div>
        </div>
    `;
}

function checkQ(s, c, b) {
    if (s === c) { state.correctAnswers++; b.classList.add('bg-green-500', 'text-white', 'border-green-600'); }
    else b.classList.add('bg-red-500', 'text-white', 'border-red-600');
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; render(); }
    }, 600);
}

function renderReport(container) {
    container.innerHTML = `
        <div class="text-center py-6 space-y-6">
            <div class="bg-white p-10 rounded-3xl shadow-xl border-4 ${state.nightMode ? 'neon-yellow' : 'border-blue-500'}">
                <h2 class="text-2xl font-bold">הציון שלך:</h2>
                <div class="text-8xl font-black text-blue-600">${state.lastScore}%</div>
                <div class="grid gap-4 mt-10">
                    <button onclick="openShareUI('result')" class="bg-green-600 text-white py-4 rounded-xl font-bold">🏆 שתפו תוצאה בוואטסאפ</button>
                    <button onclick="state.screen='flashcards'; learningState.knownWords=[]; render();" class="bg-slate-100 py-4 rounded-xl font-bold text-slate-700">🔄 תרגול חוזר לשיפור</button>
                    <button onclick="state.screen='menu'; render();" class="bg-blue-600 text-white py-5 rounded-2xl font-bold text-xl shadow-lg">לתפריט המשחקים 🎮</button>
                </div>
            </div>
        </div>
    `;
}

// --- תפריט משחקים ---
function renderMenu(container) {
    const locked = state.lastScore < 70;
    container.innerHTML = `
        <div class="flex justify-between items-center mb-10">
             <button onclick="window.location.reload();" class="text-blue-600 font-bold text-xl">בית</button>
             <button onclick="state.screen='input'; render();" class="text-slate-500 font-bold text-xl">רשימה חדשה +</button>
        </div>
        <h1 class="game-zone-title text-center italic">GAME ZONE</h1>
        <div class="grid gap-5">
            <button onclick="${locked ? '' : 'state.showC4Menu=true; render()'}" class="btn-game p-6 bg-white rounded-3xl shadow-lg flex justify-between items-center px-10 ${locked ? 'locked opacity-50' : ''}">
                <div class="flex gap-2"><div class="w-6 h-6 rounded-full bg-red-500"></div><div class="w-6 h-6 rounded-full bg-yellow-400"></div></div>
                <span class="text-2xl font-black">4 בשורה</span>
            </button>
            <button onclick="${locked ? '' : 'startWQ()'}" class="btn-game p-6 bg-white rounded-3xl shadow-lg flex justify-center gap-4 ${locked ? 'locked opacity-50' : ''}">
                <span class="text-2xl font-black text-slate-800">הקוד הסודי</span> 🔍
            </button>
            <button onclick="${locked ? '' : 'initMemGame()'}" class="btn-game p-6 bg-white rounded-3xl shadow-lg flex justify-center gap-4 ${locked ? 'locked opacity-50' : ''}">
                <span class="text-2xl font-black text-slate-800">משחק הזיכרון</span> 🧠
            </button>
        </div>
        ${locked ? `<div class="mt-10 p-6 bg-red-50 rounded-2xl text-center"><p class="text-red-600 font-bold">המשחקים נעולים! השג 70% באתגר כדי לפתוח.</p>
        <button onclick="state.screen='flashcards'; render();" class="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg">חזרה לתרגול</button></div>` : ''}
        ${state.showC4Menu ? renderC4Menu() : ''}
    `;
}

// --- 4 בשורה (הנפשות ולוח ריבועי) ---
function initConnect4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null, animatingRow: -1, animatingCol: -1 };
    state.screen = 'connect4'; render();
}

function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="flex flex-col items-center gap-6">
            <div class="w-full max-w-[340px] flex justify-between items-center font-bold">
                <button onclick="prepC4Q()" class="bg-blue-600 text-white px-6 py-2 rounded-xl shadow-md">שאלה ❓</button>
                <div class="flex items-center gap-3">תור: <div class="w-8 h-8 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'} border-2 border-white shadow-sm"></div></div>
            </div>
            <div class="c4-board">
                <div class="c4-row text-white text-[10px] text-center">
                    ${[1,2,3,4,5,6,7].map(n => `<div>${n}<div class="arrow-indicator ${g.canDrop?'arrow-active':''}">▼</div></div>`).join('')}
                </div>
                ${g.board.map((row, r) => `
                    <div class="c4-row">
                        ${row.map((cell, c) => {
                            const isAnimating = g.animatingRow === r && g.animatingCol === c;
                            const colorClass = (cell === 1 || (isAnimating && g.turn === 1)) ? 'bg-red-500' : (cell === 2 || (isAnimating && g.turn === 2)) ? 'bg-yellow-400' : '';
                            return `<div onclick="dropToken(${c})" class="aspect-square bg-blue-900/50 rounded-full flex items-center justify-center border-2 border-blue-950/20">
                                ${colorClass ? `<div class="w-4/5 h-4/5 rounded-full ${colorClass} border-b-4 border-black/20"></div>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                `).join('')}
            </div>
            <button onclick="state.screen='menu'; render()" class="bg-slate-200 px-10 py-3 rounded-2xl font-bold">חזרה</button>
        </div>
        ${g.isAnswering ? renderC4Question() : ''}
        ${g.winner ? renderC4Win() : ''}
    `;
}

async function dropToken(c) {
    const g = state.connect4; if (!g.canDrop || g.animatingRow !== -1) return;
    let targetRow = -1; for(let r=5; r>=0; r--) if(!g.board[r][c]) { targetRow = r; break; }
    if (targetRow === -1) return;
    g.canDrop = false;
    // הנפשת נפילה
    for(let r=0; r<=targetRow; r++) {
        g.animatingRow = r; g.animatingCol = c; render();
        await new Promise(res => setTimeout(res, 80));
    }
    g.board[targetRow][c] = g.turn; g.animatingRow = -1;
    if (checkC4Win(targetRow, c)) { g.winner = g.turn; }
    else { g.turn = g.turn === 1 ? 2 : 1; if(state.gameMode==='pve' && g.turn===2) setTimeout(moveAI, 500); }
    render();
}

// --- הקוד הסודי (תיקון כיוון ומקלדת) ---
function startWQ() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWQ(container) {
    const q = state.wordQuest;
    const displayGuesses = q.guesses.slice(-3);
    container.innerHTML = `
        <div class="flex-1 flex flex-col h-full">
            <div class="text-center py-2"><div class="text-blue-500 font-bold text-xl">רמז: ${q.heb}</div></div>
            <div class="wq-grid px-4">
                ${!q.isGameOver ? `<div class="flex justify-center gap-2 ltr">${Array(q.target.length).fill('').map((_,i) => `<div class="w-12 h-14 border-4 rounded-xl flex items-center justify-center text-2xl font-black bg-white">${q.currentGuess[i]||''}</div>`).join('')}</div>` : ''}
                ${displayGuesses.reverse().map(g => `<div class="flex justify-center gap-2 ltr">${g.split('').map((l,i) => {
                    let color = q.target[i]===l ? 'bg-yellow-400' : 'bg-slate-300';
                    return `<div class="w-12 h-14 rounded-xl flex items-center justify-center text-white font-black text-2xl ${color}">${l}</div>`
                }).join('')}</div>`).join('')}
            </div>
            <div class="mt-auto bg-slate-100 p-2 rounded-t-3xl space-y-1 ltr">
                ${['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(row => `<div class="flex justify-center gap-1">${row.split('').map(l => `<button onclick="handleKey('${l}')" class="flex-1 py-4 bg-white rounded-xl font-bold shadow-sm">${l}</button>`).join('')}</div>`).join('')}
                <div class="flex gap-1">
                    <button onclick="handleKey('Enter')" class="flex-[1.5] py-4 bg-blue-600 text-white rounded-xl font-bold">ENTER</button>
                    <button onclick="handleKey('Backspace')" class="flex-1 py-4 bg-slate-400 text-white rounded-xl font-bold">⌫</button>
                </div>
            </div>
        </div>
        ${q.isGameOver ? renderWQSummary() : ''}
    `;
}

function handleKey(k) {
    const q = state.wordQuest; if(q.isGameOver) return;
    if (k === 'Enter' && q.currentGuess.length === q.target.length) {
        if(q.currentGuess === q.target) q.correctCount++;
        q.guesses.push(q.currentGuess);
        if(q.currentGuess === q.target || q.guesses.length >= 6) {
            if(state.wordQuest.wordIndex < state.words.length - 1) {
                state.wordQuest.wordIndex++; setTimeout(startWQ, 800);
            } else { q.isGameOver = true; }
        }
        q.currentGuess = '';
    } else if (k === 'Backspace') q.currentGuess = q.currentGuess.slice(0,-1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k;
    render();
}

// --- משחק זיכרון (הקראה וסיבוב) ---
function initMemGame() {
    let cards = [];
    state.words.forEach((w, i) => {
        cards.push({ id: i, text: w.eng, type: 'eng', match: false });
        cards.push({ id: i, text: w.heb, type: 'heb', match: false });
    });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, isProcessing: false };
    state.screen = 'memory'; render();
}

function renderMem(container) {
    const g = state.memoryGame;
    container.innerHTML = `
        <div class="text-center mb-6 flex justify-between items-center">
            <button onclick="state.screen='menu'; render()" class="bg-slate-200 px-4 py-1 rounded-lg">חזרה</button>
            <span class="font-bold">זוגות: ${g.pairs} / ${state.words.length}</span>
        </div>
        <div class="grid grid-cols-4 gap-3">
            ${g.cards.map((c, i) => {
                const isFlipped = g.flipped.includes(i) || c.match;
                return `
                <div class="mem-card" onclick="flipMem(${i})">
                    <div class="mem-inner ${isFlipped ? 'is-flipped' : ''}">
                        <div class="mem-face mem-front">?</div>
                        <div class="mem-face mem-back">${c.text}</div>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
}

function flipMem(i) {
    const g = state.memoryGame; if(g.isProcessing || g.flipped.includes(i) || g.cards[i].match) return;
    g.flipped.push(i); render();
    if(g.flipped.length === 2) {
        g.isProcessing = true;
        const [a, b] = g.flipped;
        if(g.cards[a].id === g.cards[b].id) {
            g.cards[a].match = true; g.cards[b].match = true; g.pairs++; g.flipped = []; g.isProcessing = false;
            speak(g.cards[a].type === 'eng' ? g.cards[a].text : g.cards[b].text);
            if(g.pairs === state.words.length) setTimeout(() => alert('כל הכבוד!'), 500);
            render();
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

// --- פונקציות עזר ו-AI ---
function moveAI() {
    const g = state.connect4; let best = -1;
    for(let c=0; c<7; c++) { let r=getRow(c); if(r!==-1){ g.board[r][c]=2; if(checkC4Win(r,c)) best=c; g.board[r][c]=null; } }
    if(best===-1) for(let c=0; c<7; c++) { let r=getRow(c); if(r!==-1){ g.board[r][c]=1; if(checkC4Win(r,c)) best=c; g.board[r][c]=null; } }
    if(best===-1) { let v=[]; for(let c=0; c<7; c++) if(getRow(c)!==-1) v.push(c); best=v[Math.floor(Math.random()*v.length)]; }
    g.canDrop = true; dropToken(best);
}
function getRow(c) { for(let i=5; i>=0; i--) if(!state.connect4.board[i][c]) return i; return -1; }
function checkC4Win(r,c) {
    const b=state.connect4.board, p=b[r][c], dirs=[[0,1],[1,0],[1,1],[1,-1]];
    for(let [dr,dc] of dirs){ let count=1; for(let s of [1,-1]){ let nr=r+dr*s, nc=c+dc*s; while(nr>=0&&nr<6&&nc>=0&&nc<7&&b[nr][nc]===p){ count++; nr+=dr*s; nc+=dc*s; } } if(count>=4) return true; }
    return false;
}
function prepC4Q() {
    const q = state.words[Math.floor(Math.random()*state.words.length)];
    state.connect4.q = { eng:q.eng, heb:q.heb, choices:[q.heb, ...state.words.filter(w=>w.heb!==q.heb).map(w=>w.heb)].sort(()=>0.5-Math.random()).slice(0,3) };
    state.connect4.isAnswering = true; render();
}
function ansC4(s) {
    if(s === state.connect4.q.heb) { state.connect4.canDrop=true; state.connect4.isAnswering=false; }
    else { state.connect4.turn=state.connect4.turn===1?2:1; state.connect4.isAnswering=false; if(state.gameMode==='pve'&&state.connect4.turn===2) setTimeout(moveAI, 500); }
    render();
}

// --- שיתוף ---
function openShareUI(type) {
    const msg = type === 'result' ? `הצלחתי! קיבלתי ${state.lastScore}% ב-Word Academy!` : `בואו ללמוד איתי אנגלית!`;
    const overlay = document.createElement('div');
    overlay.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6";
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `
        <div class="modal-card bg-white p-8 rounded-3xl w-full max-w-sm text-center" onclick="event.stopPropagation()">
            <h3 class="text-xl font-bold mb-6">שתפו עם חברים</h3>
            <div class="flex justify-around gap-4">
                <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(msg)}')">
                    <div class="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">💬</div>
                    <div class="text-xs font-bold mt-2">וואטסאפ</div>
                </button>
                <button id="copyBtn" onclick="copyToClipboard('${msg}', this)">
                    <div class="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">📋</div>
                    <div class="text-xs font-bold mt-2">העתק</div>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        btn.querySelector('div').style.backgroundColor = '#22c55e';
        btn.querySelector('div').innerHTML = '✓';
        btn.querySelector('.text-xs').innerText = 'הועתק!';
    });
}

function renderC4Menu() {
    return `<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick="state.showC4Menu=false; render()">
        <div class="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4" onclick="event.stopPropagation()">
            <button onclick="state.gameMode='pve'; initConnect4();" class="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold">משחק נגד המחשב</button>
            <button onclick="state.gameMode='pvp'; initConnect4();" class="w-full p-4 bg-slate-100 rounded-2xl font-bold">משחק זוגי</button>
        </div>
    </div>`;
}

window.onload = render;
