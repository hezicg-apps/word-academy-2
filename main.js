// --- הגדרות מערכת ---
let state = {
    screen: 'input', words: [], listName: 'אוצר המילים שלי',
    quizIndex: 0, correctAnswers: 0, lastScore: 0, nightMode: false,
    gameMode: 'pve', showC4Menu: false,
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, winner: null, msg: 'לחצו על "קבל שאלה" כדי להתחיל' },
    wordQuest: { target: '', heb: '', guesses: [], currentGuess: '', isGameOver: false, wordIndex: 0, correctCount: 0 },
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false, isGameOver: false }
};

let learningState = { currentIndex: 0, knownWords: [] };

// --- CSS ---
const style = document.createElement('style');
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap');
    
    :root { --primary: #2563eb; --accent: #facc15; }
    
    body { font-family: 'Comic Neue', cursive; margin: 0; direction: rtl; transition: 0.3s; background: #f0f4f8; color: #1e293b; min-height: 100vh; }
    body.dark { background: #0f172a; color: #f8fafc; }
    
    .header-bar { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; background: white; shadow: 0 2px 10px rgba(0,0,0,0.1); }
    body.dark .header-bar { background: #1e293b; }
    
    .card-face { border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 3px solid var(--primary); }
    
    /* 4 בשורה - עיצוב לוח אמיתי */
    .c4-board { background: #2563eb; padding: 10px; border-radius: 15px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; width: 300px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .c4-cell { aspect-ratio: 1; border-radius: 50%; background: #1e3a8a; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; }
    .token { width: 80%; height: 80%; border-radius: 50%; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .token.red { background: #ef4444; box-shadow: inset 0 -4px rgba(0,0,0,0.2); }
    .token.yellow { background: #facc15; box-shadow: inset 0 -4px rgba(0,0,0,0.2); }

    /* הקוד הסודי - צבעים ברורים */
    .wq-cell { width: 45px; height: 55px; border: 2px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; background: white; color: #1e293b; }
    .wq-correct { background: #22c55e !important; color: white !important; border: none; }
    .wq-present { background: #facc15 !important; color: white !important; border: none; }
    .wq-absent { background: #94a3b8 !important; color: white !important; border: none; }
    
    .keyboard-btn { background: #e2e8f0; border: none; padding: 15px 10px; border-radius: 8px; font-weight: bold; cursor: pointer; flex: 1; color: #1e293b; }
    body.dark .keyboard-btn { background: #334155; color: white; }

    /* משחק זיכרון */
    .mem-card { aspect-ratio: 1; cursor: pointer; perspective: 1000px; }
    .mem-card-text { font-size: 1.5rem; font-weight: bold; text-align: center; color: #1e293b; }
`;
document.head.appendChild(style);

function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; window.speechSynthesis.speak(u); }

// שיתוף משודרג - הכל ב-URL
function getShareUrl() {
    const data = btoa(unescape(encodeURIComponent(state.words.map(w => `${w.eng}-${w.heb}`).join('|'))));
    return `${window.location.origin}${window.location.pathname}?list=${encodeURIComponent(state.listName)}&v=${data}`;
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="header-bar">
            <button onclick="state.nightMode = !state.nightMode; document.body.classList.toggle('dark'); render();" style="font-size: 24px; background: none; border: none; cursor: pointer;">
                ${state.nightMode ? '☀️' : '🌙'}
            </button>
            <div style="display: flex; align-items: center; gap: 10px;">
                <h1 style="margin:0; font-size: 22px;">Word Adventure</h1>
                <img src="https://cdn-icons-png.flaticon.com/512/3898/3898082.png" width="35">
            </div>
        </div>
        <div id="screen-container" style="padding: 20px; max-width: 500px; margin: 0 auto;"></div>
    `;
    
    const container = document.getElementById('screen-container');
    const screens = { input: renderInput, flashcards: renderCards, quiz: renderQuiz, report: renderReport, menu: renderMenu, connect4: renderC4, wordquest: renderWQ, memory: renderMem };
    (screens[state.screen] || renderInput)(container);
}

// --- מסכי למידה ---
function renderInput(container) {
    container.innerHTML = `
        <div style="text-align: center; space-y: 20px;">
            <h2 style="font-size: 28px;">מה לומדים היום?</h2>
            <textarea id="wordInput" style="width: 100%; height: 200px; padding: 15px; border-radius: 15px; border: 2px solid #cbd5e1; font-family: inherit; font-size: 18px;" placeholder="שם היחידה...&#10;מילה באנגלית - תרגום&#10;dog - כלב"></textarea>
            <button onclick="saveList()" style="width: 100%; background: var(--primary); color: white; padding: 18px; border: none; border-radius: 15px; font-size: 20px; font-weight: bold; margin-top: 20px; cursor: pointer;">מתחילים!</button>
        </div>
    `;
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
        <div style="display: flex; flex-direction: column; align-items: center; gap: 40px; margin-top: 40px;">
            <div style="width: 280px; height: 200px; position: relative; cursor: pointer;" onclick="this.querySelector('.inner').classList.toggle('flipped')">
                <style>
                    .inner { width: 100%; height: 100%; transition: 0.6s; transform-style: preserve-3d; position: relative; }
                    .flipped { transform: rotateY(180deg); }
                    .face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; border-radius: 20px; border: 4px solid var(--primary); }
                    .back { transform: rotateY(180deg); background: var(--accent); border-color: #eab308; }
                </style>
                <div class="inner">
                    <div class="face"><span style="font-size: 42px; font-weight: bold;">${word.eng}</span><button onclick="event.stopPropagation(); speak('${word.eng}')" style="font-size: 24px; background: none; border: none; margin-top: 15px;">🔊</button></div>
                    <div class="face back"><span style="font-size: 38px; font-weight: bold; color: #854d0e;">${word.heb}</span></div>
                </div>
            </div>
            <div style="display: flex; gap: 15px; width: 100%;">
                <button onclick="nextCard(false)" style="flex: 1; padding: 20px; background: #ef4444; color: white; border: none; border-radius: 15px; font-weight: bold; font-size: 18px;">צריך עוד תרגול</button>
                <button onclick="nextCard(true)" style="flex: 1; padding: 20px; background: #22c55e; color: white; border: none; border-radius: 15px; font-weight: bold; font-size: 18px;">אני יודע!</button>
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
        <div style="text-align: center;">
            <p style="color: var(--primary); font-weight: bold;">שאלה ${state.quizIndex + 1} מתוך ${state.words.length}</p>
            <h2 style="font-size: 48px; margin: 20px 0;">${q.eng}</h2>
            <div style="display: grid; gap: 12px; margin-top: 30px;">
                ${choices.map(c => `<button onclick="checkQ('${c}','${q.heb}',this)" style="padding: 20px; background: white; border: 2px solid #e2e8f0; border-radius: 15px; font-size: 20px; font-weight: bold; color: #1e293b; cursor: pointer; transition: 0.2s;">${c}</button>`).join('')}
            </div>
        </div>
    `;
}

function checkQ(s, c, b) {
    if (s === c) { state.correctAnswers++; b.style.background = "#22c55e"; b.style.color = "white"; b.style.borderColor = "#16a34a"; }
    else { b.style.background = "#ef4444"; b.style.color = "white"; b.style.borderColor = "#dc2626"; }
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.lastScore = Math.round((state.correctAnswers/state.words.length)*100); state.screen = 'report'; render(); }
    }, 600);
}

function renderReport(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 30px; background: white; border-radius: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <h2 style="font-size: 24px;">הציון שלך:</h2>
            <div style="font-size: 80px; font-weight: 900; color: var(--primary); margin: 20px 0;">${state.lastScore}%</div>
            <button onclick="openShare(true)" style="width: 100%; background: #25d366; color: white; padding: 18px; border: none; border-radius: 15px; font-size: 18px; font-weight: bold; margin-bottom: 12px; cursor: pointer;">שתפו הישג בוואטסאפ 🏆</button>
            <button onclick="state.screen='menu'; render();" style="width: 100%; background: var(--primary); color: white; padding: 18px; border: none; border-radius: 15px; font-size: 18px; font-weight: bold; cursor: pointer;">למתחם המשחקים 🎮</button>
        </div>
    `;
}

// --- תפריט משחקים ---
function renderMenu(container) {
    const locked = state.lastScore < 70;
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
             <button onclick="state.screen='input'; render();" style="background:none; border:none; color:#64748b; font-weight:bold; cursor:pointer;">+ רשימה חדשה</button>
             <button onclick="openShare(false)" style="background:none; border:none; color:#16a34a; font-weight:bold; cursor:pointer;">שתף רשימה 🔗</button>
        </div>
        <h2 style="text-align:center; font-size: 32px; font-weight: 900; letter-spacing: 2px; color: var(--primary);">GAME ZONE</h2>
        
        <div style="display: grid; gap: 15px; margin-top: 20px;">
            <button onclick="${locked ? '' : 'state.showC4Menu=true; render()'}" class="menu-btn" style="opacity: ${locked?0.5:1};">
                <div style="display:flex; gap:5px;"><div style="width:15px; height:15px; background:#ef4444; border-radius:50%;"></div><div style="width:15px; height:15px; background:#facc15; border-radius:50%;"></div></div>
                <span>4 בשורה</span>
            </button>
            <button onclick="${locked ? '' : 'startWQ()'}" class="menu-btn" style="opacity: ${locked?0.5:1};">הקוד הסודי 🔍</button>
            <button onclick="${locked ? '' : 'initMemGame()'}" class="menu-btn" style="opacity: ${locked?0.5:1};">משחק הזיכרון 🧠</button>
        </div>

        ${locked ? `<div style="margin-top: 30px; padding: 20px; background: #fee2e2; border-radius: 15px; text-align: center; border: 2px solid #ef4444;">
            <p style="color:#b91c1c; font-weight:bold; margin:0;">🔒 המשחקים נעולים!</p>
            <p style="color:#ef4444; font-size:14px; margin: 10px 0;">עליך להשיג לפחות 70% בבוחן המילים.</p>
            <button onclick="state.screen='flashcards'; render();" style="background:#b91c1c; color:white; border:none; padding:10px 20px; border-radius:10px; font-weight:bold;">חזרה לתרגול</button>
        </div>` : ''}

        <style>
            .menu-btn { background: white; border: 2px solid #e2e8f0; padding: 25px; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 22px; font-weight: bold; color: #1e293b; cursor: pointer; transition: 0.2s; }
            .menu-btn:hover { border-color: var(--primary); transform: translateY(-2px); }
            body.dark .menu-btn { background: #1e293b; color: white; border-color: #334155; }
        </style>
        ${state.showC4Menu ? renderC4Menu() : ''}
    `;
}

// --- 4 בשורה ---
function renderC4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <button onclick="prepC4Q()" style="background:var(--primary); color:white; border:none; padding:10px 20px; border-radius:10px; font-weight:bold;">קבל שאלה ❓</button>
                <div style="display:flex; align-items:center; gap:8px;">תור: <div style="width:20px; height:20px; border-radius:50%; background:${g.turn===1?'#ef4444':'#facc15'}"></div></div>
            </div>
            
            <p style="margin-bottom: 10px; font-weight: bold; color: ${state.nightMode?'#facc15':'#1e40af'};">${g.msg}</p>

            <div class="c4-board">
                ${g.board.flat().map((cell, i) => `
                    <div onclick="dropToken(${i%7})" class="c4-cell">
                        ${cell ? `<div class="token ${cell===1?'red':'yellow'}"></div>` : ''}
                    </div>
                `).join('')}
            </div>
            
            <button onclick="state.screen='menu'; render()" style="margin-top:20px; background:none; border:none; color:#64748b; font-weight:bold; cursor:pointer;">יציאה לתפריט</button>
        </div>
        ${g.isAnswering ? renderC4Question() : ''}
        ${g.winner ? renderC4Win() : ''}
    `;
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
        <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
            <div style="text-align: center;">
                <h3 style="margin:0; font-size: 24px; color: var(--primary);">רמז: ${q.heb}</h3>
                <p style="font-size: 14px; color: #64748b;">ניסיון ${q.guesses.length + 1} מתוך 6</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px; direction: ltr;">
                ${q.guesses.map(g => `<div style="display: flex; gap: 5px;">${g.split('').map((l,i) => {
                    let cls = q.target[i]===l ? 'wq-correct' : (q.target.includes(l) ? 'wq-present' : 'wq-absent');
                    return `<div class="wq-cell ${cls}">${l}</div>`;
                }).join('')}</div>`).join('')}
                ${!q.isGameOver ? `<div style="display: flex; gap: 5px;">${Array(q.target.length).fill('').map((_,i) => `<div class="wq-cell" style="${state.nightMode?'background:#1e293b; color:white;':''}">${q.currentGuess[i]||''}</div>`).join('')}</div>` : ''}
            </div>

            <div style="display: flex; gap: 15px; font-size: 12px; font-weight: bold; margin: 10px 0;">
                <div style="display:flex; align-items:center; gap:5px;"><div style="width:12px; height:12px; background:#22c55e; border-radius:3px;"></div> במקום</div>
                <div style="display:flex; align-items:center; gap:5px;"><div style="width:12px; height:12px; background:#facc15; border-radius:3px;"></div> אות נכונה</div>
                <div style="display:flex; align-items:center; gap:5px;"><div style="width:12px; height:12px; background:#94a3b8; border-radius:3px;"></div> לא במילה</div>
            </div>

            <div style="width: 100%; direction: ltr;">
                ${['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(row => `
                    <div style="display: flex; gap: 4px; margin-bottom: 5px;">
                        ${row.split('').map(l => `<button onclick="handleKey('${l}')" class="keyboard-btn">${l}</button>`).join('')}
                    </div>
                `).join('')}
                <div style="display: flex; gap: 4px;">
                    <button onclick="handleKey('Backspace')" class="keyboard-btn" style="flex: 2; background: #cbd5e1;">DEL</button>
                    <button onclick="handleKey('Enter')" class="keyboard-btn" style="flex: 3; background: var(--primary); color: white;">ENTER</button>
                </div>
            </div>
            <button onclick="state.screen='menu'; render()" style="margin-top:10px; background:none; border:none; color:#64748b; font-weight:bold; cursor:pointer;">יציאה</button>
        </div>
    `;
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
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold;">
            <span>צעדים: ${g.steps}</span>
            <span>זוגות: ${g.pairs}/${state.words.length}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            ${g.cards.map((c, i) => `
                <div class="mem-card" onclick="flipMem(${i})">
                    <div style="width:100%; height:100%; transition: 0.5s; transform-style: preserve-3d; position: relative; ${g.flipped.includes(i) || c.match ? 'transform: rotateY(180deg);' : ''}">
                        <div style="position: absolute; width:100%; height:100%; backface-visibility: hidden; background: var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">?</div>
                        <div style="position: absolute; width:100%; height:100%; backface-visibility: hidden; background: white; border-radius: 12px; transform: rotateY(180deg); border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; padding: 5px;">
                            <span class="mem-card-text">${c.text}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <button onclick="state.screen='menu'; render()" style="width:100%; margin-top:30px; background:none; border:none; color:#64748b; font-weight:bold; cursor:pointer;">יציאה לתפריט</button>
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
            if(g.pairs === state.words.length) { 
                setTimeout(() => { alert(`כל הכבוד! סיימת ב-${g.steps} מהלכים.`); state.screen = 'menu'; render(); }, 500);
            }
            render();
        } else { setTimeout(() => { g.flipped = []; g.isProcessing = false; render(); }, 1000); }
    }
}

// --- לוגיקת עזר 4 בשורה ---
function dropToken(c) {
    const g = state.connect4; if (!g.canDrop || g.winner) return;
    for (let r = 5; r >= 0; r--) {
        if (!g.board[r][c]) {
            g.board[r][c] = g.turn;
            if (checkC4Win(r, c)) g.winner = g.turn;
            else { g.turn = g.turn === 1 ? 2 : 1; g.canDrop = false; g.msg = 'תור השחקן הבא...'; if(state.gameMode==='pve' && g.turn === 2) setTimeout(moveAI, 600); }
            render(); return;
        }
    }
}

function prepC4Q() {
    const q = state.words[Math.floor(Math.random()*state.words.length)];
    state.connect4.q = { eng:q.eng, heb:q.heb, choices:[q.heb, ...state.words.filter(w=>w.heb!==q.heb).map(w=>w.heb)].sort(()=>0.5-Math.random()).slice(0,3) };
    state.connect4.isAnswering = true; render();
}

function renderC4Question() {
    return `
        <div style="fixed inset-0; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:100;">
            <div style="background:white; padding:30px; border-radius:25px; width:80%; max-width:350px; text-align:center;">
                <h2 style="font-size:32px; color:black; margin-bottom:20px;">${state.connect4.q.eng}</h2>
                <div style="display:grid; gap:10px;">
                    ${state.connect4.q.choices.map(c => `<button onclick="ansC4('${c}')" style="padding:15px; border:2px solid #e2e8f0; border-radius:12px; font-weight:bold; font-size:18px; cursor:pointer; color:black;">${c}</button>`).join('')}
                </div>
            </div>
        </div>
    `;
}

function ansC4(s) {
    state.connect4.isAnswering = false;
    if(s === state.connect4.q.heb) { state.connect4.canDrop = true; state.connect4.msg = "✅ נכון! עכשיו בחר עמודה בלוח"; }
    else { state.connect4.msg = "❌ טעות! התור עובר"; state.connect4.turn = state.connect4.turn === 1 ? 2 : 1; if(state.gameMode==='pve' && state.connect4.turn === 2) setTimeout(moveAI, 600); }
    render();
}

function moveAI() {
    let v=[]; for(let c=0; c<7; c++) if(!state.connect4.board[0][c]) v.push(c);
    state.connect4.canDrop = true; dropToken(v[Math.floor(Math.random()*v.length)]);
}

function checkC4Win(r,c) {
    const b=state.connect4.board, p=b[r][c], dirs=[[0,1],[1,0],[1,1],[1,-1]];
    for(let [dr,dc] of dirs){ let count=1; for(let s of [1,-1]){ let nr=r+dr*s, nc=c+dc*s; while(nr>=0&&nr<6&&nc>=0&&nc<7&&b[nr][nc]===p){ count++; nr+=dr*s; nc+=dc*s; } } if(count>=4) return true; }
    return false;
}

function openShare(isResult) {
    const url = getShareUrl();
    const text = isResult ? `הצלחתי! קיבלתי ${state.lastScore}% ביחידה "${state.listName}"! נסו לנצח אותי: ${url}` : `הכנתי רשימה חדשה: "${state.listName}". בואו ללמוד: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
}

function renderC4Menu() {
    return `<div style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:50;" onclick="state.showC4Menu=false; render()">
        <div style="background:white; padding:30px; border-radius:25px; width:300px; display:grid; gap:15px;" onclick="event.stopPropagation()">
            <button onclick="state.gameMode='pve'; state.connect4.board=Array(6).fill(null).map(()=>Array(7).fill(null)); state.connect4.turn=1; state.connect4.winner=null; state.screen='connect4'; state.showC4Menu=false; render();" style="padding:15px; background:var(--primary); color:white; border:none; border-radius:12px; font-weight:bold;">נגד המחשב 🤖</button>
            <button onclick="state.gameMode='pvp'; state.connect4.board=Array(6).fill(null).map(()=>Array(7).fill(null)); state.connect4.turn=1; state.connect4.winner=null; state.screen='connect4'; state.showC4Menu=false; render();" style="padding:15px; background:#f1f5f9; color:black; border:none; border-radius:12px; font-weight:bold;">שני שחקנים 👥</button>
        </div>
    </div>`;
}

function renderC4Win() {
    return `<div style="position:fixed; inset:0; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:200;">
        <div style="text-align:center; color:white;">
            <h2 style="font-size:48px;">ניצחון! 🎉</h2>
            <p style="font-size:24px;">השחקן ה${state.connect4.winner===1?'אדום':'צהוב'} ניצח!</p>
            <button onclick="state.screen='menu'; state.connect4.winner=null; render();" style="margin-top:20px; background:var(--primary); color:white; border:none; padding:15px 30px; border-radius:15px; font-weight:bold;">חזרה לתפריט</button>
        </div>
    </div>`;
}

// טעינה מה-URL
const urlParams = new URLSearchParams(window.location.search);
if(urlParams.has('v')) {
    try {
        state.listName = urlParams.get('list') || 'אוצר מילים';
        const decoded = decodeURIComponent(escape(atob(urlParams.get('v'))));
        state.words = decoded.split('|').map(x => { const [eng, heb] = x.split('-'); return { eng, heb }; });
        state.screen = 'flashcards';
    } catch(e) { console.error(e); }
}

window.onload = render;
