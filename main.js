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
    body { font-family: 'Assistant', sans-serif; margin: 0; direction: rtl; transition: 0.3s; background: #f8fafc; color: #1e293b; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }
    body.dark { background: #000; color: #facc15; }
    
    .site-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }
    .logo-group { display: flex; align-items: center; gap: 8px; }
    .site-logo { width: 30px; height: 30px; }
    .site-title { font-weight: 900; font-size: 1.2rem; }

    /* UI Dark Mode */
    body.dark textarea, body.dark .modal-content, body.dark .bg-white:not(.feedback-correct):not(.feedback-wrong) { 
        background: transparent !important; color: #facc15 !important; border: 2px solid #facc15 !important; 
    }
    body.dark .card-face { background: #111 !important; color: #facc15 !important; border: 2px solid #facc15 !important; }
    
    /* חיווי צבעוני קשיח */
    .feedback-correct { background-color: #22c55e !important; color: white !important; border: none !important; }
    .feedback-wrong { background-color: #ef4444 !important; color: white !important; border: none !important; }

    .game-zone-title { font-size: 2.2rem; font-weight: 900; margin: 1rem 0; text-align: center; width: 100%; }

    /* 4 בשורה - לוח משופר */
    .c4-board { background: #1e40af; border: 6px solid #1e3a8a; border-radius: 1rem; padding: 8px; display: grid; grid-template-rows: repeat(6, 1fr); gap: 4px; width: 280px; margin: 0 auto; aspect-ratio: 7/6; }
    .c4-row { display: grid; grid-template-cols: repeat(7, 1fr); gap: 4px; }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
    .token { width: 70%; height: 70%; border-radius: 50%; box-shadow: inset 0 -3px rgba(0,0,0,0.2); }

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
        report: renderReport, menu: renderMenu, connect4: renderC4, wordquest: renderWQ, memory: renderMem
    };
    (screens[state.screen] || renderInput)(content);
}

// --- הקוד הסודי (משופר) ---
function startWQ() {
    const word = state.words[state.wordQuest.wordIndex];
    state.wordQuest = { ...state.wordQuest, target: word.eng.toUpperCase(), heb: word.heb, guesses: [], currentGuess: '', isGameOver: false };
    state.screen = 'wordquest'; render();
}

function renderWQ(container) {
    const q = state.wordQuest;
    container.innerHTML = `
        <div class="wq-main">
            <div class="text-center py-2">
                <div class="text-blue-500 font-bold text-xl">רמז: ${q.heb}</div>
                <div class="flex justify-center gap-4 text-[10px] mt-1 opacity-70 font-bold">
                    <span class="flex items-center gap-1"><div class="w-3 h-3 bg-yellow-400"></div> בול!</span>
                    <span class="flex items-center gap-1"><div class="w-3 h-3 bg-slate-400"></div> כמעט</span>
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
                ${['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(row => `<div class="flex justify-center gap-1 mb-1">${row.split('').map(l => `<button onclick="handleKey('${l}')" class="flex-1 py-4 bg-white rounded-lg font-bold shadow text-black border border-slate-300">${l}</button>`).join('')}</div>`).join('')}
                <div class="flex gap-1">
                    <button onclick="handleKey('Enter')" class="flex-[1.5] py-4 bg-blue-600 text-white rounded-lg font-bold">ENTER</button>
                    <button onclick="handleKey('Backspace')" class="flex-1 py-4 bg-slate-400 text-white rounded-lg font-bold">⌫</button>
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

// --- 4 בשורה (דיסקיות קטנות) ---
function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="flex flex-col items-center gap-4">
            <div class="w-full flex justify-between items-center max-w-[280px] font-bold">
                <button onclick="prepC4Q()" class="bg-blue-600 text-white px-4 py-2 rounded-lg">שאלה</button>
                <div class="flex items-center gap-2">תור: <div class="w-6 h-6 rounded-full ${g.turn===1?'bg-red-500':'bg-yellow-400'}"></div></div>
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
            <button onclick="state.screen='menu'; render()" class="bg-slate-200 px-6 py-1 rounded-lg font-bold text-black mt-2">חזרה</button>
        </div>
        ${g.isAnswering ? renderC4Question() : ''}
        ${g.winner ? renderC4Win() : ''}
    `;
}

// (שאר הפונקציות מהגרסה הקודמת נשארות זהות ומטפלות בשאר הלוגיקה)
// ... [המשך הקוד - כולל Input, Cards, Quiz, Memory, Report]

function checkQ(s, c, b) {
    if (s === c) { 
        state.correctAnswers++; 
        b.classList.add("feedback-correct"); 
    } else { 
        b.classList.add("feedback-wrong"); 
    }
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; render(); }
    }, 600);
}

// ... [פונקציות עזר, טעינה מקישור ו-window.onload]

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

function renderInput(container) {
    container.innerHTML = `<div class="py-6 space-y-6 text-center">
        <h2 class="text-3xl font-bold">הזנת מילים</h2>
        <textarea id="wordInput" class="w-full h-48 p-4 border-2 rounded-2xl text-right bg-white" placeholder="שם היחידה\nEnglish - עברית"></textarea>
        <button onclick="saveList()" class="bg-blue-600 text-white p-4 rounded-xl font-bold w-full shadow-lg">מתחילים ללמוד</button>
    </div>`;
}

// טעינה ו-Render ראשוני
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

window.onload = render;
