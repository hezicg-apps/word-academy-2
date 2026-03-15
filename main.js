let state = {
    screen: 'welcome', 
    words: [],
    listName: 'אוצר המילים שלי',
    nightMode: false, 
    quizIndex: 0, 
    correctAnswers: 0,
    masteryScore: 0,
    memoryGame: { cards: [], flipped: [], pairs: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: true },
    wordQuest: { target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 6, isGameOver: false },
    winner: null
};

let learningState = { currentIndex: 0, isFlipped: false, knownWords: [] };

// עזרים
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function toggleNightMode() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode', state.nightMode);
    render();
}

function render() {
    const app = document.getElementById('app');
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';
    app.innerHTML = ''; 

    const isDark = state.nightMode;
    
    // יצירת הכותרת עם תיקון הסדר (לוגו בשמאל, כפתור בימין)
    const header = document.createElement('header');
    // הוספנו row-reverse כדי שהלוגו והשם יהיו בצד שמאל במבנה עברי
    header.className = `flex flex-row-reverse justify-between items-center p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-b sticky top-0 z-50 transition-all`;
    
    header.innerHTML = `
        <div class="flex items-center gap-3" style="direction: ltr; text-align: left;">
            <img src="logo.svg" alt="WA" class="h-12 w-12 object-contain" style="background: transparent;">
            <div class="flex flex-col items-start">
                <span class="text-blue-600 font-black text-2xl leading-none" style="font-family: 'Heebo', sans-serif;">Word Academy</span>
                <span class="text-[11px] font-bold text-slate-400 mt-1">תרגול אוצר מילים בכיף 🦉</span>
            </div>
        </div>
        
        <button onclick="toggleNightMode()" class="p-2 rounded-2xl transition-all text-2xl border ${isDark ? 'bg-slate-800 text-yellow-400 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-100'}">
            ${isDark ? '☀️' : '🌙'}
        </button>
    `;
    app.appendChild(header);

    const content = document.createElement('div');
    content.className = "w-full max-w-4xl mx-auto p-4";
    app.appendChild(content);

    // ניתוב מסכים
    if (state.words.length === 0 && !window.location.search.includes('w=')) {
        content.innerHTML = `
            <div class="p-10 text-center space-y-6">
                <h2 class="text-2xl font-black">אנא בחרו יחידת לימוד באתר הבית 🚀</h2>
                <button onclick="state.screen='input'; render();" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">או לחצו כאן ליצירת רשימה חדשה</button>
            </div>`;
    } else {
        const screens = {
            input: renderInputScreen, // הוספנו אפשרות למסך הזנה
            welcome: renderWelcomeScreen,
            flashcards: renderFlashcardsScreen,
            quiz: renderQuizScreen,
            report: renderReportScreen,
            menu: renderMenuScreen,
            memory: renderMemory,
            connect4: renderConnect4,
            wordquest: renderWordQuest
        };
        if (screens[state.screen]) screens[state.screen](content);
    }
}
        if (screens[state.screen]) screens[state.screen](content);
    }
}

function renderWelcomeScreen(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center text-center space-y-8 mt-16 p-6 animate-fade-in">
            <div class="bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-blue-100 w-full max-w-md">
                <h2 class="text-3xl font-black text-slate-800 mb-2">מוכנים?</h2>
                <button onclick="state.screen='flashcards'; render();" class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-lg active:scale-95 transition-all">בואו נתחיל! 🚀</button>
            </div>
        </div>
    `;
}

function renderFlashcardsScreen(container) {
    const word = state.words[learningState.currentIndex];
    container.innerHTML = `
        <div class="p-4 space-y-6 text-center">
            <h3 class="text-2xl font-black">${state.listName}</h3>
            <div onclick="learningState.isFlipped = !learningState.isFlipped; render();" class="relative w-full aspect-[4/3] max-w-sm mx-auto cursor-pointer perspective-1000">
                <div class="w-full h-full transition-all duration-500 preserve-3d ${learningState.isFlipped ? 'rotate-y-180' : ''}">
                    <div class="absolute inset-0 bg-white border-4 border-blue-100 rounded-[2.5rem] flex flex-col items-center justify-center shadow-xl backface-hidden">
                        <h2 class="eng-text text-5xl font-black text-blue-600">${word.eng}</h2>
                        <button onclick="event.stopPropagation(); speak('${word.eng}')" class="mt-6 text-3xl">🔊</button>
                    </div>
                    <div class="absolute inset-0 bg-blue-50 border-4 border-blue-200 rounded-[2.5rem] flex items-center justify-center shadow-xl backface-hidden rotate-y-180">
                        <h2 class="text-5xl font-black text-slate-800">${word.heb}</h2>
                    </div>
                </div>
            </div>
            <div class="flex gap-4 max-w-sm mx-auto">
                <button onclick="nextWord(false)" class="flex-1 bg-orange-600 text-white py-5 rounded-2xl font-black shadow-lg">⌛ עוד לא</button>
                <button onclick="nextWord(true)" class="flex-1 bg-green-600 text-white py-5 rounded-2xl font-black shadow-lg">✅ יודע</button>
            </div>
            ${learningState.knownWords.length === state.words.length ? `<button onclick="state.screen='quiz'; render();" class="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-2xl shadow-xl animate-bounce">אני מוכן לאתגר! 🏆</button>` : ''}
        </div>
    `;
}

function nextWord(isKnown) {
    if (isKnown && !learningState.knownWords.includes(learningState.currentIndex)) learningState.knownWords.push(learningState.currentIndex);
    learningState.currentIndex = (learningState.currentIndex + 1) % state.words.length;
    learningState.isFlipped = false;
    render();
}

function renderQuizScreen(container) {
    const q = state.words[state.quizIndex];
    let choices = shuffle([q.heb, ...shuffle(state.words.filter(w => w.heb !== q.heb)).slice(0, 3).map(w => w.heb)]);
    container.innerHTML = `
        <div class="p-6 text-center space-y-8">
            <h2 class="eng-text text-6xl font-black text-blue-600">${q.eng}</h2>
            <div class="grid gap-4 max-w-sm mx-auto">
                ${choices.map(c => `<button onclick="checkQuiz('${c}', '${q.heb}', this)" class="bg-white p-5 rounded-2xl font-bold text-xl border-2 border-slate-100 shadow-sm">${c}</button>`).join('')}
            </div>
        </div>
    `;
}

function checkQuiz(sel, cor, btn) {
    if (sel === cor) { state.correctAnswers++; btn.classList.add('bg-green-500', 'text-white'); triggerConfetti(); }
    else btn.classList.add('bg-red-500', 'text-white');
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) { state.quizIndex++; render(); }
        else { state.masteryScore = Math.round((state.correctAnswers / state.words.length) * 100); state.screen = 'report'; render(); }
    }, 600);
}

function renderReportScreen(container) {
    container.innerHTML = `
        <div class="p-6 text-center space-y-6">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-yellow-400">
                <h2 class="text-3xl font-black">כל הכבוד!</h2>
                <div class="text-7xl font-black text-yellow-400">${state.masteryScore}%</div>
            </div>
            <div class="bg-blue-50 p-6 rounded-3xl space-y-4">
                <input type="text" id="studentName" placeholder="שם התלמיד" class="w-full p-4 rounded-xl text-center font-bold">
                <select id="studentClass" class="w-full p-4 rounded-xl text-center font-bold">
                    <option value="">בחר כיתה...</option>
                    <option value="ג1">ג' 1</option><option value="ד1">ד' 1</option><option value="ה1">ה' 1</option><option value="ו1">ו' 1</option>
                </select>
                <button onclick="handleReport()" class="w-full bg-green-500 text-white py-4 rounded-xl font-black text-xl shadow-lg">שלח ופתח משחקים ✅</button>
            </div>
        </div>
    `;
}

function handleReport() {
    if (!document.getElementById('studentName').value) { alert("נא להזין שם"); return; }
    state.screen = 'menu';
    render();
}

function renderMenuScreen(container) {
    container.innerHTML = `
        <div class="p-6 space-y-4">
            <h2 class="text-2xl font-black text-center mb-6">בחר משחק 🎮</h2>
            <button onclick="initMemoryGame()" class="w-full p-6 bg-white rounded-3xl shadow-md border-b-4 border-blue-400 flex items-center gap-4">
                <span class="text-4xl">🧠</span> <div class="text-right"><b class="block text-lg">משחק הזיכרון</b></div>
            </button>
            <button onclick="initConnect4()" class="w-full p-6 bg-white rounded-3xl shadow-md border-b-4 border-red-400 flex items-center gap-4">
                <span class="text-4xl">🔴</span> <div class="text-right"><b class="block text-lg">4 בשורה</b></div>
            </button>
            <button onclick="initWordQuest()" class="w-full p-6 bg-white rounded-3xl shadow-md border-b-4 border-green-400 flex items-center gap-4">
                <span class="text-4xl">🕵️</span> <div class="text-right"><b class="block text-lg">הקוד הסודי</b></div>
            </button>
        </div>
    `;
}

function initMemoryGame() {
    let cards = [];
    state.words.forEach((word, index) => {
        cards.push({ id: index, type: 'eng', content: word.eng, matched: false });
        cards.push({ id: index, type: 'heb', content: word.heb, matched: false });
    });
    state.memoryGame = {
        cards: shuffle(cards),
        flipped: [],
        pairs: 0,
        isProcessing: false
    };
    state.screen = 'memory';
    render();
}

function renderMemory(container) {
    const g = state.memoryGame;
    container.innerHTML = `
        <div class="p-4 space-y-4 animate-fade-in">
            <div class="flex justify-between items-center mb-4">
                <button onclick="state.screen='menu'; render();" class="text-blue-600 font-bold">⬅️ חזרה</button>
                <div class="bg-blue-100 px-4 py-2 rounded-full text-blue-800 font-bold">
                    זוגות: ${g.pairs} / ${state.words.length}
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-3">
                ${g.cards.map((card, index) => {
                    const isFlipped = g.flipped.includes(index) || card.matched;
                    return `
                        <div onclick="handleMemoryClick(${index})" 
                             class="aspect-square rounded-2xl flex items-center justify-center p-2 text-center transition-all duration-300 transform shadow-sm cursor-pointer
                             ${isFlipped ? 'bg-white border-2 border-blue-400 rotate-y-180' : 'bg-blue-600 shadow-lg hover:scale-105'}">
                            <span class="${isFlipped ? 'opacity-100' : 'opacity-0'} font-bold text-sm ${card.type === 'eng' ? 'eng-text' : ''}">
                                ${card.content}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function handleMemoryClick(index) {
    const g = state.memoryGame;
    if (g.isProcessing || g.flipped.includes(index) || g.cards[index].matched) return;

    g.flipped.push(index);
    render();

    if (g.flipped.length === 2) {
        g.isProcessing = true;
        const [first, second] = g.flipped;
        
        if (g.cards[first].id === g.cards[second].id && g.cards[first].type !== g.cards[second].type) {
            // הצלחה - מצאו זוג
            setTimeout(() => {
                g.cards[first].matched = true;
                g.cards[second].matched = true;
                g.pairs++;
                g.flipped = [];
                g.isProcessing = false;
                if (g.pairs === state.words.length) triggerConfetti();
                render();
            }, 500);
        } else {
            // כישלון - הופכים חזרה
            setTimeout(() => {
                g.flipped = [];
                g.isProcessing = false;
                render();
            }, 1000);
        }
    }
}

function initConnect4() {
    state.connect4 = {
        board: Array(6).fill(null).map(() => Array(7).fill(null)),
        turn: 1, // 1 = Player, 2 = AI
        q: null,
        canDrop: false,
        isAnswering: true
    };
    state.winner = null;
    state.screen = 'connect4';
    prepC4Question();
    render();
}

function prepC4Question() {
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    let choices = state.words.filter(w => w.eng !== q.eng).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.heb);
    choices.push(q.heb);
    state.connect4.q = { ...q, choices: shuffle(choices) };
}

function renderConnect4(container) {
    const g = state.connect4;
    container.innerHTML = `
        <div class="p-4 flex flex-col items-center animate-fade-in">
            <div class="w-full flex justify-between items-center mb-4">
                <button onclick="state.screen='menu'; render();" class="text-red-500 font-black">⬅️ יציאה</button>
                <div class="font-black ${g.turn === 1 ? 'text-red-500' : 'text-yellow-500'}">
                    תור: ${g.turn === 1 ? '🔴 שלך' : '🟡 מחשב'}
                </div>
            </div>

            <div class="bg-blue-700 p-2 rounded-3xl shadow-2xl grid grid-cols-7 gap-1 w-full max-w-[340px] border-b-8 border-blue-900">
                ${g.board[0].map((_, col) => `
                    <div onclick="handleC4Drop(${col})" class="h-8 flex justify-center items-center cursor-pointer hover:bg-white/20 rounded-full">
                        ${g.canDrop && g.turn === 1 ? '👇' : ''}
                    </div>
                `).join('')}
                ${g.board.map(row => row.map(cell => `
                    <div class="aspect-square bg-blue-800 rounded-full flex items-center justify-center">
                        ${cell === 1 ? '<div class="w-4/5 h-4/5 bg-red-500 rounded-full shadow-lg"></div>' : 
                          cell === 2 ? '<div class="w-4/5 h-4/5 bg-yellow-400 rounded-full shadow-lg"></div>' : ''}
                    </div>
                `).join('')).join('')}
            </div>

            ${g.isAnswering ? `
                <div class="mt-4 bg-white p-6 rounded-[2rem] shadow-xl w-full max-w-sm border-t-4 border-blue-500">
                    <h3 class="eng-text text-3xl font-black text-center text-blue-600 mb-4">${g.q.eng}</h3>
                    <div class="grid grid-cols-2 gap-2">
                        ${g.q.choices.map(choice => `<button onclick="handleC4Answer('${choice}')" class="bg-slate-50 p-3 rounded-xl font-bold border-2 border-slate-100 hover:border-blue-400">${choice}</button>`).join('')}
                    </div>
                </div>
            ` : ''}

            ${state.winner ? `<div class="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6"><div class="bg-white p-8 rounded-[3rem] text-center"><h2 class="text-3xl font-black mb-4">${state.winner === 'Player' ? 'ניצחת! 🏆' : 'המחשב ניצח 🤖'}</h2><button onclick="initConnect4()" class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black">שחק שוב</button></div></div>` : ''}
        </div>
    `;
}

function handleC4Answer(selected) {
    if (selected === state.connect4.q.heb) {
        state.connect4.isAnswering = false;
        state.connect4.canDrop = true;
        render();
    } else {
        alert("נסה שוב!");
        prepC4Question();
        render();
    }
}

function handleC4Drop(col) {
    const g = state.connect4;
    if (!g.canDrop || state.winner) return;

    for (let r = 5; r >= 0; r--) {
        if (!g.board[r][col]) {
            g.board[r][col] = 1;
            g.canDrop = false;
            if (checkC4Win(r, col, 1)) { state.winner = 'Player'; triggerConfetti(); }
            else { g.turn = 2; setTimeout(handleAiTurn, 600); }
            render(); return;
        }
    }
}

function handleAiTurn() {
    const g = state.connect4;
    let available = [];
    for (let c = 0; c < 7; c++) if (!g.board[0][c]) available.push(c);
    if (available.length > 0) {
        let col = available[Math.floor(Math.random() * available.length)];
        for (let r = 5; r >= 0; r--) {
            if (!g.board[r][col]) {
                g.board[r][col] = 2;
                if (checkC4Win(r, col, 2)) state.winner = 'AI';
                break;
            }
        }
    }
    g.turn = 1; g.isAnswering = true; prepC4Question(); render();
}

function checkC4Win(r, c, p) {
    const b = state.connect4.board;
    const directions = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of directions) {
        let count = 1;
        for (let step of [1, -1]) {
            let nr = r + dr * step, nc = c + dc * step;
            while (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && b[nr][nc] === p) { count++; nr += dr * step; nc += dc * step; }
        }
        if (count >= 4) return true;
    }
    return false;
}

function initWordQuest() {
    const targetWord = state.words[Math.floor(Math.random() * state.words.length)];
    state.wordQuest = {
        target: targetWord.eng.toUpperCase(),
        heb: targetWord.heb,
        guesses: [],
        currentGuess: '',
        maxAttempts: 6,
        isGameOver: false
    };
    state.screen = 'wordquest';
    render();
}

function renderWordQuest(container) {
    const q = state.wordQuest;
    container.innerHTML = `
        <div class="p-4 space-y-6 text-center animate-fade-in">
            <div class="flex justify-between items-center mb-4">
                <button onclick="state.screen='menu'; render();" class="text-blue-600 font-bold">⬅️ חזרה</button>
                <div class="text-slate-400 font-bold">רמז: ${q.heb}</div>
            </div>

            <div class="grid gap-2 max-w-[300px] mx-auto">
                ${Array(q.maxAttempts).fill(null).map((_, rowIndex) => {
                    const guess = q.guesses[rowIndex] || (rowIndex === q.guesses.length ? q.currentGuess : '');
                    return `
                        <div class="grid grid-cols-${q.target.length} gap-2">
                            ${Array(q.target.length).fill(null).map((_, charIndex) => {
                                const char = guess[charIndex] || '';
                                let color = 'bg-white border-slate-200';
                                if (q.guesses[rowIndex]) {
                                    if (q.target[charIndex] === char) color = 'bg-green-500 text-white border-green-600';
                                    else if (q.target.includes(char)) color = 'bg-yellow-400 text-white border-yellow-500';
                                    else color = 'bg-slate-400 text-white border-slate-500';
                                }
                                return `<div class="aspect-square border-2 rounded-lg flex items-center justify-center font-black text-xl uppercase ${color}">${char}</div>`;
                            }).join('')}
                        </div>
                    `;
                }).join('')}
            </div>

            ${!q.isGameOver ? `
                <div class="mt-8 flex flex-wrap justify-center gap-1 max-w-sm mx-auto">
                    ${"QWERTYUIOPASDFGHJKLZXCVBNM".split('').map(letter => `
                        <button onclick="handleWQKey('${letter}')" class="bg-white p-3 rounded-lg font-bold shadow-sm border border-slate-100 hover:bg-blue-50">${letter}</button>
                    `).join('')}
                    <button onclick="handleWQKey('Backspace')" class="bg-slate-100 p-3 rounded-lg font-bold">⌫</button>
                    <button onclick="handleWQKey('Enter')" class="bg-blue-600 text-white px-6 rounded-lg font-bold">ENTER</button>
                </div>
            ` : `
                <div class="p-6 bg-white rounded-3xl shadow-xl">
                    <h3 class="text-2xl font-black mb-4">${q.currentGuess === q.target ? 'כל הכבוד! 🎉' : 'לא נורא...'}</h3>
                    <p class="mb-6">המילה הייתה: <b class="text-blue-600">${q.target}</b></p>
                    <button onclick="initWordQuest()" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">שחק שוב</button>
                </div>
            `}
        </div>
    `;
}

function handleWQKey(key) {
    const q = state.wordQuest;
    if (q.isGameOver) return;

    if (key === 'Enter') {
        if (q.currentGuess.length === q.target.length) {
            q.guesses.push(q.currentGuess);
            if (q.currentGuess === q.target) { q.isGameOver = true; triggerConfetti(); }
            else if (q.guesses.length >= q.maxAttempts) q.isGameOver = true;
            q.currentGuess = '';
        }
    } else if (key === 'Backspace') {
        q.currentGuess = q.currentGuess.slice(0, -1);
    } else if (q.currentGuess.length < q.target.length && /^[A-Z]$/.test(key.toUpperCase())) {
        q.currentGuess += key.toUpperCase();
    }
    render();
}

function decodeBase64(str) {
    try { return decodeURIComponent(escape(atob(str))); }
    catch (e) { return ''; }
}

function parseWordsFromURL() {
    const params = new URLSearchParams(window.location.search);
    const wParam = params.get('w');
    if (wParam) {
        const decoded = decodeBase64(wParam);
        if (decoded) {
            const lines = decoded.split('\n');
            state.listName = lines[0] || 'אוצר המילים שלי';
            state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
                const [eng, heb] = l.split('-').map(s => s.trim());
                return { eng, heb };
            });
        }
    }
}

// הפעלה ראשונית של האפליקציה
window.addEventListener('load', () => {
    parseWordsFromURL();
    render();
});

// תמיכה במקלדת למשחק הקוד הסודי
window.addEventListener('keydown', (e) => {
    if (state.screen === 'wordquest') handleWQKey(e.key);
});

function renderInputScreen(container) {
    container.innerHTML = `
        <div class="p-6 space-y-6 animate-fade-in">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-blue-100">
                <h2 class="text-2xl font-black text-slate-800 mb-4 text-center">יצירת רשימה חדשה 📝</h2>
                <p class="text-slate-500 text-sm mb-4 text-center italic">כתבו שם לרשימה בשורה הראשונה, ואז מילים במבנה: אנגלית - עברית</p>
                
                <textarea id="wordInput" class="w-full h-64 p-4 border-2 border-slate-100 rounded-2xl focus:border-blue-400 outline-none font-medium" 
                    placeholder="חיות\ndog - כלב\ncat - חתול"></textarea>
                
                <div class="flex gap-3 mt-6">
                    <button onclick="saveNewList()" class="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                        צור משחק! ✨
                    </button>
                </div>
            </div>
        </div>
    `;
}

function saveNewList() {
    const text = document.getElementById('wordInput').value.trim();
    if (!text) return alert("נא להזין מילים");

    const lines = text.split('\n');
    state.listName = lines[0];
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const [eng, heb] = l.split('-').map(s => s.trim());
        return { eng, heb };
    });

    if (state.words.length === 0) return alert("לא נמצאו מילים במבנה הנכון (אנגלית - עברית)");

    // יצירת קישור שיתוף אוטומטי
    const encoded = btoa(unescape(encodeURIComponent(text)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?w=${encoded}`;
    
    // מעבר למסך ברוכים הבאים
    state.screen = 'welcome';
    render();
    
    // מציע למשתמש להעתיק את הקישור שנוצר
    setTimeout(() => {
        if(confirm("הרשימה נוצרה! האם תרצה להעתיק את קישור השיתוף לוואטסאפ?")) {
            navigator.clipboard.writeText(shareUrl);
            alert("הקישור הועתק! עכשיו אפשר לשלוח אותו למי שרוצים.");
        }
    }, 500);
}
