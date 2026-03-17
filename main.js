// --- הגדרות מערכת ---
let state = {
    screen: 'input', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null },
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
    
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 1.5rem; }
    .logo-group { display: flex; align-items: center; gap: 12px; }
    .site-logo { width: 35px; height: 35px; object-fit: contain; }
    .site-title { font-weight: 900; font-size: 1.3rem; }

    /* Dark Mode Overrides */
    body.dark textarea { background: #111 !important; color: #facc15 !important; border: 2px solid #333; }
    body.dark .bg-white { background: transparent !important; color: #facc15 !important; border: 1px solid #333 !important; }
    body.dark .wq-cell { background: rgba(255,255,255,0.05) !important; color: #facc15 !important; border-color: #facc15 !important; }

    .game-zone-title { font-size: 2.2rem; font-weight: 900; margin: 1rem 0; text-align: center; }

    /* 4 בשורה */
    .c4-board { background: #1e40af; border: 8px solid #1e3a8a; border-radius: 1rem; padding: 8px; display: grid; grid-template-rows: repeat(6, 1fr); gap: 6px; width: 310px; margin: 0 auto; aspect-ratio: 7/6; }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; }
    .token { width: 75%; height: 75%; border-radius: 50%; transition: 0.3s; }
    .c4-header-cell { font-weight: bold; font-size: 0.8rem; color: #64748b; }

    /* הקוד הסודי */
    .wq-main { flex: 1; display: flex; flex-direction: column; padding-bottom: 220px; }
    .keyboard-fixed { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px; z-index: 50; background: #e2e8f0; border-top: 2px solid #cbd5e1; }
    body.dark .keyboard-fixed { background: #111; border-top-color: #facc15; }
    .wq-grid { display: flex; flex-direction: column-reverse; gap: 8px; margin-top: 20px; }
    .wq-cell { width: 42px; height: 52px; border: 2px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 900; background: white; }
    .ltr { direction: ltr !important; }

    /* כרטיסיות */
    .card-container { perspective: 1000px; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: 0.6s; transform-style: preserve-3d; cursor: pointer; }
    .is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #e2e8f0; background: white; }
    .card-back { transform: rotateY(180deg); background: #2563eb; color: white; }
    body.dark .card-back { background: #facc15; color: #000; }
`;
document.head.appendChild(style);

function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

// פונקציית שיתוף משודרגת - שולחת את המילים עצמן בקישור
function generateShareLink() {
    const data = state.words.map(w => `${w.eng}-${w.heb}`).join('|');
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?listName=${encodeURIComponent(state.listName)}&data=${encodeURIComponent(data)}`;
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    
    const header = document.createElement('header');
    header.className = "site-header";
    header.innerHTML = `
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl bg-transparent border-none cursor-pointer">
            ${state.nightMode ? '☀️' : '🌙'}
        </button>
        <div class="logo-group">
            <span class="site-title ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">Word Adventure</span>
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
                    <div class="card-face">
                        <span class="text-4xl font-bold mb-2">${word.eng}</span>
                        <button onclick="event.stopPropagation(); speak('${word.eng}')" class="text-2xl">🔊</button>
                    </div>
                    <div class="card-face card-back text-3xl font-bold">${word.heb}</div>
                </div>
            </div>
            <div class="flex gap-4 w-full px-4">
                <button onclick="nextCard(false)" class="flex-1 bg-red-500 text-white py-4 rounded-xl font-bold">עוד לא</button>
                <button onclick="nextCard(true)" class="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold">יודע!</button>
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
        <div class="text-center space-y-8 py-4">
            <h2 class="text-xl font-bold text-blue-500">אתגר המילים</h2>
            <div class="flex items-center justify-center gap-4">
                <div class="text-4xl font-black">${q.eng}</div>
                <button onclick="speak('${q.eng}')" class="text-2xl">🔊</button>
            </div>
            <div class="grid gap-4 px-4">${choices.map(c => `<button onclick="checkQ('${c}','${q.heb}',this)" class="p-4 border-2 rounded-xl text-lg font-bold bg-white transition-all shadow-sm">${c}</button>`).join('')}</div>
        </div>
    `;
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
                <div class="grid gap-3 mt-8">
                    <button onclick="openShareUI()" class="bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                        <span>שתפו הצלחה</span> <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="20">
                    </button>
                    <button onclick="state.screen='flashcards'; learningState.knownWords=[]; render();" class="bg-slate-200 py-4 rounded-xl font-bold text-black">תרגול חוזר</button>
                    <button onclick="state.screen='menu'; render();" class="bg-blue-600 text-white py-4 rounded-xl font-bold text-lg">למתחם המשחקים 🎮</button>
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
             <button onclick="openShareList()" class="text-green-600 font-bold">שיתוף רשימה 🔗</button>
        </div>
        <h1 class="game-zone-title italic">GAME ZONE</h1>
        <div class="grid gap-4">
            <button onclick="${locked ? '' : 'state.showC4Menu=true; render()'}" class="p-5 bg-white rounded-2xl shadow-lg border-2 flex justify-between items-center px-8 ${locked ? 'opacity-40' : ''}">
                <div class="flex gap-2"><div class="w-5 h-5 rounded-full bg-red-500"></div><div class="w-5 h-5 rounded-full bg-yellow-400"></div></div>
                <span class="text-xl font-black">4 בשורה</span>
            </button>
            <button onclick="${locked ? '' : 'startWQ()'}" class="p-5 bg-white rounded-2xl shadow-lg border-2 flex justify-center gap-4 ${locked ? 'opacity-40' : ''}">
                <span class="text-xl font-black">הקוד הסודי</span> 🔍
            </button>
            <button onclick="${locked ? '' : 'initMemGame()'}" class="p-5 bg-white rounded-2xl shadow-lg border-2 flex justify-center gap-4 ${locked ? 'opacity-40' : ''}">
                <span class="text-xl font-black">משחק הזיכרון</span> 🧠
            </button>
        </div>
        ${locked ? `<div class="mt-8 p-6 bg-red-50 rounded-2xl text-center border-2 border-red-200">
            <p class="text-red-600 font-bold text-lg">המשחקים נעולים! 🔒</p>
            <p class="text-sm text-red-500 mb-4">עליך להשיג לפחות 70% בבוחן כדי לשחק.</p>
            <button onclick="state.screen='flashcards'; learningState.knownWords=[]; render();" class="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">חזרה לתרגול</button>
        </div>` : ''}
        ${state.showC4Menu ? renderC4Menu() : ''}
    `;
}

// --- 4 בשורה ---
function initConnect4() {
    state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null };
    state.screen = 'connect4'; state.showC4Menu = false; render();
}

function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="flex flex-col items-center gap-4">
            <div class="w-full flex justify-between items-center max-w-[310px] font-bold">
                <button onclick="prepC4Q()" class="bg-blue-600 text-white px-4 py-2 rounded-lg shadow">קבל שאלה ❓</button>
                <div class="flex items-center gap-2">תור: <div class="w-6 h-6 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'}"></div></div>
            </div>
            <div class="grid grid-cols-7 w-[310px] text-center mb-1">
                ${[1,2,3,4,5,6,7].map(n => `<div class="c4-header-cell">${n}<br>▼</div>`).join('')}
            </div>
            <div class="c4-board">
                ${g.board.map((row, r) => `
                    ${row.map((cell, c) => `
                        <div onclick="dropToken(${c})" class="c4-cell">
                            ${cell ? `<div class="token ${cell===1?'bg-red-500':'bg-yellow-400'}"></div>` : ''}
                        </div>
                    `).join('')}
                `).join('')}
            </div>
            <button onclick="state.screen='menu'; render()" class="bg-slate-200 px-6 py-2 rounded-xl font-bold text-black mt-2">יציאה לתפריט</button>
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
            else { g.turn = g.turn === 1 ? 2 : 1; g.canDrop = false; if(state.gameMode==='pve' && g.turn === 2) setTimeout(moveAI, 600); }
            render(); return;
        }
    }
}

// --- הקוד הסודי (WordQuest) ---
function startWQ() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWQ(container) {
    const q = state.wordQuest;
    container.innerHTML = `
        <div class="wq-main">
            <div class="flex justify-between items-center px-4 py-2">
                <button onclick="state.screen='menu'; render()" class="text-slate-500 font-bold">✖ יציאה</button>
                <div class="text-sm font-bold">מילה ${q.wordIndex + 1} מתוך ${state.words.length}</div>
            </div>
            <div class="text-center py-2 space-y-2">
                <div class="flex items-center justify-center gap-3">
                    <span class="text-blue-500 font-bold text-2xl">רמז: ${q.heb}</span>
                    <button onclick="speak('${q.target}')" class="text-2xl bg-white border rounded-full p-2 shadow-sm">🔊</button>
                </div>
                <div class="text-slate-400 text-sm">ניסיון ${q.guesses.length + 1} מתוך 6</div>
            </div>
            <div class="wq-grid px-4">
                ${!q.isGameOver ? `<div class="flex justify-center gap-2 ltr">${Array(q.target.length).fill('').map((_,i) => `<div class="wq-cell shadow-sm">${q.currentGuess[i]||''}</div>`).join('')}</div>` : ''}
                ${q.guesses.map(g => `<div class="flex justify-center gap-2 ltr">${g.split('').map((l,i) => {
                    let color = q.target[i]===l ? 'bg-yellow-400' : (q.target.includes(l) ? 'bg-blue-400' : 'bg-slate-300');
                    return `<div class="wq-cell text-white border-none ${color}">${l}</div>`
                }).join('')}</div>`).join('')}
            </div>
            <div class="keyboard-fixed ltr">
                ${['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(row => `<div class="flex justify-center gap-1 mb-1">${row.split('').map(l => `<button onclick="handleKey('${l}')" class="key-btn flex-1 py-4 bg-white rounded-lg font-bold shadow-sm text-black border">${l}</button>`).join('')}</div>`).join('')}
                <div class="flex gap-1">
                    <button onclick="handleKey('Backspace')" class="flex-1 py-4 bg-slate-400 text-white rounded-lg font-bold">⌫ מחיקה</button>
                    <button onclick="handleKey('Enter')" class="flex-[1.5] py-4 bg-blue-600 text-white rounded-lg font-bold">ENTER אנטר</button>
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
            setTimeout(() => {
                if(state.wordQuest.wordIndex < state.words.length - 1) {
                    state.wordQuest.wordIndex++; startWQ();
                } else { q.isGameOver = true; render(); }
            }, 1000);
        }
        q.currentGuess = '';
    } else if (k === 'Backspace') q.currentGuess = q.currentGuess.slice(0,-1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k;
    render();
}

function renderWQSummary() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
        <div class="p-10 rounded-3xl text-center border-4 ${state.nightMode ? 'border-yellow-400' : 'bg-white border-blue-500'}">
            <h2 class="text-3xl font-bold mb-4">הקוד פוצח! 🕵️‍♂️</h2>
            <p class="text-xl">הצלחת ב-${state.wordQuest.correctCount} מילים מתוך ${state.words.length}</p>
            <button onclick="state.screen='menu'; state.wordQuest.wordIndex=0; state.wordQuest.correctCount=0; render()" class="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold mt-6 w-full">חזרה לתפריט</button>
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
        <div class="text-center mb-4 flex justify-between items-center px-4">
            <span class="font-bold">צעדים: ${g.steps}</span>
            <span class="font-bold">זוגות: ${g.pairs}/${state.words.length}</span>
        </div>
        <div class="grid grid-cols-4 gap-2">
            ${g.cards.map((c, i) => `
                <div class="card-container aspect-square" onclick="flipMem(${i})">
                    <div class="card-inner ${g.flipped.includes(i) || c.match ? 'is-flipped' : ''}">
                        <div class="card-face bg-blue-600 text-white text-xl font-bold border-none">?</div>
                        <div class="card-face card-back bg-white border-2 border-blue-600 text-[10px] font-bold text-black p-1 text-center">${c.text}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        <button onclick="state.screen='menu'; render()" class="bg-slate-200 px-6 py-2 rounded-xl font-bold text-black mt-8 w-full">יציאה</button>
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
            if(g.pairs === state.words.length) g.isGameOver = true;
            render();
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function renderMemSummary() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
        <div class="p-10 rounded-3xl text-center border-4 ${state.nightMode ? 'border-yellow-400' : 'bg-white border-blue-500'}">
            <h2 class="text-3xl font-bold mb-4">איזה זיכרון! 🧠</h2>
            <p>סיימת ב-${state.memoryGame.steps} מהלכים.</p>
            <p class="text-sm mt-2 text-blue-400">חושב שתצליח בפחות? נסה שוב!</p>
            <button onclick="initMemGame()" class="bg-green-600 text-white px-8 py-3 rounded-xl font-bold mt-6 w-full italic">אתגר מחדש!</button>
            <button onclick="state.screen='menu'; render()" class="text-slate-400 mt-4 block w-full text-center">חזרה לתפריט</button>
        </div>
    </div>`;
}

// --- שיתופים ---
function openShareUI() {
    const link = generateShareLink();
    const msg = `הצלחתי! קיבלתי ${state.lastScore}% ביחידה "${state.listName}" ב-Word Academy!\nרוצים לנסות גם? לחצו כאן:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

function openShareList() {
    const link = generateShareLink();
    const msg = `הכנתי רשימת מילים חדשה לתרגול: "${state.listName}"\nבואו ללמוד איתי:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

// --- לוגיקת עזר 4 בשורה ---
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
        <div class="bg-white p-6 rounded-2xl w-full max-w-sm text-center shadow-xl">
            <div class="text-3xl font-bold mb-6 text-black">${state.connect4.q.eng}</div>
            <div class="grid gap-3">${state.connect4.q.choices.map(c => `<button onclick="ansC4('${c}')" class="p-4 border-2 rounded-xl font-bold text-black hover:bg-blue-50">${c}</button>`).join('')}</div>
        </div>
    </div>`;
}
function ansC4(s) {
    if(s === state.connect4.q.heb) { state.connect4.canDrop=true; state.connect4.isAnswering=false; alert("נכון! עכשיו בחר עמודה"); }
    else { alert("טעות! התור עובר"); state.connect4.turn=state.connect4.turn===1?2:1; state.connect4.isAnswering=false; if(state.gameMode==='pve'&&state.connect4.turn===2) setTimeout(moveAI, 600); }
    render();
}
function moveAI() {
    const g = state.connect4; let v=[]; for(let c=0; c<7; c++) { let free=false; for(let r=0; r<6; r++) if(!g.board[r][c]) free=true; if(free) v.push(c); }
    let choice = v[Math.floor(Math.random()*v.length)]; g.canDrop=true; dropToken(choice);
}
function renderC4Win() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
        <div class="p-10 rounded-3xl text-center border-4 ${state.connect4.winner===1?'border-red-500':'border-yellow-400'} bg-white">
            <h2 class="text-3xl font-bold mb-2 text-black">ניצחון! 🎉</h2>
            <p class="text-black">השחקן ה${state.connect4.winner===1?'אדום':'צהוב'} ניצח!</p>
            <button onclick="initConnect4()" class="bg-blue-600 text-white px-8 py-2 rounded-xl mt-4 font-bold">משחק חדש</button>
        </div>
    </div>`;
}
function renderC4Menu() {
    return `<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick="state.showC4Menu=false; render()">
        <div class="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl" onclick="event.stopPropagation()">
            <button onclick="state.gameMode='pve'; initConnect4();" class="bg-blue-600 text-white p-5 rounded-2xl font-bold w-full text-xl shadow-lg">שחקן נגד מחשב 🤖</button>
            <button onclick="state.gameMode='pvp'; initConnect4();" class="p-5 bg-slate-100 rounded-2xl font-bold w-full text-black border-2 border-slate-200">שחקן נגד שחקן 👥</button>
        </div>
    </div>`;
}

// טעינת רשימה מקישור אם קיים
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if(params.has('data')) {
        state.listName = params.get('listName');
        const rawData = params.get('data').split('|');
        state.words = rawData.map(item => {
            const [eng, heb] = item.split('-');
            return { eng, heb };
        });
        state.screen = 'flashcards';
    }
}

window.onload = () => { checkUrlParams(); render(); };
