// --- הגדרות מערכת ועיצוב ---
let state = {
    screen: 'welcome', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, correctCount: 0, attempts: 5 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false }
};

let learningState = { currentIndex: 0, knownWords: [] };

const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700;800&display=swap');
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; min-height: 100vh; }
    body.dark { background: #000; color: #facc15; }
    
    /* דף הבית במצב לילה */
    body.dark .welcome-box { background: transparent !important; border: 2px solid #facc15; color: #facc15 !important; }
    body.dark .welcome-box h1, body.dark .welcome-box p { color: #facc15 !important; }

    /* הגבלת כרטיסיות במחשב */
    .card-container { width: 100%; max-width: 350px; height: 300px; perspective: 1000px; margin: 0 auto; cursor: pointer; }
    .card-inner { position: relative; width: 100%; height: 100%; transition: 0.6s; transform-style: preserve-3d; }
    .is-flipped { transform: rotateY(180deg); }
    .card-face { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid #3b82f6; background: white; color: #000; }
    body.dark .card-face { background: #111; border-color: #facc15; color: #facc15; }
    .card-back { transform: rotateY(180deg); background: #2563eb; color: white; }
    body.dark .card-back { background: #facc15; color: #000; }

    /* 4 בשורה מוקטן */
    .c4-board { background: #1e40af; border: 6px solid #1e3a8a; border-radius: 1rem; padding: 6px; display: grid; gap: 4px; width: 280px; margin: 0 auto; aspect-ratio: 7/6; }
    .c4-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
    .token { width: 85%; height: 85%; border-radius: 50%; }

    /* מקלדת LTR */
    .keyboard-fixed { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px; background: #cbd5e1; direction: ltr; z-index: 100; }
    body.dark .keyboard-fixed { background: #1a1a1a; border-top: 1px solid #facc15; }
    .key-row { display: flex; justify-content: center; gap: 4px; margin-bottom: 4px; }
    .key { flex: 1; height: 48px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; font-weight: 800; color: #000; cursor: pointer; }
    .key-enter { background: #22c55e; color: white; flex: 1.5; }
    .key-del { background: #94a3b8; color: white; flex: 1.5; }

    /* זיכרון - טקסט גדול */
    .mem-text { font-size: 1.4rem; font-weight: 900; text-align: center; white-space: nowrap; }

    .feedback-correct { background: #22c55e !important; color: white !important; }
    .feedback-wrong { background: #ef4444 !important; color: white !important; }
`;
document.head.appendChild(style);

function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }
function saveToLocal() { localStorage.setItem('wm_state_v2', JSON.stringify({ words: state.words, listName: state.listName, lastScore: state.lastScore, nightMode: state.nightMode })); }

function render() {
    const app = document.getElementById('app'); if(!app) return;
    app.innerHTML = '';
    const main = document.createElement('main');
    main.className = "p-4 flex-1 flex flex-col items-center w-full max-w-2xl mx-auto";
    
    // Header
    const header = document.createElement('div');
    header.className = "w-full flex justify-between items-center mb-4";
    header.innerHTML = `
        <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" class="text-3xl">${state.nightMode ? '☀️' : '🌙'}</button>
        <div class="flex items-center gap-2"><span class="font-black text-xl ${state.nightMode ? 'text-yellow-400' : 'text-blue-600'}">Word Academy</span></div>
    `;
    app.appendChild(header); app.appendChild(main);

    const screens = { welcome: renderWelcome, input: renderInput, flashcards: renderCards, quiz: renderQuiz, report: renderReport, menu: renderMenu, connect4: renderC4, wordquest: renderWQ, memory: renderMem };
    (screens[state.screen] || renderWelcome)(main);
}

function renderWelcome(c) {
    c.innerHTML = `<div class="text-center space-y-8 mt-10 welcome-box p-10 rounded-3xl w-full border-2 border-blue-100 bg-white">
        <h1 class="text-5xl font-black text-blue-600">היי! מוכנים?</h1>
        <p class="text-xl font-bold text-slate-600">בואו נתרגל אנגלית בכיף</p>
        <button onclick="state.screen='input'; render()" class="bg-blue-600 text-white px-12 py-5 rounded-full text-2xl font-black shadow-xl">מתחילים 🚀</button>
    </div>`;
}

function renderInput(c) {
    c.innerHTML = `<div class="w-full space-y-4 text-center">
        <textarea id="wordInput" class="w-full h-64 p-6 rounded-3xl border-4 border-blue-200 text-right font-bold text-xl text-black" placeholder="שם היחידה\napple - תפוח\nbanana - בננה"></textarea>
        <button onclick="processInput()" class="bg-blue-600 text-white px-8 py-5 rounded-full text-2xl font-black w-full">יצירת יחידה ✨</button>
    </div>`;
}

function processInput() {
    const lines = document.getElementById('wordInput').value.split('\n');
    state.listName = lines[0] || 'אוצר מילים';
    state.words = lines.slice(1).filter(l => l.includes('-')).map((l, i) => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { id: i, eng, heb, known: false };
    });
    if(state.words.length) { state.screen = 'flashcards'; learningState.currentIndex = 0; saveToLocal(); render(); }
}

function renderCards(c) {
    const unknown = state.words.filter(w => !w.known);
    if (!unknown.length) { state.screen = 'quiz'; state.quizIndex = 0; state.correctAnswers = 0; render(); return; }
    const word = unknown[0];
    c.innerHTML = `
        <div class="space-y-8 w-full">
            <div class="card-container" onclick="this.querySelector('.card-inner').classList.toggle('is-flipped')">
                <div class="card-inner">
                    <div class="card-face"><span class="text-5xl font-black mb-6">${word.eng}</span><button onclick="event.stopPropagation(); speak('${word.eng}')" class="text-4xl">🔊</button></div>
                    <div class="card-face card-back text-4xl font-black">${word.heb}</div>
                </div>
            </div>
            <div class="flex gap-4 w-full max-w-[350px] mx-auto">
                <button onclick="state.words.push(state.words.shift()); render();" class="flex-1 bg-red-500 text-white py-5 rounded-2xl font-black text-xl">עוד לא</button>
                <button onclick="state.words.find(w=>w.id===${word.id}).known=true; render();" class="flex-1 bg-green-500 text-white py-5 rounded-2xl font-black text-xl">יודע!</button>
            </div>
        </div>`;
}

function renderQuiz(c) {
    const q = state.words[state.quizIndex];
    if (!q.opts) q.opts = [q.heb, ...state.words.filter(w => w.heb !== q.heb).map(w => w.heb)].sort(() => 0.5 - Math.random()).slice(0, 4);
    c.innerHTML = `<div class="text-center space-y-8 w-full">
        <div class="text-5xl font-black">${q.eng}</div>
        <div class="grid gap-4 w-full">${q.opts.map(o => `<button onclick="checkQ('${o}','${q.heb}',this)" class="p-5 border-2 rounded-2xl text-xl font-bold bg-white text-black shadow-sm q-opt">${o}</button>`).join('')}</div>
    </div>`;
}

function checkQ(s, c, btn) {
    const opts = document.querySelectorAll('.q-opt');
    if (s === c) { state.correctAnswers++; btn.classList.add("feedback-correct"); }
    else { btn.classList.add("feedback-wrong"); opts.forEach(b => { if(b.innerText === c) b.classList.add("feedback-correct"); }); }
    setTimeout(() => { if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); } else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; saveToLocal(); render(); } }, 1200);
}

function renderReport(c) {
    c.innerHTML = `<div class="text-center p-10 rounded-[3rem] border-4 border-blue-600 bg-white w-full">
        <h2 class="text-2xl font-black text-black">הציון שלך:</h2>
        <div class="text-8xl font-black text-blue-600 my-4">${state.lastScore}%</div>
        <button onclick="const url=window.location.href; const msg=encodeURIComponent('הצלחתי ביחידה ${state.listName} בציון ${state.lastScore}%! ✨\\n'); window.open('https://api.whatsapp.com/send?text='+msg+url)" class="bg-green-600 text-white py-4 rounded-xl font-black w-full mb-3">שתפו הצלחה ✅</button>
        <button onclick="state.screen='menu'; render()" class="bg-blue-600 text-white py-4 rounded-xl font-black w-full text-xl">למשחקים 🎮</button>
    </div>`;
}

function renderMenu(c) {
    const locked = state.lastScore < 70;
    c.innerHTML = `<h1 class="text-4xl font-black mb-8 italic">GAME ZONE</h1>
        <div class="grid gap-4 w-full px-6">
            <button onclick="${locked?'':'state.screen=\'connect4\';render()'}" class="p-5 border-2 border-blue-500 rounded-2xl font-black text-xl text-blue-500 ${locked?'opacity-30':''}">🔴 4 בשורה</button>
            <button onclick="${locked?'':'startWQ()'}" class="p-5 border-2 border-blue-500 rounded-2xl font-black text-xl text-blue-500 ${locked?'opacity-30':''}">🔍 הקוד הסודי</button>
            <button onclick="${locked?'':'initMem()'}" class="p-5 border-2 border-blue-500 rounded-2xl font-black text-xl text-blue-500 ${locked?'opacity-30':''}">🧠 משחק הזיכרון</button>
        </div>`;
}

function startWQ() { const w = state.words[0]; state.wordQuest = { target: w.eng.toUpperCase(), heb: w.heb, guesses: [], currentGuess: '', isGameOver: false }; state.screen = 'wordquest'; render(); }
function renderWQ(c) {
    const q = state.wordQuest; const len = q.target.length;
    c.innerHTML = `<div class="w-full pb-64 text-center">
        <div class="text-2xl font-bold mb-2">רמז: ${q.heb}</div>
        <div class="flex justify-center gap-2 mb-4 text-[11px] font-bold"><span class="px-2 py-1 bg-[#ffd700] rounded">צהוב: בול</span><span class="px-2 py-1 bg-[#c0c0c0] rounded">אפור: קיים</span></div>
        <div class="grid gap-2" style="direction: ltr; grid-template-columns: repeat(${len}, 42px); justify-content: center;">
            ${Array(5).fill(0).map((_, r) => Array(len).fill(0).map((_, i) => {
                const g = q.guesses[r]; const char = g ? g[i] : (r === q.guesses.length ? q.currentGuess[i] || '' : '');
                let bg = 'bg-white border-2'; if(g) bg = q.target[i]===char ? 'bg-[#ffd700]' : (q.target.includes(char) ? 'bg-[#c0c0c0]' : 'bg-slate-200');
                return `<div class="w-10 h-12 flex items-center justify-center rounded text-xl font-black ${bg}">${char}</div>`;
            }).join('')).join('')}
        </div>
        <div class="keyboard-fixed">
            <div class="key-row">${'QWERTYUIOP'.split('').map(l => `<div class="key" onclick="handleK('${l}')">${l}</div>`).join('')}</div>
            <div class="key-row">${'ASDFGHJKL'.split('').map(l => `<div class="key" onclick="handleK('${l}')">${l}</div>`).join('')}</div>
            <div class="key-row"><div class="key key-enter" onclick="handleK('Enter')">ENTER</div>${'ZXCVBNM'.split('').map(l => `<div class="key" onclick="handleK('${l}')">${l}</div>`).join('')}<div class="key key-del" onclick="handleK('Backspace')">⌫</div></div>
        </div>
    </div>`;
}

function handleK(k) {
    const q = state.wordQuest; if(k === 'Enter' && q.currentGuess.length === q.target.length) { q.guesses.push(q.currentGuess); if(q.currentGuess === q.target || q.guesses.length >= 5) { state.screen = 'menu'; } q.currentGuess = ''; }
    else if(k === 'Backspace') q.currentGuess = q.currentGuess.slice(0, -1);
    else if(q.currentGuess.length < q.target.length && /^[A-Z]$/.test(k)) q.currentGuess += k; render();
}

function initMem() {
    let cards = []; state.words.forEach((w, i) => { cards.push({ id: i, text: w.eng, type: 'eng', match: false }, { id: i, text: w.heb, type: 'heb', match: false }); });
    state.memoryGame = { cards: cards.sort(() => 0.5 - Math.random()), flipped: [], pairs: 0, steps: 0, isProcessing: false }; state.screen = 'memory'; render();
}

function renderMem(c) {
    const g = state.memoryGame;
    c.innerHTML = `<div class="w-full text-center">
        <div class="mb-4 font-bold">צעדים: ${g.steps}</div>
        <div class="grid grid-cols-3 gap-3">
            ${g.cards.map((card, i) => `<div class="card-container" style="height:120px" onclick="flipM(${i})">
                <div class="card-inner ${g.flipped.includes(i) || card.match ? 'is-flipped' : ''}">
                    <div class="card-face bg-blue-600 text-white text-3xl">?</div>
                    <div class="card-face card-back"><span class="mem-text text-black">${card.text}</span></div>
                </div>
            </div>`).join('')}
        </div>
    </div>${g.pairs === state.words.length ? `<div class="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[200] text-white p-10"><h2>מעולה! פתרת ב-${g.steps} צעדים.</h2><button onclick="state.screen='menu';render()" class="bg-blue-600 p-4 rounded-xl mt-4">חזרה</button></div>` : ''}`;
}

function flipM(i) {
    const g = state.memoryGame; if(g.isProcessing || g.flipped.includes(i) || g.cards[i].match) return;
    g.flipped.push(i); render();
    if(g.flipped.length === 2) {
        g.isProcessing = true; g.steps++; const [a, b] = g.flipped;
        if(g.cards[a].id === g.cards[b].id) { g.cards[a].match = g.cards[b].match = true; g.pairs++; g.flipped = []; g.isProcessing = false; speak(g.cards[a].type==='eng'?g.cards[a].text:g.cards[b].text); render(); }
        else setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000);
    }
}

function renderC4(c) {
    const g = state.connect4;
    c.innerHTML = `<div class="flex flex-col items-center gap-4 w-full">
        <div class="flex justify-between w-[280px] font-bold"><button onclick="state.connect4.canDrop=true; render()" class="bg-blue-600 text-white px-3 py-1 rounded-lg">קבל אסימון</button><span>תור: ${g.turn===1?'אדום':'צהוב'}</span></div>
        <div class="c4-board">${g.board.map((row) => `<div class="c4-row">${row.map((cell, col) => `<div onclick="dropC4(${col})" class="c4-cell">${cell ? `<div class="token ${cell===1?'bg-red-500':'bg-yellow-400'}"></div>` : ''}</div>`).join('')}</div>`).join('')}</div>
        <button onclick="state.screen='menu'; render()" class="text-slate-400 mt-4">יציאה</button>
    </div>`;
}

function dropC4(c) {
    const g = state.connect4; if(!g.canDrop) return;
    for(let r=5; r>=0; r--) { if(!g.board[r][c]) { g.board[r][c]=g.turn; g.turn=g.turn===1?2:1; g.canDrop=false; render(); return; } }
}

window.onload = () => { const s = localStorage.getItem('wm_state_v2'); if(s) { const p = JSON.parse(s); Object.assign(state, p); if(state.nightMode) document.body.classList.add('dark'); } render(); };
