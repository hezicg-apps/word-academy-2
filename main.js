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

// --- CSS ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; min-height: 100vh; display: flex; flex-direction: column; }
    body.dark { background: #000; color: #facc15; }
    
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }
    .logo-group { display: flex; align-items: center; gap: 8px; }
    .site-logo { width: 30px; height: 30px; }
    .site-title { font-weight: 900; font-size: 1.2rem; }

    /* UI Dark Mode Elements */
    body.dark textarea, body.dark .modal-content, body.dark .bg-white:not(.feedback-correct):not(.feedback-wrong) { 
        background: transparent !important; color: #facc15 !important; border: 2px solid #facc15 !important; 
    }
    body.dark .card-face { background: #111 !important; color: #facc15 !important; border: 2px solid #facc15 !important; }
    
    /* Feedback Colors */
    .feedback-correct { background-color: #22c55e !important; color: white !important; border: none !important; }
    .feedback-wrong { background-color: #ef4444 !important; color: white !important; border: none !important; }

    /* 4 בשורה - לוח משופר */
    .c4-board { background: #1e40af; border: 6px solid #1e3a8a; border-radius: 1rem; padding: 8px; display: grid; grid-template-rows: repeat(6, 1fr); gap: 4px; width: 280px; margin: 0 auto; aspect-ratio: 7/6; }
    .c4-row { display: grid; grid-template-cols: repeat(7, 1fr); gap: 4px; }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
    .token { width: 75%; height: 75%; border-radius: 50%; box-shadow: inset 0 -3px rgba(0,0,0,0.2); }

    /* הקוד הסודי */
    .keyboard-fixed { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px; z-index: 40; background: #e2e8f0; border-top: 2px solid #cbd5e1; }
    body.dark .keyboard-fixed { background: #111 !important; border-top-color: #facc15; }
    .wq-grid { margin-bottom: 240px; display: flex; flex-direction: column-reverse; gap: 8px; }
    .wq-cell { width: 40px; height: 50px; border: 2px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 900; background: white; color: #000; }
    body.dark .wq-cell { background: transparent; color: #facc15; border-color: #facc15; }
    .wq-cell.correct { background: #facc15 !important; color: #000 !important; border: none; }
    .wq-cell.present { background: #94a3b8 !important; color: #fff !important; border: none; }
    .ltr { direction: ltr !important; }

    /* כרטיסיות */
    .card-container { perspective: 1000px; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: 0.6s; transform-style: preserve-3d; cursor: pointer; }
    .is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #e2e8f0; background: white; }
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
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl bg-transparent border-none cursor-pointer">${state.nightMode ? '☀️' : '🌙'}</button>
        <div class="logo-group">
            <span class="site-title ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">Word Academy</span>
            <img src="https://cdn-icons-png.flaticon.com/512/3898/3898082.png" class="site-logo">
        </div>
    `;
    app.appendChild(header);
    const content = document.createElement('main');
    content.className = "p-4 flex-1 flex flex-col max-w-2xl mx-auto w-full";
    app.appendChild(content);
    const screens = { input: renderInput, flashcards: renderCards, quiz: renderQuiz, report: renderReport, menu: renderMenu, connect4: renderC4, wordquest: renderWQ, memory: renderMem };
    (screens[state.screen] || renderInput)(content);
}

function renderInput(container) {
    container.innerHTML = `<div class="py-6 space-y-6 text-center">
        <h2 class="text-3xl font-bold">הזנת מילים</h2>
        <textarea id="wordInput" class="w-full h-48 p-4 border-2 rounded-2xl text-right bg-white" placeholder="שם היחידה\nEnglish - עברית"></textarea>
        <button onclick="saveList()" class="bg-blue-600 text-white p-4 rounded-xl font-bold w-full shadow-lg">מתחילים ללמוד</button>
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
    container.innerHTML = `<div class="flex-1 flex flex-col items-center justify-center space-y-10">
        <div class="card-container w-64 h-52" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
            <div class="card-inner"><div class="card-face"><span class="text-4xl font-bold mb-2">${word.eng}</span><button onclick="event.stopPropagation(); speak('${word.eng}')" class="text-2xl">🔊</button></div><div class="card-face card-back text-3xl font-bold">${word.heb}</div></div>
        </div>
        <div class="flex gap-4 w-full px-4">
            <button onclick="nextCard(false)" class="flex-1 bg-red-500 text-white py-4 rounded-xl font-bold">עוד לא</button>
            <button onclick="nextCard(true)" class="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold">יודע!</button>
        </div>
    </div>`;
}

function nextCard(known) {
    if (known && !learningState.knownWords.includes(learningState.currentIndex)) learningState.knownWords.push(learningState.currentIndex);
    if (learningState.knownWords.length === state.words.length) { state.screen = 'quiz'; state.quizIndex = 0; state.correctAnswers = 0; }
    else learningState.currentIndex = (learningState.currentIndex + 1) % state.words.length;
    render();
}

// --- מבחן ודיווח ---
function renderQuiz(container) {
    const q = state.words[state.quizIndex];
    let choices = [q.heb, ...state.words.filter(w => w.heb !== q.heb).map(w => w.heb)].sort(() => 0.5 - Math.random()).slice(0, 4);
    container.innerHTML = `<div class="text-center space-y-8 py-4">
        <h2 class="text-xl font-bold text-blue-500">אתגר המילים</h2>
        <div class="flex items-center justify-center gap-4"><div class="text-4xl font-black">${q.eng}</div><button onclick="speak('${q.eng}')" class="text-2xl">🔊</button></div>
        <div class="grid gap-4 px-4">${choices.map(c => `<button onclick="checkQ('${c}','${q.heb}',this)" class="p-4 border-2 rounded-xl text-lg font-bold bg-white text-black shadow-sm">${c}</button>`).join('')}</div>
    </div>`;
}

function checkQ(s, c, b) {
    if (s === c) { state.correctAnswers++; b.classList.add("feedback-correct"); }
    else { b.classList.add("feedback-wrong"); }
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; render(); }
    }, 600);
}

function renderReport(container) {
    container.innerHTML = `<div class="text-center py-6 space-y-6">
        <div class="p-8 rounded-3xl shadow-2xl border-4 ${state.nightMode ? 'border-yellow-400' : 'bg-white border-blue-500'}">
            <h2 class="text-xl font-bold">הציון שלך:</h2><div class="text-7xl font-black text-blue-600 my-4">${state.lastScore}%</div>
            <div class="grid gap-3 mt-8">
                <button onclick="openShareUI()" class="bg-green-600 text-white py-4 rounded-xl font-bold">שתפו הצלחה בוואטסאפ</button>
                <button onclick="state.screen='menu'; render();" class="bg-blue-600 text-white py-4 rounded-xl font-bold text-lg">למתחם המשחקים 🎮</button>
            </div>
        </div>
    </div>`;
}

// --- תפריט משחקים ---
function renderMenu(container) {
    const locked = state.lastScore < 70;
    container.innerHTML = `
        <h1 class="game-zone-title italic text-center text-4xl font-black my-6">GAME ZONE</h1>
        <div class="grid gap-4 px-4">
            <button onclick="${locked ? '' : 'state.showC4Menu=true; render()'}" class="p-5 bg-white rounded-2xl border-2 flex justify-between items-center px-8 text-black ${locked ? 'opacity-40' : ''}">
                <div class="flex gap-2"><div class="w-5 h-5 rounded-full bg-red-500"></div><div class="w-5 h-5 rounded-full bg-yellow-400"></div></div><span class="text-xl font-black">4 בשורה</span>
            </button>
            <button onclick="${locked ? '' : 'startWQ()'}" class="p-5 bg-white rounded-2xl border-2 text-xl font-black text-black ${locked ? 'opacity-40' : ''}">הקוד הסודי 🔍</button>
            <button onclick="${locked ? '' : 'initMemGame()'}" class="p-5 bg-white rounded-2xl border-2 text-xl font-black text-black ${locked ? 'opacity-40' : ''}">משחק הזיכרון 🧠</button>
        </div>
        ${locked ? `<div class="mt-6 text-center"><p class="text-red-600 font-bold">המשחקים נעולים! השג 70% כדי לפתוח.</p><button onclick="state.screen='flashcards'; render();" class="mt-2 text-blue-600 underline font-bold">חזרה לתרגול</button></div>` : ''}
        ${state.showC4Menu ? renderC4Menu() : ''}
    `;
}

// --- משחק: הקוד הסודי ---
function startWQ() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWQ(container) {
    const q = state.wordQuest;
    container.innerHTML = `<div class="wq-main">
        <div class="text-center py-2"><div class="text-blue-500 font-bold text-xl">רמז: ${q.heb}</div>
            <div class="flex justify-center gap-4 text-[10px] mt-1 font-bold opacity-70">
                <span class="flex items-center gap-1"><div class="w-3 h-3 bg-yellow-400"></div> בול (אות ומיקום)</span>
                <span class="flex items-center gap-1"><div class="w-3 h-3 bg-slate-400"></div> כמעט (רק אות)</span>
            </div>
        </div>
        <div class="wq-grid px-4">
            ${!q.isGameOver ? `<div class="flex justify-center gap-2 ltr">${Array(q.target.length).fill('').map((_,i) => `<div class="wq-cell">${q.currentGuess[i]||''}</div>`).join('')}</div>` : ''}
            ${q.guesses.map(g => `<div class="flex justify-center gap-2 ltr">${g.split('').map((l,i) => {
                let cls = q.target[i]===l ? 'correct' : (q.target.includes(l) ? 'present' : '');
                return `<div class="wq-cell ${cls}">${l}</div>`
            }).join('')}</div>`).join('')}
        </div>
        <div class="keyboard-fixed ltr">
            ${['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(row => `<div class="flex justify-center gap-1 mb-1">${row.split('').map(l => `<button onclick="handleKey('${l}')" class="flex-1 py-4 bg-white rounded-lg font-bold text-black border shadow-sm">${l}</button>`).join('')}</div>`).join('')}
            <div class="flex gap-1"><button onclick="handleKey('Enter')" class="flex-[1.5] py-4 bg-blue-600 text-white rounded-lg font-bold">ENTER</button><button onclick="handleKey('Backspace')" class="flex-1 py-4 bg-slate-400 text-white rounded-lg font-bold">⌫</button></div>
        </div>
    </div>${q.isGameOver ? renderWQSummary() : ''}`;
}

function handleKey(k) {
    const q = state.wordQuest; if(q.isGameOver) return;
    if (k === 'Enter' && q.currentGuess.length === q.target.length) {
        if(q.currentGuess === q.target) q.correctCount++;
        q.guesses.push(q.currentGuess);
        if(q.currentGuess === q.target || q.guesses.length >= 6) {
            if(state.wordQuest.wordIndex < state.words.length - 1) { state.wordQuest.wordIndex++; setTimeout(startWQ, 800); }
            else { q.isGameOver = true; render(); }
        }
        q.currentGuess = '';
    } else if (k === 'Backspace') q.currentGuess = q.currentGuess.slice(0,-1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k;
    render();
}

function renderWQSummary() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50"><div class="p-10 rounded-3xl text-center border-4 border-yellow-400 bg-black">
        <h2 class="text-3xl font-bold mb-4 text-white">הקוד פוצח!</h2><p class="text-white">הצלחת ב-${state.wordQuest.correctCount} מילים.</p>
        <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold mt-6 w-full">חזרה לתפריט</button>
    </div></div>`;
}

// --- משחק: 4 בשורה ---
function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `<div class="flex flex-col items-center gap-4">
        <div class="w-full flex justify-between items-center max-w-[280px] font-bold">
            <button onclick="prepC4Q()" class="bg-blue-600 text-white px-4 py-2 rounded-lg">קבל שאלה</button>
            <div class="flex items-center gap-2">תור: <div class="w-6 h-6 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'}"></div></div>
        </div>
        <div class="c4-board">${g.board.map((row, r) => `<div class="c4-row">${row.map((cell, c) => {
            const isAnimating = g.animatingRow === r && g.animatingCol === c;
            const color = (cell === 1 || (isAnimating && g.turn === 1)) ? 'bg-red-500' : (cell === 2 || (isAnimating && g.turn === 2)) ? 'bg-yellow-400' : '';
            return `<div onclick="dropToken(${c})" class="c4-cell">${color ? `<div class="token ${color}"></div>` : ''}</div>`;
        }).join('')}</div>`).join('')}</div>
        <button onclick="state.screen='menu'; render()" class="bg-slate-200 px-6 py-1 rounded-lg font-bold text-black mt-2">חזרה</button>
    </div>${g.isAnswering ? renderC4Question() : ''}${g.winner ? renderC4Win() : ''}`;
}

async function dropToken(c) {
    const g = state.connect4; if (!g.canDrop || g.winner) return;
    let targetRow = -1; for(let r=5; r>=0; r--) if(!g.board[r][c]) { targetRow = r; break; }
    if (targetRow === -1) return;
    g.canDrop = false;
    for(let r=0; r<=targetRow; r++) { g.animatingRow = r; g.animatingCol = c; render(); await new Promise(res => setTimeout(res, 40)); }
    g.board[targetRow][c] = g.turn; g.animatingRow = -1;
    if (checkC4Win(targetRow, c)) { g.winner = g.turn; }
    else { g.turn = g.turn === 1 ? 2 : 1; if(state.gameMode==='pve' && g.turn === 2) setTimeout(moveAI, 500); }
    render();
}

function checkC4Win(r,c) {
    const b=state.connect4.board, p=b[r][c], dirs=[[0,1],[1,0],[1,1],[1,-1]];
    for(let [dr,dc] of dirs){ let count=1; for(let s of [1,-1]){ let nr=r+dr*s, nc=c+dc*s; while(nr>=0&&nr<6&&nc>=0&&nc<7&&b[nr][nc]===p){ count++; nr+=dr*s; nc+=dc*s; } } if(count>=4) return true; }
    return false;
}

function moveAI() {
    const g = state.connect4; let v=[]; for(let c=0; c<7; c++) if(!g.board[0][c]) v.push(c);
    if(v.length) { state.connect4.canDrop = true; dropToken(v[Math.floor(Math.random()*v.length)]); }
}

function prepC4Q() {
    const q = state.words[Math.floor(Math.random()*state.words.length)];
    state.connect4.q = { eng:q.eng, heb:q.heb, choices:[q.heb, ...state.words.filter(w=>w.heb!==q.heb).map(w=>w.heb)].sort(()=>0.5-Math.random()).slice(0,3) };
    state.connect4.isAnswering = true; render();
}

function renderC4Question() {
    return `<div class="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"><div class="modal-content bg-white p-6 rounded-2xl w-full max-w-sm text-center">
        <div class="text-3xl font-bold mb-6 text-black">${state.connect4.q.eng}</div>
        <div class="grid gap-2">${state.connect4.q.choices.map(c => `<button onclick="ansC4('${c}')" class="p-3 border-2 rounded-xl font-bold text-black bg-slate-50">${c}</button>`).join('')}</div>
    </div></div>`;
}

function ansC4(s) {
    if(s === state.connect4.q.heb) { state.connect4.canDrop=true; state.connect4.isAnswering=false; }
    else { state.connect4.turn=state.connect4.turn===1?2:1; state.connect4.isAnswering=false; if(state.gameMode==='pve'&&state.connect4.turn===2) setTimeout(moveAI, 500); }
    render();
}

function renderC4Win() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50"><div class="p-10 rounded-3xl text-center border-4 border-white">
        <h2 class="text-3xl font-bold text-white">ניצחון!</h2><p class="text-white">השחקן ה${state.connect4.winner===1?'אדום':'צהוב'} ניצח.</p>
        <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white px-8 py-2 rounded-xl mt-4 font-bold">סיום</button>
    </div></div>`;
}

function renderC4Menu() {
    return `<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick="state.showC4Menu=false; render()"><div class="modal-content bg-white p-8 rounded-3xl w-full max-w-sm space-y-4" onclick="event.stopPropagation()">
        <button onclick="state.gameMode='pve'; initC4();" class="bg-blue-600 text-white p-4 rounded-xl font-bold w-full shadow-lg">נגד המחשב</button>
        <button onclick="state.gameMode='pvp'; initC4();" class="p-4 bg-slate-100 rounded-2xl font-bold w-full text-black">זוגי (חבר לידך)</button>
    </div></div>`;
}

function initC4() { state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null, animatingRow: -1, animatingCol: -1 }; state.screen = 'connect4'; state.showC4Menu = false; render(); }

// --- משחק: זיכרון ---
function initMemGame() {
    let cards = []; state.words.forEach((w, i) => { cards.push({ id: i, text: w.eng, type: 'eng', match: false }); cards.push({ id: i, text: w.heb, type: 'heb', match: false }); });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false };
    state.screen = 'memory'; render();
}

function renderMem(container) {
    const g = state.memoryGame;
    container.innerHTML = `<div class="text-center mb-4 flex justify-between items-center px-4"><span class="font-bold">צעדים: ${g.steps}</span><span class="font-bold">זוגות: ${g.pairs}/${state.words.length}</span></div>
        <div class="grid grid-cols-4 gap-2 px-2">${g.cards.map((c, i) => `<div class="card-container aspect-square" onclick="flipMem(${i})">
            <div class="card-inner ${g.flipped.includes(i) || c.match ? 'is-flipped' : ''}"><div class="card-face bg-blue-600 text-white text-xl font-bold border-none">?</div><div class="card-face card-back bg-white border-2 border-blue-600 text-[10px] font-bold text-black p-1 text-center">${c.text}</div></div>
        </div>`).join('')}</div>${g.isGameOver ? renderMemSummary() : ''}`;
}

function flipMem(i) {
    const g = state.memoryGame; if(g.isProcessing || g.flipped.includes(i) || g.cards[i].match) return;
    g.flipped.push(i); render();
    if(g.flipped.length === 2) {
        g.isProcessing = true; g.steps++; const [a, b] = g.flipped;
        if(g.cards[a].id === g.cards[b].id) { g.cards[a].match = true; g.cards[b].match = true; g.pairs++; g.flipped = []; g.isProcessing = false; if(g.pairs === state.words.length) g.isGameOver = true; render(); }
        else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function renderMemSummary() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50"><div class="p-10 rounded-3xl text-center border-4 border-yellow-400 bg-black">
        <h2 class="text-3xl font-bold mb-4 text-white">זיכרון מעולה! 🧠</h2><p class="text-white">סיימת ב-${state.memoryGame.steps} צעדים.</p>
        <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold mt-6 w-full">חזרה לתפריט</button>
    </div></div>`;
}

// --- שיתוף וטעינה ---
function openShareUI() {
    const link = generateShareLink();
    const msg = `הצלחתי! קיבלתי ${state.lastScore}% ביחידה "${state.listName}" ב-Word Academy!\nרוצים לנסות גם? לחצו כאן:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

function generateShareLink() {
    const data = state.words.map(w => `${w.eng}-${w.heb}`).join('|');
    return `${window.location.origin}${window.location.pathname}?listName=${encodeURIComponent(state.listName)}&data=${encodeURIComponent(data)}`;
}

// טעינה אוטומטית מקישור
const params = new URLSearchParams(window.location.search);
if(params.has('data')) {
    state.listName = params.get('listName');
    const rawData = params.get('data').split('|');
    state.words = rawData.map(item => { const [eng, heb] = item.split('-'); return { eng, heb }; });
    state.screen = 'flashcards';
}

window.onload = render;
