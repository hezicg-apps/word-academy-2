// --- הגדרות מערכת ---
let state = {
    screen: 'input', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, correctCount: 0 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false }
};

let learningState = { currentIndex: 0, knownWords: [] };

// --- CSS המכיל את כל חוקי העיצוב ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }
    body.dark { background: #000; color: #facc15; }
    
    /* Header & Logo - Logo is RIGHT of the text, group is LEFT */
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }
    .logo-group { display: flex; align-items: center; gap: 8px; flex-direction: row; }
    .site-logo { width: 35px; height: 35px; order: 2; }
    .site-title { font-weight: 900; font-size: 1.5rem; order: 1; }

    /* Dark Mode Transparency & Neon */
    body.dark .modal-content, body.dark textarea, body.dark .card-face, body.dark .btn-secondary { 
        background: transparent !important; color: #facc15 !important; border: 2px solid #facc15 !important; 
    }
    body.dark .game-zone-title { color: #facc15; text-shadow: 0 0 15px rgba(250, 204, 21, 0.7); }
    .neon-border { border: 4px solid #facc15; box-shadow: 0 0 15px #facc15; }
    .neon-red { border: 4px solid #ff4444; box-shadow: 0 0 15px #ff4444; }

    /* Game Zone Title */
    .game-zone-title { font-size: 4.5rem; font-weight: 900; letter-spacing: -2px; margin: 1rem 0; }

    /* 4 בשורה - שיקום הלוח */
    .c4-container { width: 340px; margin: 0 auto; }
    .c4-board { background: #1e40af; border: 8px solid #1e3a8a; border-radius: 1.5rem; padding: 8px; display: grid; grid-template-rows: repeat(6, 1fr); gap: 5px; aspect-ratio: 7/6; }
    .c4-row { display: grid; grid-template-cols: repeat(7, 1fr); gap: 5px; }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.2); display: flex; items-center; justify-center; cursor: pointer; }
    .token { width: 85%; height: 85%; border-radius: 50%; border-bottom: 4px solid rgba(0,0,0,0.2); }

    /* הקוד הסודי - מקלדת בתחתית */
    .wq-container { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .wq-grid { display: flex; flex-direction: column-reverse; gap: 8px; margin-bottom: 20px; }
    .ltr { direction: ltr !important; }

    /* כרטיסיות זיכרון ולימוד */
    .card-container { perspective: 1000px; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: 0.6s; transform-style: preserve-3d; cursor: pointer; }
    .is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .card-back { transform: rotateY(180deg); background: #2563eb; color: white; }

    /* Buttons */
    .btn-main { background: #2563eb; color: white; padding: 1.25rem; border-radius: 1.25rem; font-weight: 800; font-size: 1.2rem; width: 100%; }
`;
document.head.appendChild(style);

function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    
    const header = document.createElement('header');
    header.className = "site-header";
    header.innerHTML = `
        <div class="logo-group">
            <span class="site-title ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">Word Adventure</span>
            <img src="logo.svg" alt="logo" class="site-logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3898/3898082.png'">
        </div>
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl bg-transparent border-none outline-none">
            ${state.nightMode ? '☀️' : '🌙'}
        </button>
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
        <textarea id="wordInput" class="w-full h-48 p-4 border-2 rounded-2xl text-right bg-white" placeholder="שם היחידה\nEnglish - עברית"></textarea>
        <button onclick="saveList()" class="btn-main shadow-lg">מתחילים ללמוד</button>
    </div>`;
}

function saveList() {
    const val = document.getElementById('wordInput').value;
    const lines = val.split('\n');
    state.listName = lines[0] || 'אוצר מילים';
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
            <div class="card-container w-72 h-56" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
                <div class="card-inner">
                    <div class="card-face bg-white border-4 shadow-xl">
                        <span class="text-4xl font-bold mb-4">${word.eng}</span>
                        <button onclick="event.stopPropagation(); speak('${word.eng}')" class="text-2xl">🔊</button>
                    </div>
                    <div class="card-face card-back text-4xl font-bold">${word.heb}</div>
                </div>
            </div>
            <div class="flex gap-4 w-full">
                <button onclick="nextCard(false)" class="flex-1 bg-red-500 text-white py-5 rounded-2xl font-bold text-xl">עוד לא</button>
                <button onclick="nextCard(true)" class="flex-1 bg-green-500 text-white py-5 rounded-2xl font-bold text-xl">יודע!</button>
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
    container.innerHTML = `
        <div class="text-center space-y-10 py-6">
            <h2 class="text-2xl font-bold text-blue-500">אתגר המילים</h2>
            <div class="flex items-center justify-center gap-4">
                <div class="text-5xl font-black">${q.eng}</div>
                <button onclick="speak('${q.eng}')" class="text-3xl">🔊</button>
            </div>
            <div class="grid gap-4">${choices.map(c => `<button onclick="checkQ('${c}','${q.heb}',this)" class="p-5 border-2 rounded-2xl text-xl font-bold bg-white transition-all">${c}</button>`).join('')}</div>
        </div>
    `;
}

function checkQ(s, c, b) {
    if (s === c) { state.correctAnswers++; b.className = "p-5 border-2 rounded-2xl text-xl font-bold bg-green-500 text-white"; }
    else b.className = "p-5 border-2 rounded-2xl text-xl font-bold bg-red-500 text-white";
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; render(); }
    }, 600);
}

function renderReport(container) {
    container.innerHTML = `
        <div class="text-center py-6 space-y-6">
            <div class="p-10 rounded-3xl shadow-2xl border-4 ${state.nightMode ? 'neon-border' : 'bg-white border-blue-500'}">
                <h2 class="text-2xl font-bold">הציון שלך ב${state.listName}:</h2>
                <div class="text-8xl font-black text-blue-600 my-4">${state.lastScore}%</div>
                <div class="grid gap-4 mt-8">
                    <button onclick="openShareUI()" class="bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                        <span>שתפו תוצאה</span> <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="24">
                    </button>
                    <button onclick="state.screen='flashcards'; learningState.knownWords=[]; render();" class="bg-slate-200 py-4 rounded-xl font-bold">תרגול חוזר</button>
                    <button onclick="state.screen='menu'; render();" class="btn-main text-xl">למתחם המשחקים 🎮</button>
                </div>
            </div>
        </div>
    `;
}

// --- תפריט משחקים ---
function renderMenu(container) {
    const locked = state.lastScore < 70;
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
             <button onclick="state.screen='input'; render();" class="text-slate-500 font-bold">רשימה חדשה +</button>
             <button onclick="window.location.reload();" class="text-blue-600 font-bold">בית</button>
        </div>
        <h1 class="game-zone-title text-center italic">GAME ZONE</h1>
        <div class="grid gap-6">
            <button onclick="${locked ? '' : 'state.showC4Menu=true; render()'}" class="p-6 bg-white rounded-3xl shadow-xl border-2 flex justify-between items-center px-10 ${locked ? 'opacity-40' : 'hover:scale-105 transition'}">
                <div class="flex gap-2"><div class="w-6 h-6 rounded-full bg-red-500"></div><div class="w-6 h-6 rounded-full bg-yellow-400"></div></div>
                <span class="text-2xl font-black">4 בשורה</span>
            </button>
            <button onclick="${locked ? '' : 'startWQ()'}" class="p-6 bg-white rounded-3xl shadow-xl border-2 flex justify-center gap-4 ${locked ? 'opacity-40' : 'hover:scale-105 transition'}">
                <span class="text-2xl font-black">הקוד הסודי</span> 🔍
            </button>
            <button onclick="${locked ? '' : 'initMemGame()'}" class="p-6 bg-white rounded-3xl shadow-xl border-2 flex justify-center gap-4 ${locked ? 'opacity-40' : 'hover:scale-105 transition'}">
                <span class="text-2xl font-black">משחק הזיכרון</span> 🧠
            </button>
        </div>
        ${locked ? `<div class="mt-8 p-6 bg-red-50 rounded-2xl text-center border-2 border-red-200"><p class="text-red-600 font-bold">המשחקים נעולים! השג 70% באתגר כדי לפתוח.</p></div>` : ''}
        ${state.showC4Menu ? renderC4Menu() : ''}
    `;
}

// --- 4 בשורה (שיקום לוח ואנימציה) ---
function initConnect4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null, animatingRow: -1, animatingCol: -1 };
    state.screen = 'connect4'; state.showC4Menu = false; render();
}

function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="flex flex-col items-center gap-6">
            <div class="w-full flex justify-between items-center max-w-[340px]">
                <button onclick="prepC4Q()" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">שאלה ❓</button>
                <div class="flex items-center gap-2 font-bold">תור: <div class="w-8 h-8 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'} border-2 border-white"></div></div>
            </div>
            <div class="c4-container">
                <div class="grid grid-cols-7 text-center mb-1 text-xs font-bold ${state.nightMode?'text-yellow-400':'text-blue-900'}">
                    ${[1,2,3,4,5,6,7].map(n => `<div>${n}<br>▼</div>`).join('')}
                </div>
                <div class="c4-board">
                    ${g.board.map((row, r) => `
                        <div class="c4-row">
                            ${row.map((cell, c) => {
                                const isAnimating = g.animatingRow === r && g.animatingCol === c;
                                const color = (cell === 1 || (isAnimating && g.turn === 1)) ? 'bg-red-500' : (cell === 2 || (isAnimating && g.turn === 2)) ? 'bg-yellow-400' : '';
                                return `<div onclick="dropToken(${c})" class="c4-cell">
                                    ${color ? `<div class="token ${color}"></div>` : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
            <button onclick="state.screen='menu'; render()" class="bg-slate-200 px-8 py-2 rounded-xl font-bold">חזרה</button>
        </div>
        ${g.isAnswering ? renderC4Question() : ''}
        ${g.winner ? renderC4Win() : ''}
    `;
}

async function dropToken(c) {
    const g = state.connect4; if (!g.canDrop || g.animatingRow !== -1 || g.winner) return;
    let targetRow = -1; for(let r=5; r>=0; r--) if(!g.board[r][c]) { targetRow = r; break; }
    if (targetRow === -1) return;
    g.canDrop = false;
    for(let r=0; r<=targetRow; r++) { g.animatingRow = r; g.animatingCol = c; render(); await new Promise(res => setTimeout(res, 60)); }
    g.board[targetRow][c] = g.turn; g.animatingRow = -1;
    if (checkC4Win(targetRow, c)) { g.winner = g.turn; }
    else { g.turn = g.turn === 1 ? 2 : 1; if(state.gameMode==='pve' && g.turn === 2) setTimeout(moveAI, 500); }
    render();
}

// --- הקוד הסודי (תיקון הקלדה וסיכום) ---
function startWQ() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWQ(container) {
    const q = state.wordQuest;
    container.innerHTML = `
        <div class="wq-container">
            <div class="text-center py-4"><div class="text-blue-500 font-bold text-2xl">רמז: ${q.heb}</div></div>
            <div class="wq-grid px-4">
                ${!q.isGameOver ? `<div class="flex justify-center gap-2 ltr">${Array(q.target.length).fill('').map((_,i) => `<div class="w-12 h-14 border-4 rounded-xl flex items-center justify-center text-3xl font-black bg-white text-black">${q.currentGuess[i]||''}</div>`).join('')}</div>` : ''}
                ${q.guesses.slice(-3).map(g => `<div class="flex justify-center gap-2 ltr">${g.split('').map((l,i) => {
                    let color = q.target[i]===l ? 'bg-yellow-400' : 'bg-slate-400';
                    return `<div class="w-12 h-14 rounded-xl flex items-center justify-center text-white font-black text-3xl ${color}">${l}</div>`
                }).join('')}</div>`).join('')}
            </div>
            <div class="bg-slate-100 p-2 rounded-t-3xl space-y-1 ltr ${state.nightMode ? 'bg-transparent border-t-2 border-yellow-400' : ''}">
                ${['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(row => `<div class="flex justify-center gap-1">${row.split('').map(l => `<button onclick="handleKey('${l}')" class="flex-1 py-4 bg-white rounded-xl font-bold shadow-sm text-black">${l}</button>`).join('')}</div>`).join('')}
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
            } else { q.isGameOver = true; render(); }
        }
        q.currentGuess = '';
    } else if (k === 'Backspace') q.currentGuess = q.currentGuess.slice(0,-1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k;
    render();
}

function renderWQSummary() {
    const score = Math.round((state.wordQuest.correctCount / state.words.length) * 100);
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
        <div class="p-10 rounded-3xl text-center border-4 ${state.nightMode ? 'neon-border' : 'bg-white border-blue-500'}">
            <h2 class="text-3xl font-bold mb-4">הקוד פוצח!</h2>
            <p class="text-xl">מילים שזוהו: ${state.wordQuest.correctCount} מתוך ${state.words.length}</p>
            <div class="text-7xl font-black text-blue-500 my-4">${score}%</div>
            <button onclick="state.screen='menu'; render()" class="btn-main mt-4">חזרה לתפריט</button>
        </div>
    </div>`;
}

// --- משחק זיכרון ---
function initMemGame() {
    let cards = [];
    state.words.forEach((w, i) => {
        cards.push({ id: i, text: w.eng, type: 'eng', match: false });
        cards.push({ id: i, text: w.heb, type: 'heb', match: false });
    });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false };
    state.screen = 'memory'; render();
}

function renderMem(container) {
    const g = state.memoryGame;
    container.innerHTML = `
        <div class="text-center mb-6 flex justify-between items-center px-4">
            <span class="font-bold">צעדים: ${g.steps}</span>
            <span class="font-bold">זוגות: ${g.pairs}/${state.words.length}</span>
        </div>
        <div class="grid grid-cols-4 gap-3">
            ${g.cards.map((c, i) => `
                <div class="card-container aspect-square" onclick="flipMem(${i})">
                    <div class="card-inner ${g.flipped.includes(i) || c.match ? 'is-flipped' : ''}">
                        <div class="card-face bg-blue-600 text-white text-2xl font-bold">?</div>
                        <div class="card-face card-back bg-white border-2 border-blue-600 text-[10px] font-bold text-black p-1 text-center">${c.text}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        ${g.isGameOver ? renderMemSummary() : ''}
    `;
}

function flipMem(i) {
    const g = state.memoryGame; if(g.isProcessing || g.flipped.includes(i) || g.cards[i].match) return;
    g.flipped.push(i); render();
    if(g.flipped.length === 2) {
        g.isProcessing = true; g.steps++;
        const [a, b] = g.flipped;
        if(g.cards[a].id === g.cards[b].id) {
            g.cards[a].match = true; g.cards[b].match = true; g.pairs++; g.flipped = []; g.isProcessing = false;
            speak(g.cards[a].type === 'eng' ? g.cards[a].text : g.cards[b].text);
            if(g.pairs === state.words.length) { g.isGameOver = true; }
            render();
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function renderMemSummary() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
        <div class="p-10 rounded-3xl text-center border-4 ${state.nightMode ? 'neon-border' : 'bg-white border-blue-500'}">
            <h2 class="text-3xl font-bold mb-4">איזה זיכרון! 🧠</h2>
            <p class="text-xl">סיימת ב-${state.memoryGame.steps} צעדים.</p>
            <p class="text-sm mt-2">נסה להשתפר בפעם הבאה!</p>
            <button onclick="state.screen='menu'; render()" class="btn-main mt-6">חזרה לתפריט</button>
        </div>
    </div>`;
}

// --- פונקציות עזר לשיתוף ---
function openShareUI() {
    const msg = `הצלחתי! קיבלתי ${state.lastScore}% ביחידה "${state.listName}" ב-Word Academy!\nרוצים לנסות גם? לחצו על הקישור:\nhttps://word-adventure.netlify.app/share?list=${encodeURIComponent(state.listName)}`;
    const overlay = document.createElement('div');
    overlay.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6";
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `
        <div class="modal-content bg-white p-8 rounded-3xl w-full max-w-sm text-center" onclick="event.stopPropagation()">
            <h3 class="text-xl font-bold mb-6">שתפו הצלחה</h3>
            <div class="flex justify-around gap-4">
                <button onclick="window.open('https://wa.me/?text=${encodeURIComponent(msg)}')">
                    <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="35"></div>
                    <div class="text-xs font-bold mt-2">וואטסאפ</div>
                </button>
                <button id="copyBtn" onclick="copyText('${msg}', this)">
                    <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">📋</div>
                    <div class="text-xs font-bold mt-2">העתק</div>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function copyText(t, btn) {
    navigator.clipboard.writeText(t).then(() => {
        btn.querySelector('div').style.backgroundColor = '#22c55e';
        btn.querySelector('.text-xs').innerText = 'הועתק!';
    });
}

// --- לוגיקה פנימית 4 בשורה ---
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
function renderC4Question() {
    return `<div class="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
        <div class="modal-content bg-white p-8 rounded-3xl w-full max-w-sm text-center">
            <div class="text-4xl font-bold mb-6">${state.connect4.q.eng}</div>
            <div class="grid gap-3">${state.connect4.q.choices.map(c => `<button onclick="ansC4('${c}')" class="p-4 border-2 rounded-xl font-bold hover:bg-slate-50">${c}</button>`).join('')}</div>
        </div>
    </div>`;
}
function ansC4(s) {
    if(s === state.connect4.q.heb) { state.connect4.canDrop=true; state.connect4.isAnswering=false; }
    else { state.connect4.turn=state.connect4.turn===1?2:1; state.connect4.isAnswering=false; if(state.gameMode==='pve'&&state.connect4.turn===2) setTimeout(moveAI, 500); }
    render();
}
function moveAI() {
    const g = state.connect4; let best = -1;
    for(let c=0; c<7; c++) { let r=getRow(c); if(r!==-1){ g.board[r][c]=2; if(checkC4Win(r,c)) best=c; g.board[r][c]=null; } }
    if(best===-1) for(let c=0; c<7; c++) { let r=getRow(c); if(r!==-1){ g.board[r][c]=1; if(checkC4Win(r,c)) best=c; g.board[r][c]=null; } }
    if(best===-1) { let v=[]; for(let c=0; c<7; c++) if(getRow(c)!==-1) v.push(c); best=v[Math.floor(Math.random()*v.length)]; }
    g.canDrop = true; dropToken(best);
}
function renderC4Win() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
        <div class="p-10 rounded-3xl text-center ${state.nightMode ? (state.connect4.winner===1?'neon-red':'neon-border') : 'bg-white border-4 border-blue-500'}">
            <h2 class="text-4xl font-bold mb-4">כל הכבוד!</h2>
            <p class="text-2xl">ניצחון לשחקן ה${state.connect4.winner===1?'אדום':'צהוב'}</p>
            <button onclick="initConnect4()" class="btn-main mt-6">משחק חדש</button>
        </div>
    </div>`;
}
function renderC4Menu() {
    return `<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick="state.showC4Menu=false; render()">
        <div class="modal-content bg-white p-8 rounded-3xl w-full max-w-sm space-y-4" onclick="event.stopPropagation()">
            <button onclick="state.gameMode='pve'; initConnect4();" class="btn-main">משחק נגד המחשב 🤖</button>
            <button onclick="state.gameMode='pvp'; initConnect4();" class="p-4 bg-slate-100 rounded-2xl font-bold w-full text-black">משחק זוגי 👥</button>
        </div>
    </div>`;
}

window.onload = render;
