// --- הגדרות מערכת ---
let state = {
    screen: 'input', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null, msg: '' },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, correctCount: 0 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false }
};

let learningState = { currentIndex: 0, knownWords: [] };

// --- CSS ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; min-height: 100vh; display: flex; flex-direction: column; }
    body.dark { background: #000; color: #facc15 !important; }
    
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
    .site-title { font-weight: 900; font-size: 1.3rem; margin: 0 10px; }
    .site-logo { width: 35px; height: 35px; object-fit: contain; }

    /* Dark Mode */
    body.dark textarea { background: #111 !important; color: #facc15 !important; border-color: #facc15; }
    body.dark .bg-white { background: transparent !important; color: #facc15 !important; border: 1px solid #facc15 !important; }
    body.dark .wq-cell { color: #facc15 !important; border-color: #facc15 !important; }

    /* 4 בשורה - לוח קטן ודיסקיות פרופורציונליות */
    .c4-board { background: #1e40af; border: 6px solid #1e3a8a; border-radius: 12px; padding: 6px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; width: 280px; margin: 0 auto; }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
    .token { width: 65%; height: 65%; border-radius: 50%; box-shadow: inset 0 -3px rgba(0,0,0,0.2); }

    /* הקוד הסודי - צבעים ומקרא */
    .wq-cell { width: 40px; height: 50px; border: 2px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; background: white; color: #1e293b; }
    .bg-correct { background: #22c55e !important; color: white !important; border: none; }
    .bg-present { background: #facc15 !important; color: white !important; border: none; }
    .bg-absent { background: #64748b !important; color: white !important; border: none; }

    /* משחק זיכרון - טקסט גדול */
    .mem-card-text { font-size: 1.4rem; font-weight: 800; text-align: center; padding: 4px; line-height: 1.1; overflow-wrap: break-word; }
    .card-face { padding: 5px; }
`;
document.head.appendChild(style);

function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

// פונקציית שיתוף עם קידוד מלא
function getFullLink() {
    const data = btoa(unescape(encodeURIComponent(state.words.map(w => `${w.eng}-${w.heb}`).join('|'))));
    const baseUrl = window.location.href.split('?')[0];
    return `${baseUrl}?listName=${encodeURIComponent(state.listName)}&v=${data}`;
}

function render() {
    const app = document.getElementById('app'); app.innerHTML = '';
    const header = document.createElement('header');
    header.className = "site-header";
    header.innerHTML = `
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl bg-transparent border-none cursor-pointer">
            ${state.nightMode ? '☀️' : '🌙'}
        </button>
        <div class="flex items-center">
            <span class="site-title ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">Word Adventure</span>
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

// --- מסכים ---
function renderInput(container) {
    container.innerHTML = `<div class="py-6 space-y-6 text-center">
        <h2 class="text-3xl font-bold">הזנת מילים</h2>
        <textarea id="wordInput" class="w-full h-48 p-4 border-2 rounded-2xl text-right" placeholder="שם היחידה\nEnglish - עברית"></textarea>
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
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-10">
            <div class="card-container w-64 h-52" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
                <div class="card-inner">
                    <div class="card-face"><span class="text-4xl font-bold">${word.eng}</span><button onclick="event.stopPropagation(); speak('${word.eng}')" class="mt-4 text-2xl">🔊</button></div>
                    <div class="card-face card-back text-3xl font-bold">${word.heb}</div>
                </div>
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

function renderQuiz(container) {
    const q = state.words[state.quizIndex];
    let choices = [q.heb, ...state.words.filter(w => w.heb !== q.heb).map(w => w.heb)].sort(() => 0.5 - Math.random()).slice(0, 4);
    container.innerHTML = `<div class="text-center space-y-8 py-4">
        <div class="text-4xl font-black">${q.eng}</div>
        <div class="grid gap-4 px-4">${choices.map(c => `<button onclick="checkQ('${c}','${q.heb}',this)" class="p-4 border-2 rounded-xl text-lg font-bold bg-white text-black transition-all shadow-sm">${c}</button>`).join('')}</div>
    </div>`;
}

function checkQ(s, c, b) {
    if (s === c) { state.correctAnswers++; b.style.backgroundColor = "#22c55e"; b.style.color = "white"; }
    else { b.style.backgroundColor = "#ef4444"; b.style.color = "white"; }
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; render(); }
    }, 600);
}

function renderReport(container) {
    container.innerHTML = `
        <div class="text-center py-6 space-y-6">
            <div class="p-8 rounded-3xl shadow-2xl border-4 ${state.nightMode ? 'border-yellow-400' : 'bg-white border-blue-500'}">
                <h2 class="text-xl font-bold">הציון שלך:</h2>
                <div class="text-7xl font-black text-blue-600 my-4">${state.lastScore}%</div>
                <button onclick="openShare(true)" class="bg-green-600 text-white py-4 rounded-xl font-bold w-full mb-3">שתפו הישג בוואטסאפ 🏆</button>
                <button onclick="state.screen='menu'; render();" class="bg-blue-600 text-white py-4 rounded-xl font-bold w-full">למתחם המשחקים 🎮</button>
            </div>
        </div>`;
}

function renderMenu(container) {
    const locked = state.lastScore < 70;
    container.innerHTML = `
        <div class="flex justify-between mb-4"><button onclick="openShare(false)" class="text-green-600 font-bold">שתף רשימה 🔗</button></div>
        <h1 class="game-zone-title italic">GAME ZONE</h1>
        <div class="grid gap-4">
            <button onclick="${locked?'':'state.showC4Menu=true;render()'}" class="p-5 bg-white rounded-2xl shadow border-2 flex justify-between items-center px-8 ${locked?'opacity-40':''}">
                <div class="flex gap-1"><div class="w-4 h-4 rounded-full bg-red-500"></div><div class="w-4 h-4 rounded-full bg-yellow-400"></div></div>
                <span class="text-xl font-black text-black">4 בשורה</span>
            </button>
            <button onclick="${locked?'':'startWQ()'}" class="p-5 bg-white rounded-2xl shadow border-2 flex justify-center gap-4 ${locked?'opacity-40':''}">
                <span class="text-xl font-black text-black">הקוד הסודי</span> 🔍
            </button>
            <button onclick="${locked?'':'initMemGame()'}" class="p-5 bg-white rounded-2xl shadow border-2 flex justify-center gap-4 ${locked?'opacity-40':''}">
                <span class="text-xl font-black text-black">משחק הזיכרון</span> 🧠
            </button>
        </div>
        ${locked ? `<div class="mt-6 p-4 bg-red-50 rounded-xl text-center border-2 border-red-200">
            <p class="text-red-600 font-bold">🔒 המשחקים נעולים (נדרש 70%)</p>
            <button onclick="state.screen='flashcards';learningState.knownWords=[];render();" class="mt-2 text-blue-600 underline">נסה שוב</button>
        </div>`:''}
        ${state.showC4Menu ? renderC4Menu() : ''}
    `;
}

// --- משחקים ---
function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="flex flex-col items-center gap-3">
            <div class="w-full flex justify-between items-center max-w-[280px]">
                <button onclick="prepC4Q()" class="bg-blue-600 text-white px-4 py-1 rounded-lg">קבל שאלה</button>
                <div class="flex items-center gap-1">תור: <div class="w-5 h-5 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'}"></div></div>
            </div>
            <div class="text-sm font-bold text-blue-500 h-5">${g.msg}</div>
            <div class="c4-board">
                ${g.board.flat().map((cell, i) => `<div onclick="dropToken(${i%7})" class="c4-cell">${cell ? `<div class="token ${cell===1?'bg-red-500':'bg-yellow-400'}"></div>` : ''}</div>`).join('')}
            </div>
            <button onclick="state.screen='menu'; render()" class="text-slate-500">חזרה</button>
        </div>
        ${g.isAnswering ? renderC4Question() : ''}
        ${g.winner ? renderC4Win() : ''}
    `;
}

function dropToken(c) {
    const g = state.connect4; if (!g.canDrop || g.winner) return;
    for (let r = 5; r >= 0; r--) {
        if (!g.board[r][c]) {
            g.board[r][c] = g.turn;
            if (checkC4Win(r, c)) g.winner = g.turn;
            else { g.turn = g.turn === 1 ? 2 : 1; g.canDrop = false; g.msg = ''; if(state.gameMode==='pve' && g.turn === 2) setTimeout(moveAI, 600); }
            render(); return;
        }
    }
}

function startWQ() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWQ(container) {
    const q = state.wordQuest;
    container.innerHTML = `
        <div class="wq-main flex flex-col items-center">
            <div class="text-xl font-bold mb-4 flex items-center gap-2">רמז: ${q.heb} <button onclick="speak('${q.target}')">🔊</button></div>
            <div class="flex flex-col gap-2 ltr mb-4">
                ${q.guesses.map(g => `<div class="flex gap-2">${g.split('').map((l,i) => {
                    let cls = q.target[i]===l ? 'bg-correct' : (q.target.includes(l) ? 'bg-present' : 'bg-absent');
                    return `<div class="wq-cell ${cls}">${l}</div>`;
                }).join('')}</div>`).join('')}
                ${!q.isGameOver ? `<div class="flex gap-2">${Array(q.target.length).fill('').map((_,i) => `<div class="wq-cell">${q.currentGuess[i]||''}</div>`).join('')}</div>` : ''}
            </div>
            <div class="grid grid-cols-10 gap-1 ltr w-full px-2">
                ${"QWERTYUIOPASDFGHJKLZXCVBNM".split('').map(l => `<button onclick="handleKey('${l}')" class="bg-white text-black p-3 rounded font-bold border">${l}</button>`).join('')}
                <button onclick="handleKey('Backspace')" class="col-span-2 bg-slate-300 p-3 rounded font-bold">⌫</button>
                <button onclick="handleKey('Enter')" class="col-span-3 bg-blue-600 text-white p-3 rounded font-bold text-sm">ENTER</button>
            </div>
            <button onclick="state.screen='menu';render()" class="mt-6 text-slate-400 underline">יציאה לתפריט</button>
        </div>`;
}

function handleKey(k) {
    const q = state.wordQuest; if(q.isGameOver) return;
    if (k === 'Enter' && q.currentGuess.length === q.target.length) {
        if(q.currentGuess === q.target) q.correctCount++;
        q.guesses.push(q.currentGuess);
        if(q.currentGuess === q.target || q.guesses.length >= 6) {
            setTimeout(() => { if(state.wordQuest.wordIndex < state.words.length - 1) { state.wordQuest.wordIndex++; startWQ(); } else { q.isGameOver = true; render(); } }, 1000);
        }
        q.currentGuess = '';
    } else if (k === 'Backspace') q.currentGuess = q.currentGuess.slice(0,-1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k;
    render();
}

function initMemGame() {
    let cards = [];
    state.words.forEach((w, i) => {
        cards.push({ id: i, text: w.eng, match: false });
        cards.push({ id: i, text: w.heb, match: false });
    });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false };
    state.screen = 'memory'; render();
}

function renderMem(container) {
    const g = state.memoryGame;
    container.innerHTML = `
        <div class="grid grid-cols-4 gap-2 mb-4">
            ${g.cards.map((c, i) => `
                <div class="card-container aspect-square w-full" onclick="flipMem(${i})">
                    <div class="card-inner ${g.flipped.includes(i) || c.match ? 'is-flipped' : ''}">
                        <div class="card-face bg-blue-600 text-white flex items-center justify-center text-2xl">?</div>
                        <div class="card-face card-back bg-white border-2 border-blue-600 flex items-center justify-center">
                            <span class="mem-card-text text-black">${c.text}</span>
                        </div>
                    </div>
                </div>`).join('')}
        </div>
        <div class="text-center font-bold">מהלכים: ${g.steps}</div>
        <button onclick="state.screen='menu';render()" class="mt-4 text-slate-400 block mx-auto underline">יציאה</button>
    `;
}

function flipMem(i) {
    const g = state.memoryGame; if(g.isProcessing || g.flipped.includes(i) || g.cards[i].match) return;
    g.flipped.push(i); render();
    if(g.flipped.length === 2) {
        g.isProcessing = true; g.steps++;
        if(g.cards[g.flipped[0]].id === g.cards[g.flipped[1]].id) {
            g.cards[g.flipped[0]].match = g.cards[g.flipped[1]].match = true;
            g.pairs++; g.flipped = []; g.isProcessing = false;
            if(g.pairs === state.words.length) { alert(`כל הכבוד! סיימת ב-${g.steps} מהלכים.`); state.screen = 'menu'; }
            render();
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

// --- לוגיקה עזר ---
function openShare(isResult) {
    const link = getFullLink();
    const msg = isResult ? `הצלחתי! קיבלתי ${state.lastScore}% ביחידה "${state.listName}"! נסו גם: ${link}` : `הכנתי רשימת מילים חדשה: "${state.listName}". בואו ללמוד: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

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
    return `<div class="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"><div class="bg-white p-6 rounded-2xl w-full max-w-sm text-center">
        <div class="text-3xl font-bold mb-6 text-black">${state.connect4.q.eng}</div>
        <div class="grid gap-3">${state.connect4.q.choices.map(c => `<button onclick="ansC4('${c}')" class="p-4 border-2 rounded-xl font-bold text-black">${c}</button>`).join('')}</div>
    </div></div>`;
}
function ansC4(s) {
    state.connect4.isAnswering = false;
    if(s === state.connect4.q.heb) { state.connect4.canDrop=true; state.connect4.msg = "✅ נכון! בחר עמודה"; }
    else { state.connect4.msg = "❌ טעות! התור עובר"; state.connect4.turn=state.connect4.turn===1?2:1; if(state.gameMode==='pve'&&state.connect4.turn===2) setTimeout(moveAI, 600); }
    render();
}
function moveAI() {
    let v=[]; for(let c=0; c<7; c++) if(!state.connect4.board[0][c]) v.push(c);
    state.connect4.canDrop=true; dropToken(v[Math.floor(Math.random()*v.length)]);
}
function renderC4Win() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50"><div class="p-8 bg-white rounded-2xl text-center">
        <h2 class="text-3xl font-bold text-black">ניצחון! 🏆</h2>
        <button onclick="initConnect4()" class="bg-blue-600 text-white px-8 py-2 rounded-xl mt-4">שחק שוב</button>
    </div></div>`;
}
function renderC4Menu() {
    return `<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick="state.showC4Menu=false;render()">
        <div class="bg-white p-6 rounded-2xl space-y-4" onclick="event.stopPropagation()">
            <button onclick="state.gameMode='pve';initConnect4()" class="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">נגד המחשב</button>
            <button onclick="state.gameMode='pvp';initConnect4()" class="w-full bg-slate-100 p-4 rounded-xl font-bold text-black">שני שחקנים</button>
        </div></div>`;
}

// טעינה מהקישור
const urlParams = new URLSearchParams(window.location.search);
if(urlParams.has('v')) {
    try {
        state.listName = urlParams.get('listName');
        const decoded = decodeURIComponent(escape(atob(urlParams.get('v'))));
        state.words = decoded.split('|').map(x => { const [eng, heb] = x.split('-'); return { eng, heb }; });
        state.screen = 'flashcards';
    } catch(e) { console.error("Link error", e); }
}

window.onload = render;
