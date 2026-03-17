// --- הגדרות מערכת ---
let state = {
    screen: 'input', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null, animatingRow: -1, animatingCol: -1 },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, correctCount: 0, attempts: 0 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false }
};

let learningState = { currentIndex: 0, knownWords: [] };

// --- CSS ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; min-height: 100vh; display: flex; flex-direction: column; outline: none; }
    body.dark { background: #000; color: #facc15; }
    
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }
    .logo-group { display: flex; align-items: center; gap: 8px; }
    .site-logo { width: 32px; height: 32px; }
    .site-title { font-weight: 900; font-size: 1.3rem; }

    button, input, textarea { outline: none !important; -webkit-tap-highlight-color: transparent; }

    /* עיצוב כפתורי תפריט אחיד לפי הצילום */
    .game-btn { 
        width: 100%; padding: 1.2rem; background: transparent; 
        border: 2px solid #facc15; border-radius: 1rem; 
        display: flex; justify-content: center; align-items: center; 
        font-size: 1.3rem; font-weight: 800; color: #facc15; 
        cursor: pointer; position: relative; margin-bottom: 12px;
    }
    body:not(.dark) .game-btn { border-color: #2563eb; color: #2563eb; }
    .game-btn .icon { position: absolute; left: 20px; font-size: 1.5rem; }

    /* חיווי תשובות */
    .feedback-correct { background-color: #22c55e !important; color: white !important; border: none !important; }
    .feedback-wrong { background-color: #ef4444 !important; color: white !important; border: none !important; }

    /* 4 בשורה - לוח יציב */
    .c4-board { 
        background: #1e40af; border: 6px solid #1e3a8a; border-radius: 1rem; 
        padding: 6px; display: grid; grid-template-rows: repeat(6, 1fr); gap: 4px; 
        width: 280px; margin: 0 auto; aspect-ratio: 7/6; 
    }
    .c4-row { display: grid; grid-template-cols: repeat(7, 1fr); gap: 4px; }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .token { width: 85%; height: 85%; border-radius: 50%; box-shadow: inset 0 -3px rgba(0,0,0,0.2); }
    .bg-red { background: #ef4444; }
    .bg-yellow { background: #facc15; }

    /* מקלדת קוד סודי - גובה אחיד */
    .keyboard-fixed { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px; z-index: 50; background: #e2e8f0; border-top: 2px solid #cbd5e1; }
    body.dark .keyboard-fixed { background: #111; border-top-color: #facc15; }
    .key-row { display: flex; justify-content: center; gap: 4px; margin-bottom: 4px; }
    .key { flex: 1; height: 55px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; font-weight: 800; color: #000; border: 1px solid #ccc; font-size: 1.1rem; }
    .key-wide { flex: 1.5; background: #2563eb; color: white; border: none; }
    .key-delete { background: #94a3b8; color: white; border: none; }

    /* כרטיסיות */
    .card-container { perspective: 1000px; width: 280px; height: 350px; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: 0.6s; transform-style: preserve-3d; cursor: pointer; }
    .is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #e2e8f0; background: white; color: #000; }
    body.dark .card-face { background: #111; color: #facc15; border-color: #facc15; }
    .card-back { transform: rotateY(180deg); background: #2563eb; color: white; }
    body.dark .card-back { background: #facc15; color: #000; }
`;
document.head.appendChild(style);

// --- עזרים וניהול נתונים ---
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

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

// --- רינדור ראשי ---
function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const header = document.createElement('header');
    header.className = "site-header";
    header.innerHTML = `
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl bg-transparent border-none">
            ${state.nightMode ? '☀️' : '🌙'}
        </button>
        <div class="logo-group">
            <span class="site-title ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">Word Academy</span>
            <img src="logo.svg" alt="logo" class="site-logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3898/3898082.png'">
        </div>
    `;
    app.appendChild(header);
    const content = document.createElement('main');
    content.className = "p-4 flex-1 flex flex-col max-w-2xl mx-auto w-full";
    app.appendChild(content);

    const screens = { 
        input: renderInput, flashcards: renderCards, quiz: renderQuiz, 
        report: renderReport, menu: renderMenu, connect4: renderC4, 
        wordquest: renderWQ, memory: renderMem 
    };
    (screens[state.screen] || renderInput)(content);
}

function renderInput(container) {
    container.innerHTML = `<div class="py-6 space-y-6 text-center">
        <h2 class="text-3xl font-bold">הזנת מילים</h2>
        <textarea id="wordInput" class="w-full h-48 p-4 border-2 rounded-2xl text-right bg-white font-bold" placeholder="שם היחידה\nEnglish - עברית"></textarea>
        <button onclick="saveList()" class="bg-blue-600 text-white p-5 rounded-xl font-bold w-full shadow-lg text-xl">מתחילים ללמוד 🚀</button>
    </div>`;
}

function renderCards(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `<div class="flex-1 flex flex-col items-center justify-center space-y-8">
        <div class="card-container" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
            <div class="card-inner">
                <div class="card-face"><span class="text-5xl font-black mb-4">${word.eng}</span><button onclick="event.stopPropagation(); speak('${word.eng}')" class="text-3xl">🔊</button></div>
                <div class="card-face card-back text-4xl font-black">${word.heb}</div>
            </div>
        </div>
        <div class="flex gap-4 w-full px-4">
            <button onclick="nextCard(false)" class="flex-1 bg-red-500 text-white py-5 rounded-2xl font-black text-xl shadow-md">עוד לא</button>
            <button onclick="nextCard(true)" class="flex-1 bg-green-500 text-white py-5 rounded-2xl font-black text-xl shadow-md">יודע!</button>
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
    if (!q.options) {
        q.options = [q.heb, ...state.words.filter(w => w.heb !== q.heb).map(w => w.heb)].sort(() => 0.5 - Math.random()).slice(0, 4);
    }
    container.innerHTML = `<div class="text-center space-y-8 py-4 w-full">
        <h2 class="text-2xl font-black text-blue-500">בדיקת ידע</h2>
        <div class="flex items-center justify-center gap-4"><div class="text-5xl font-black">${q.eng}</div><button onclick="speak('${q.eng}')" class="text-3xl">🔊</button></div>
        <div class="grid gap-4 w-full" id="quizOptions">
            ${q.options.map(c => `<button onclick="checkQuizAnswer('${c}','${q.heb}',this)" class="quiz-opt p-5 border-2 rounded-2xl text-xl font-bold bg-white text-black transition-all shadow-sm">${c}</button>`).join('')}
        </div>
    </div>`;
}

function checkQuizAnswer(selected, correct, btn) {
    const allBtns = document.querySelectorAll('.quiz-opt');
    if (selected === correct) {
        state.correctAnswers++;
        btn.classList.add("feedback-correct");
    } else {
        btn.classList.add("feedback-wrong");
        // חיווי מה היתה התשובה הנכונה
        allBtns.forEach(b => { if(b.innerText === correct) b.classList.add("feedback-correct"); });
    }
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; render(); }
    }, 1200);
}

function renderReport(container) {
    container.innerHTML = `<div class="text-center py-6 space-y-6 w-full animate-fade-in">
        <div class="p-10 rounded-[2.5rem] shadow-2xl border-4 ${state.nightMode ? 'border-yellow-400 bg-black' : 'bg-white border-blue-500'}">
            <h2 class="text-2xl font-black">הציון שלך:</h2><div class="text-8xl font-black text-blue-600 my-4">${state.lastScore}%</div>
            <div class="grid gap-4 mt-8">
                <button onclick="openShareUI()" class="bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg">שתפו הצלחה בוואטסאפ ✅</button>
                <button onclick="state.screen='menu'; render();" class="bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg">למתחם המשחקים 🎮</button>
                <button onclick="learningState.knownWords=[]; state.screen='flashcards'; render();" class="text-blue-500 font-bold underline">חזרה לתרגול לשיפור הציון</button>
            </div>
        </div>
    </div>`;
}

// --- תפריט משחקים ---
function renderMenu(container) {
    const locked = state.lastScore < 70;
    container.innerHTML = `
        <div class="w-full flex justify-between items-center mb-6 px-4">
            <button onclick="state.screen='input'; render();" class="p-2 bg-slate-100 rounded-full dark:bg-zinc-800" title="רשימה חדשה">📝</button>
            <h1 class="italic text-4xl font-black ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">GAME ZONE</h1>
            <button onclick="state.screen='welcome'; render();" class="p-2 bg-slate-100 rounded-full dark:bg-zinc-800" title="בית">🏠</button>
        </div>
        
        <div class="grid gap-2 w-full px-4">
            <button onclick="${locked ? '' : 'state.showC4Menu=true; render()'}" class="game-btn ${locked ? 'opacity-40' : ''}">
                <span class="icon">🔴</span> 4 בשורה
            </button>
            <button onclick="${locked ? '' : 'startWQ()'}" class="game-btn ${locked ? 'opacity-40' : ''}">
                <span class="icon">🔍</span> הקוד הסודי
            </button>
            <button onclick="${locked ? '' : 'initMemGame()'}" class="game-btn ${locked ? 'opacity-40' : ''}">
                <span class="icon">🧠</span> משחק הזיכרון
            </button>
        </div>
        ${locked ? `<div class="mt-6 text-center"><p class="text-red-600 font-bold">המשחקים נעולים! השג 70% במבחן כדי לפתוח.</p></div>` : ''}
        ${state.showC4Menu ? renderC4Menu() : ''}
    `;
}

// --- משחק: הקוד הסודי (WordQuest) ---
function startWQ() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false, attempts: 0 };
    state.screen = 'wordquest'; render();
}

function renderWQ(container) {
    const q = state.wordQuest;
    container.innerHTML = `<div class="w-full pb-60">
        <div class="flex justify-between items-center px-4 mb-4">
            <button onclick="state.screen='menu'; render()" class="font-bold text-red-500">יציאה</button>
            <div class="text-xl font-black">ניסיון: ${q.guesses.length + 1} מתוך 5</div>
        </div>
        <div class="text-center mb-6"><div class="text-2xl font-bold">רמז: ${q.heb}</div></div>
        <div class="wq-grid space-y-2 px-4 ltr">
            ${q.guesses.map(g => `<div class="flex justify-center gap-2">${g.split('').map((l,i) => {
                let cls = q.target[i]===l ? 'feedback-correct' : (q.target.includes(l) ? 'bg-slate-400' : 'bg-zinc-200');
                return `<div class="w-12 h-14 flex items-center justify-center rounded-lg text-2xl font-black text-white ${cls}">${l}</div>`
            }).join('')}</div>`).join('')}
            ${!q.isGameOver ? `<div class="flex justify-center gap-2">${Array(q.target.length).fill('').map((_,i) => `<div class="w-12 h-14 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-300 text-2xl font-black text-black dark:text-yellow-400">${q.currentGuess[i]||''}</div>`).join('')}</div>` : ''}
        </div>
        <div class="keyboard-fixed ltr">
            <div class="key-row">${'QWERTYUIOP'.split('').map(l => `<div class="key" onclick="handleKey('${l}')">${l}</div>`).join('')}</div>
            <div class="key-row">${'ASDFGHJKL'.split('').map(l => `<div class="key" onclick="handleKey('${l}')">${l}</div>`).join('')}</div>
            <div class="key-row">
                <div class="key key-wide" onclick="handleKey('Enter')">ENTER</div>
                ${'ZXCVBNM'.split('').map(l => `<div class="key" onclick="handleKey('${l}')">${l}</div>`).join('')}
                <div class="key key-delete" onclick="handleKey('Backspace')">⌫</div>
            </div>
        </div>
    </div>${q.isGameOver ? renderWQSummary() : ''}`;
}

function handleKey(k) {
    const q = state.wordQuest; if(q.isGameOver) return;
    if (k === 'Enter' && q.currentGuess.length === q.target.length) {
        if(q.currentGuess === q.target) q.correctCount++;
        q.guesses.push(q.currentGuess);
        if(q.currentGuess === q.target || q.guesses.length >= 5) {
            if(state.wordQuest.wordIndex < state.words.length - 1) { state.wordQuest.wordIndex++; setTimeout(startWQ, 1000); }
            else { q.isGameOver = true; render(); }
        }
        q.currentGuess = '';
    } else if (k === 'Backspace') q.currentGuess = q.currentGuess.slice(0,-1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k;
    render();
}

function renderWQSummary() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-[60] text-center">
        <div class="p-8 rounded-3xl border-4 border-yellow-400">
            <h2 class="text-3xl font-black text-white mb-4">הקוד פוצח! 🔍</h2>
            <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold">חזרה לתפריט</button>
        </div>
    </div>`;
}

// --- משחק: 4 בשורה ---
function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `<div class="flex flex-col items-center gap-4 w-full h-full">
        <div class="w-full flex justify-between items-center max-w-[280px] font-bold">
            <button onclick="prepC4Q()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">קבל שאלה</button>
            <div class="flex items-center gap-2">תור: <div class="w-6 h-6 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'}"></div></div>
        </div>
        <div class="c4-board">${g.board.map((row) => `<div class="c4-row">${row.map((cell, c) => `<div onclick="dropToken(${c})" class="c4-cell">${cell ? `<div class="token ${cell===1?'bg-red':'bg-yellow'}"></div>` : ''}</div>`).join('')}</div>`).join('')}</div>
        <button onclick="state.screen='menu'; render()" class="text-slate-400 font-bold mt-4">יציאה</button>
    </div>${g.isAnswering ? renderC4Question() : ''}${g.winner ? renderC4Win() : ''}`;
}

async function dropToken(c) {
    const g = state.connect4; if (!g.canDrop || g.winner) return;
    let targetRow = -1; for(let r=5; r>=0; r--) if(!g.board[r][c]) { targetRow = r; break; }
    if (targetRow === -1) return;
    g.canDrop = false; g.board[targetRow][c] = g.turn;
    if (checkC4Win(targetRow, c)) { g.winner = g.turn; }
    else { g.turn = g.turn === 1 ? 2 : 1; if(state.gameMode==='pve' && g.turn === 2) setTimeout(moveAI, 600); }
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
    state.connect4.q = { eng:q.eng, heb:q.heb, choices: [q.heb, ...state.words.filter(w=>w.heb!==q.heb).map(w=>w.heb)].sort(()=>0.5-Math.random()).slice(0,3) };
    state.connect4.isAnswering = true; render();
}

function renderC4Question() {
    return `<div class="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-[70] text-center"><div class="bg-white p-6 rounded-3xl w-full max-w-sm">
        <div class="text-3xl font-black mb-6 text-black">${state.connect4.q.eng}</div>
        <div class="grid gap-2">${state.connect4.q.choices.map(c => `<button onclick="ansC4('${c}')" class="p-4 border-2 rounded-xl font-bold text-black">${c}</button>`).join('')}</div>
    </div></div>`;
}

function ansC4(s) {
    if(s === state.connect4.q.heb) { state.connect4.canDrop=true; state.connect4.isAnswering=false; }
    else { state.connect4.turn=state.connect4.turn===1?2:1; state.connect4.isAnswering=false; if(state.gameMode==='pve'&&state.connect4.turn===2) setTimeout(moveAI, 500); }
    render();
}

function renderC4Win() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-[80] text-center">
        <div class="p-10 rounded-3xl border-4 border-white"><h2 class="text-4xl font-black text-white">יש מנצח! 🎉</h2>
        <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white px-8 py-2 rounded-xl mt-6">סיום</button></div>
    </div>`;
}

function renderC4Menu() {
    return `<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick="state.showC4Menu=false; render()"><div class="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4" onclick="event.stopPropagation()">
        <button onclick="state.gameMode='pve'; initC4();" class="bg-blue-600 text-white p-4 rounded-xl font-bold w-full text-xl">נגד המחשב 💻</button>
        <button onclick="state.gameMode='pvp'; initC4();" class="p-4 bg-slate-100 rounded-xl font-bold w-full text-black text-xl">זוגי (חבר לידך) 👥</button>
    </div></div>`;
}

function initC4() { state.connect4 = { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null }; state.screen = 'connect4'; state.showC4Menu = false; render(); }

// --- משחק: זיכרון ---
function initMemGame() {
    let cards = []; state.words.forEach((w, i) => { 
        cards.push({ id: i, text: w.eng, type: 'eng', match: false }); 
        cards.push({ id: i, text: w.heb, type: 'heb', match: false }); 
    });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false };
    state.screen = 'memory'; render();
}

function renderMem(container) {
    const g = state.memoryGame;
    container.innerHTML = `<div class="w-full">
        <div class="flex justify-between items-center px-4 mb-4 font-bold"><span>צעדים: ${g.steps}</span><button onclick="state.screen='menu'; render()" class="text-red-500">יציאה</button></div>
        <div class="grid grid-cols-3 gap-2 px-2">
            ${g.cards.map((c, i) => `
                <div class="card-container h-32 w-full" onclick="flipMem(${i})">
                    <div class="card-inner ${g.flipped.includes(i) || c.match ? 'is-flipped' : ''}">
                        <div class="card-face bg-blue-600 text-white text-3xl font-bold border-none">?</div>
                        <div class="card-face card-back text-center p-1 bg-white border-2 border-blue-600">
                            <span class="text-black font-black leading-tight overflow-hidden" style="font-size: calc(100% + 2vw); max-width: 100%;">${c.text}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>${g.isGameOver ? renderMemSummary() : ''}`;
}

function flipMem(i) {
    const g = state.memoryGame; if(g.isProcessing || g.flipped.includes(i) || g.cards[i].match) return;
    g.flipped.push(i); render();
    if(g.flipped.length === 2) {
        g.isProcessing = true; g.steps++; const [a, b] = g.flipped;
        if(g.cards[a].id === g.cards[b].id) {
            g.cards[a].match = true; g.cards[b].match = true; g.pairs++; g.flipped = []; g.isProcessing = false;
            speak(g.cards[a].type === 'eng' ? g.cards[a].text : g.cards[b].text); // הקראה
            if(g.pairs === state.words.length) g.isGameOver = true; render();
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function renderMemSummary() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-[90] text-center">
        <div class="p-10 rounded-3xl border-4 border-yellow-400"><h2 class="text-3xl font-black text-white">זיכרון מעולה! 🧠</h2>
        <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white px-8 py-3 rounded-xl mt-6 font-bold w-full">חזרה</button></div>
    </div>`;
}

function openShareUI() {
    const data = state.words.map(w => `${w.eng}-${w.heb}`).join('|');
    const link = `${window.location.origin}${window.location.pathname}?listName=${encodeURIComponent(state.listName)}&data=${encodeURIComponent(data)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent('הצלחתי ב-Word Academy! הנה הרשימה שלי: ' + link)}`);
}

window.onload = render;
