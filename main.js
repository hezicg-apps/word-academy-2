// --- הגדרות מערכת ---
let state = {
    screen: 'welcome', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, correctCount: 0, attempts: 5 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false }
};

let learningState = { currentIndex: 0, knownWords: [] };

// --- הזרקת CSS דינמית ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; min-height: 100vh; display: flex; flex-direction: column; }
    body.dark { background: #000; color: #facc15; }
    
    /* דף הבית במצב לילה */
    body.dark .welcome-box { background: transparent !important; border: 2px solid #facc15; color: #facc15 !important; }
    body.dark .welcome-box h1, body.dark .welcome-box p { color: #facc15 !important; }

    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; max-width: 600px; margin: 0 auto; w-full; }
    .logo-group { display: flex; align-items: center; gap: 8px; }
    .site-logo { width: 32px; height: 32px; }

    /* כפתורי תפריט */
    .game-btn { 
        width: 100%; padding: 1.2rem; background: transparent; 
        border: 2px solid #2563eb; border-radius: 1.5rem; 
        display: flex; justify-content: center; align-items: center; 
        font-size: 1.3rem; font-weight: 800; color: #2563eb; margin-bottom: 12px;
    }
    body.dark .game-btn { border-color: #facc15; color: #facc15; }

    /* 4 בשורה - לוח מוקטן ויציב */
    .c4-board { 
        background: #1e40af; border: 6px solid #1e3a8a; border-radius: 1rem; 
        padding: 6px; display: grid; grid-template-rows: repeat(6, 1fr); gap: 4px; 
        width: 280px; margin: 0 auto; aspect-ratio: 7/6; 
    }
    .c4-row { display: grid; grid-template-cols: repeat(7, 1fr); gap: 4px; }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
    .token { width: 85%; height: 85%; border-radius: 50%; }

    /* מקלדת קוד סודי - כיוון LTR */
    .keyboard-fixed { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px; background: #e2e8f0; direction: ltr; z-index: 100; }
    body.dark .keyboard-fixed { background: #1a1a1a; border-top: 1px solid #facc15; }
    .key-row { display: flex; justify-content: center; gap: 4px; margin-bottom: 4px; }
    .key { flex: 1; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; font-weight: 800; color: #000; cursor: pointer; }
    .key-enter { background: #22c55e; color: white; flex: 2; }
    .key-del { background: #94a3b8; color: white; flex: 2; }

    /* משחק הזיכרון */
    .mem-text { font-size: 1.3rem; font-weight: 900; text-align: center; white-space: nowrap; }
    .card-container { perspective: 1000px; width: 100%; aspect-ratio: 1/1.2; cursor: pointer; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: 0.6s; transform-style: preserve-3d; }
    .is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 1rem; display: flex; align-items: center; justify-content: center; border: 2px solid #e2e8f0; background: white; color: #000; padding: 5px; }
    .card-back { transform: rotateY(180deg); background: #2563eb; color: white; }
    body.dark .card-back { background: #facc15; color: #000; }

    /* חיווי */
    .feedback-correct { background-color: #22c55e !important; color: white !important; }
    .feedback-wrong { background-color: #ef4444 !important; color: white !important; }
`;
document.head.appendChild(style);

// --- פונקציות עזר ---
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

function saveToLocal() {
    localStorage.setItem('wm_state', JSON.stringify({
        words: state.words, listName: state.listName, lastScore: state.lastScore, nightMode: state.nightMode
    }));
}

function getShareUrl() {
    const dataString = state.words.map(w => `${w.eng}-${w.heb}`).join('\n');
    const content = state.listName + '\n' + dataString;
    const encoded = btoa(unescape(encodeURIComponent(content))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${window.location.origin}${window.location.pathname}?w=${encoded}`;
}

function shareResult() {
    const url = getShareUrl();
    const text = `הצלחתי ביחידה "${state.listName}" בציון ${state.lastScore}%! ✨\nבואו לתרגל גם: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function processInput() {
    const val = document.getElementById('wordInput').value;
    const lines = val.split('\n');
    state.listName = lines[0] || 'אוצר מילים';
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { eng, heb };
    });
    if(state.words.length) { state.screen = 'flashcards'; saveToLocal(); render(); }
}

// --- ליבת הרינדור ---
function render() {
    const app = document.getElementById('app');
    if(!app) return;
    app.innerHTML = '';
    
    // כותרת
    const header = document.createElement('header');
    header.className = "site-header w-full flex justify-between items-center p-4 max-w-2xl mx-auto";
    header.innerHTML = `
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl bg-transparent border-none">
            ${state.nightMode ? '☀️' : '🌙'}
        </button>
        <div class="logo-group flex items-center gap-2">
            <span class="site-title font-black text-xl ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">Word Academy</span>
            <img src="logo.svg" alt="logo" class="w-8 h-8" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3898/3898082.png'">
        </div>
    `;
    app.appendChild(header);

    const main = document.createElement('main');
    main.className = "p-4 flex-1 flex flex-col items-center w-full max-w-2xl mx-auto";
    app.appendChild(main);

    const screens = { 
        welcome: renderWelcome, input: renderInput, flashcards: renderCards, 
        quiz: renderQuiz, report: renderReport, menu: renderMenu, 
        connect4: renderC4, wordquest: renderWQ, memory: renderMem 
    };
    (screens[state.screen] || renderWelcome)(main);
}

function renderWelcome(container) {
    container.innerHTML = `
        <div class="text-center space-y-8 mt-10 welcome-box p-8 rounded-3xl w-full">
            <h1 class="text-5xl font-black">היי! מוכנים?</h1>
            <p class="text-xl font-bold">הדרך הכי כיפית לתרגל אנגלית</p>
            <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-12 py-5 rounded-full text-2xl font-black shadow-xl">בואו נתחיל! 🚀</button>
        </div>`;
}

function renderInput(container) {
    container.innerHTML = `
        <div class="w-full space-y-4 text-center">
            <h2 class="text-2xl font-black">הזינו מילים (מילה - תרגום)</h2>
            <textarea id="wordInput" class="w-full h-64 p-6 rounded-3xl border-4 border-blue-200 text-right bg-white text-black font-bold text-xl" placeholder="שם היחידה\napple - תפוח\nbanana - בננה"></textarea>
            <button onclick="processInput()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full shadow-lg">מתחילים ללמוד ✨</button>
        </div>`;
}

function renderCards(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center space-y-8 w-full">
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

function renderQuiz(container) {
    const q = state.words[state.quizIndex];
    if (!q.options) {
        q.options = [q.heb, ...state.words.filter(w => w.heb !== q.heb).map(w => w.heb)].sort(() => 0.5 - Math.random()).slice(0, 4);
    }
    container.innerHTML = `
        <div class="text-center space-y-8 py-4 w-full">
            <h2 class="text-2xl font-black text-blue-500">בדיקת ידע</h2>
            <div class="flex items-center justify-center gap-4"><div class="text-5xl font-black">${q.eng}</div><button onclick="speak('${q.eng}')" class="text-3xl">🔊</button></div>
            <div class="grid gap-4 w-full">
                ${q.options.map(c => `<button onclick="checkQuizAnswer('${c}','${q.heb}',this)" class="quiz-opt p-5 border-2 rounded-2xl text-xl font-bold bg-white text-black shadow-sm">${c}</button>`).join('')}
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
        allBtns.forEach(b => { if(b.innerText === correct) b.classList.add("feedback-correct"); });
    }
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { 
            state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); 
            state.screen = 'report'; 
            saveToLocal(); 
            render(); 
        }
    }, 1200);
}

function renderReport(container) {
    container.innerHTML = `
        <div class="text-center py-6 space-y-6 w-full">
            <div class="p-8 rounded-[2.5rem] shadow-2xl border-4 ${state.nightMode ? 'border-yellow-400 bg-black' : 'bg-white border-blue-600'}">
                <h2 class="text-2xl font-black">הציון שלך:</h2>
                <div class="text-8xl font-black text-blue-600 my-4">${state.lastScore}%</div>
                <div class="grid gap-3 mt-8">
                    <button onclick="shareResult()" class="bg-green-600 text-white py-4 rounded-xl font-black text-lg shadow-lg">שתפו הצלחה בוואטסאפ ✅</button>
                    <button onclick="state.screen='menu'; render();" class="bg-blue-600 text-white py-4 rounded-xl font-black text-xl shadow-lg">המשך למשחקים 🎮</button>
                    <button onclick="learningState.knownWords=[]; state.screen='flashcards'; render();" class="bg-slate-200 text-slate-700 py-3 rounded-xl font-bold">חזרה לתרגול לשיפור הציון</button>
                </div>
            </div>
        </div>`;
}

function renderMenu(container) {
    const locked = state.lastScore < 70;
    container.innerHTML = `
        <div class="w-full flex justify-between items-center mb-6 px-4">
            <button onclick="state.screen='input'; render();" class="p-3 bg-slate-100 rounded-full dark:bg-zinc-800" title="רשימה חדשה">📝</button>
            <h1 class="italic text-4xl font-black ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">GAME ZONE</h1>
            <button onclick="state.screen='welcome'; render();" class="p-3 bg-slate-100 rounded-full dark:bg-zinc-800" title="בית">🏠</button>
        </div>
        <div class="grid gap-2 w-full px-4">
            <button onclick="${locked ? '' : 'state.showC4Menu=true; render()'}" class="game-btn ${locked ? 'opacity-40' : ''}">🔴 4 בשורה</button>
            <button onclick="${locked ? '' : 'startWQ()'}" class="game-btn ${locked ? 'opacity-40' : ''}">🔍 הקוד הסודי</button>
            <button onclick="${locked ? '' : 'initMemGame()'}" class="game-btn ${locked ? 'opacity-40' : ''}">🧠 משחק הזיכרון</button>
        </div>
        ${locked ? `<div class="mt-6 text-center text-red-500 font-bold">המשחקים נעולים! השג 70% במבחן כדי לפתוח.</div>` : ''}
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
    const q = state.wordQuest; const len = q.target.length;
    container.innerHTML = `<div class="w-full pb-64">
        <div class="flex justify-between items-center px-4 mb-4">
            <button onclick="state.screen='menu'; render()" class="font-bold text-red-500">יציאה</button>
            <div class="text-xl font-black">ניסיון: ${q.guesses.length + 1}/5</div>
        </div>
        <div class="text-center mb-4"><div class="text-2xl font-bold">רמז: ${q.heb}</div></div>
        <div class="flex justify-center gap-2 mb-6 text-[11px] font-bold">
            <span class="px-2 py-1 bg-[#ffd700] rounded text-black">צהוב: בול</span>
            <span class="px-2 py-1 bg-[#c0c0c0] rounded text-black">אפור: קיים</span>
        </div>
        <div class="grid gap-2 px-4" style="direction: ltr; grid-template-columns: repeat(${len}, 45px); justify-content: center;">
            ${Array(5).fill(0).map((_, r) => {
                const g = q.guesses[r];
                return Array(len).fill(0).map((_, c) => {
                    let char = g ? g[c] : (r === q.guesses.length ? q.currentGuess[c] || '' : '');
                    let bg = 'bg-white border-2 border-slate-200';
                    if (g) {
                        if (q.target[c] === char) bg = 'bg-[#ffd700]';
                        else if (q.target.includes(char)) bg = 'bg-[#c0c0c0]';
                        else bg = 'bg-slate-200';
                    }
                    return `<div class="w-11 h-14 flex items-center justify-center rounded-lg text-2xl font-black ${bg}">${char}</div>`;
                }).join('');
            }).join('')}
        </div>
        <div class="keyboard-fixed">
            <div class="key-row">${'QWERTYUIOP'.split('').map(l => `<div class="key" onclick="handleKey('${l}')">${l}</div>`).join('')}</div>
            <div class="key-row">${'ASDFGHJKL'.split('').map(l => `<div class="key" onclick="handleKey('${l}')">${l}</div>`).join('')}</div>
            <div class="key-row">
                <div class="key key-enter" onclick="handleKey('Enter')">ENTER</div>
                ${'ZXCVBNM'.split('').map(l => `<div class="key" onclick="handleKey('${l}')">${l}</div>`).join('')}
                <div class="key key-del" onclick="handleKey('Backspace')">⌫</div>
            </div>
        </div>
    </div>`;
}

function handleKey(k) {
    const q = state.wordQuest; if(q.isGameOver) return;
    if (k === 'Enter' && q.currentGuess.length === q.target.length) {
        q.guesses.push(q.currentGuess);
        if(q.currentGuess === q.target || q.guesses.length >= 5) {
            if(state.wordQuest.wordIndex < state.words.length - 1) { state.wordQuest.wordIndex++; setTimeout(startWQ, 1000); }
            else { q.isGameOver = true; state.screen = 'menu'; }
        }
        q.currentGuess = '';
    } else if (k === 'Backspace') q.currentGuess = q.currentGuess.slice(0,-1);
    else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k;
    render();
}

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
        <div class="grid grid-cols-3 gap-3 px-2">
            ${g.cards.map((c, i) => `
                <div class="card-container" onclick="flipMem(${i})">
                    <div class="card-inner ${g.flipped.includes(i) || c.match ? 'is-flipped' : ''}">
                        <div class="card-face bg-blue-600 text-white text-4xl font-bold">?</div>
                        <div class="card-face card-back"><span class="mem-text text-black">${c.text}</span></div>
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
            speak(g.cards[a].type === 'eng' ? g.cards[a].text : g.cards[b].text);
            if(g.pairs === state.words.length) g.isGameOver = true; render();
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

function renderMemSummary() {
    return `<div class="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-[90] text-center">
        <div class="p-10 rounded-3xl border-4 border-yellow-400 bg-zinc-900">
            <h2 class="text-3xl font-black text-white">מעולה! 🧠</h2>
            <p class="text-yellow-400 mt-2 font-bold text-xl">פתרת ב-${state.memoryGame.steps} צעדים.</p>
            <button onclick="initMemGame()" class="bg-green-600 text-white px-8 py-3 rounded-xl mt-4 font-bold w-full">נסה שוב לשפר צעדים 🔄</button>
            <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white px-8 py-3 rounded-xl mt-2 font-bold w-full">חזרה לתפריט</button>
        </div>
    </div>`;
}

// --- משחק: 4 בשורה ---
function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `<div class="flex flex-col items-center gap-4 w-full px-2">
        <div class="w-full flex justify-between items-center max-w-[280px] font-bold">
            <button onclick="prepC4Q()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">שאלה לאסימון 🎲</button>
            <div class="flex items-center gap-2">תור: <div class="w-6 h-6 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'}"></div></div>
        </div>
        <div class="c4-board">${g.board.map((row) => `<div class="c4-row">${row.map((cell, c) => `<div onclick="dropToken(${c})" class="c4-cell">${cell ? `<div class="token ${cell===1?'bg-red-500':'bg-yellow-400'}"></div>` : ''}</div>`).join('')}</div>`).join('')}</div>
        <button onclick="state.screen='menu'; render()" class="text-slate-400 font-bold mt-4">יציאה</button>
    </div>${g.isAnswering ? renderC4Question() : ''}`;
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
    else { state.connect4.turn=state.connect4.turn===1?2:1; state.connect4.isAnswering=false; }
    render();
}

function dropToken(c) {
    const g = state.connect4; if (!g.canDrop) return;
    let targetRow = -1; for(let r=5; r>=0; r--) if(!g.board[r][c]) { targetRow = r; break; }
    if (targetRow === -1) return;
    g.canDrop = false; g.board[targetRow][c] = g.turn;
    g.turn = g.turn === 1 ? 2 : 1; render();
}

// --- טעינה ראשונית ---
window.onload = () => {
    const saved = localStorage.getItem('wm_state');
    if (saved) {
        const p = JSON.parse(saved);
        state.words = p.words; state.listName = p.listName; state.lastScore = p.lastScore; state.nightMode = p.nightMode;
        if(state.nightMode) document.body.classList.add('dark');
    }
    render();
};
