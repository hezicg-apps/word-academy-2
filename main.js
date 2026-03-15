// --- בלוק 1: הגדרות יסוד (State) ---

let state = {
    screen: 'welcome', 
    inputText: '', 
    words: [],
    listName: 'אוצר המילים שלי',
    nightMode: false, 
    masteryScore: 0, 
    quizIndex: 0, 
    correctAnswers: 0,
    quizFeedback: { index: -1, status: null, correctIndex: -1 },
    
    // ניהול כיתה (חדש)
    classCode: '',
    studentName: '',
    
    // מצב משחקים
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false },
    connect4: { 
        board: Array(6).fill(null).map(() => Array(7).fill(null)), 
        turn: 1, q: null, canDrop: false, isAnswering: false, 
        showQuestionPrompt: true, fallingToken: null, isAiTurn: false, 
        isPvP: true, feedback: { status: null, selectedIdx: -1 } 
    },
    wordQuest: { 
        target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, 
        isGameOver: false, keyStates: {}, showTutorial: true, 
        roundIndex: 0, pool: [], completedCount: 0 
    },
    winner: null,
    showShareModal: false
};

// עזרים בסיסיים
function triggerConfetti() { 
    confetti({ 
        particleCount: 150, 
        spread: 70, 
        origin: { y: 0.6 },
        colors: ['#2563eb', '#7c3aed', '#db2777']
    }); 
}

function speak(text) { 
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text); 
    u.lang = 'en-US'; 
    u.rate = 0.9; 
    window.speechSynthesis.speak(u); 
}

function toggleNightMode() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('night-mode', state.nightMode);
    render();
}
function loadFromLocal() {
    const saved = localStorage.getItem('wordAcademyState');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.masteryScore = parsed.masteryScore || 0;
        state.nightMode = !!parsed.nightMode;
        if (state.nightMode) document.body.classList.add('night-mode');
    }
}
// --- בלוק 2: ניהול נתונים וקריאת URL (שמירה על לינקים קיימים) ---

function decodeBase64(str) {
    try {
        // פיענוח בשיטה שתומכת בעברית (UTF-8)
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        console.error("Error decoding base64", e);
        return '';
    }
}

function parseWords(text) {
    const lines = text.split('\n');
    // השורה הראשונה היא שם הרשימה
    state.listName = lines[0] || 'אוצר המילים שלי';
    
    // שאר השורות הן המילים (מילה - תרגום)
    state.words = lines.slice(1)
        .filter(line => line.includes('-'))
        .map(line => {
            const [eng, heb] = line.split('-').map(s => s.trim());
            return { 
                eng: eng.replace(/[\u200B-\u200D\uFEFF]/g, ''), 
                heb: heb.replace(/[\u200B-\u200D\uFEFF]/g, '') 
            };
        });
}

function initFromURL() {
    const params = new URLSearchParams(window.location.search);
    const encodedData = params.get('w');
    
    if (encodedData) {
        const decodedText = decodeBase64(encodedData);
        if (decodedText) {
            parseWords(decodedText);
            // אם הגיעו מילים מהלינק, נלך ישר למסך הלמידה
            state.screen = 'flashcards';
        }
    }
}

function shuffle(array) {
    // ערבוב רשימות (למשחקים ולמבחן)
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function saveToLocal() {
    localStorage.setItem('wordAcademyState', JSON.stringify({
        masteryScore: state.masteryScore,
        nightMode: state.nightMode
    }));
}
--- בלוק 3 ו בלוק 4 מאוחדים ---

    // --- בלוק 3 ו-4 מאוחדים ומתוקנים (בלי שגיאות תחביר) ---

function render() {
    const app = document.getElementById('app');
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none'; 
    
    app.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = "flex justify-between items-center p-6 bg-white border-b border-slate-100";
    header.innerHTML = `
        <div class="flex items-center gap-3">
            <img src="logo.svg" alt="WA" class="h-12 w-12 object-contain">
            <div class="flex flex-col text-left">
                <span class="text-blue-600 font-black text-2xl leading-none">Word Academy</span>
                <span class="text-[11px] font-bold text-slate-400 mt-1 text-left">תרגול אוצר מילים בכיף 🦉</span>
            </div>
        </div>
        <button onclick="toggleNightMode()" class="p-2 rounded-2xl bg-slate-50 hover:bg-slate-100 transition text-2xl">
            ${state.nightMode ? '🌙' : '☀️'}
        </button>
    `;
    app.appendChild(header);

    const content = document.createElement('div');
    content.id = "main-content";
    app.appendChild(content);

    if (state.screen === 'welcome') {
        content.innerHTML = `
            <div class="flex flex-col items-center text-center space-y-8 mt-16 p-6">
                <div class="bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-blue-100 w-full">
                    <h2 class="text-3xl font-black text-slate-800 mb-2">מוכנים?</h2>
                    <p class="text-slate-500 font-bold mb-8">ההרפתקה שלכם מתחילה כאן</p>
                    <button onclick="state.screen='flashcards'; render();" class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition">
                        בואו נתחיל! 🚀
                    </button>
                </div>
            </div>
        `;
    } else {
        renderAppScreens(content);
    }
}

function renderAppScreens(container) {
    if (state.words.length === 0) return;

    if (state.screen === 'flashcards') {
        const word = state.words[learningState.currentIndex];
        container.innerHTML = `
            <div class="p-4 space-y-6 text-center">
                <div class="space-y-1">
                    <h3 class="text-2xl font-black text-slate-800">${state.listName}</h3>
                    <p class="text-blue-600 font-bold">לימוד מילים (${learningState.knownWords.length}/${state.words.length})</p>
                </div>

                <div onclick="learningState.isFlipped = !learningState.isFlipped; render();" 
                     class="relative w-full aspect-[4/3] max-w-sm mx-auto cursor-pointer perspective-1000">
                    <div class="w-full h-full transition-all duration-500 preserve-3d ${learningState.isFlipped ? 'rotate-y-180' : ''}">
                        <div class="absolute inset-0 bg-white border-4 border-blue-100 rounded-[2.5rem] flex flex-col items-center justify-center shadow-xl backface-hidden">
                            <span class="text-blue-200 text-xs font-bold mb-4">לחצו על הכרטיסייה לסיבוב 🔄</span>
                            <h2 class="eng-text text-5xl font-black text-blue-600" lang="en">${word.eng}</h2>
                            <button onclick="event.stopPropagation(); speak('${word.eng.replace(/'/g, "\\'")}')" class="mt-4 text-4xl">🔊</button>
                        </div>
                        <div class="absolute inset-0 bg-blue-50 border-4 border-blue-200 rounded-[2.5rem] flex items-center justify-center shadow-xl backface-hidden rotate-y-180">
                            <h2 class="text-5xl font-black text-slate-800">${word.heb}</h2>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4 max-w-sm mx-auto">
                    <button onclick="nextWord(false)" class="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg">⌛ עוד לא</button>
                    <button onclick="nextWord(true)" class="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg">✅ יודע</button>
                </div>

                ${learningState.knownWords.length === state.words.length ? `
                    <button onclick="state.screen='quiz'; render();" class="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl animate-bounce mt-4">
                        אני מוכן לאתגר! 🏆
                    </button>
                ` : ''}
            </div>
        `;
    } else if (state.screen === 'quiz') {
        renderQuizScreen(container);
    } else if (state.screen === 'report') {
        renderReportScreen(container);
    } else if (state.screen === 'menu') {
        renderMenuScreen(container);
    } else {
        // קריאה למשחקים
        renderMemory(container);
    }
}

// --- בלוק 5: מנגנון המבחן (Quiz) ---

function renderQuizScreen(app) {
    if (state.screen !== 'quiz') {
        renderReportScreen(app);
        return;
    }

    const q = state.words[state.quizIndex];
    
    // יצירת תשובות (מסיחים) בצורה אקראית
    let choices = state.words
        .filter(w => w.eng !== q.eng)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.heb);
    choices.push(q.heb);
    choices.sort(() => 0.5 - Math.random());

    app.innerHTML = `
        <div class="p-6 space-y-8">
            <div class="flex justify-between items-center">
                <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div class="bg-blue-600 h-full transition-all" style="width: ${(state.quizIndex / state.words.length) * 100}%"></div>
                </div>
            </div>

            <div class="text-center space-y-4">
                <span class="text-sm font-bold text-slate-400 font-bold">איך אומרים בעברית?</span>
                <h2 class="eng-text text-5xl font-black text-blue-600" lang="en">${q.eng}</h2>
                <button onclick="speak('${q.eng.replace(/'/g, "\\'")}')" class="text-blue-400 hover:text-blue-600 font-bold text-sm">🔊 השמע שוב</button>
            </div>

            <div class="grid grid-cols-1 gap-3">
                ${choices.map((c, i) => {
                    let btnClass = "bg-white border-2 border-slate-100 text-slate-700 shadow-sm";
                    if (state.quizFeedback.index === i) {
                        btnClass = state.quizFeedback.status === 'correct' 
                            ? "bg-green-500 border-green-500 text-white shadow-lg scale-[1.02]" 
                            : "bg-red-500 border-red-500 text-white animate-shake";
                    }
                    return `
                        <button onclick="checkQuizAnswer(${i}, '${c}', '${q.heb}')" 
                            class="${btnClass} p-5 rounded-2xl font-bold text-lg transition-all flex justify-center items-center">
                            ${c}
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function checkQuizAnswer(idx, selected, correct) {
    if (state.quizFeedback.index !== -1) return;

    if (selected === correct) {
        state.quizFeedback = { index: idx, status: 'correct' };
        state.correctAnswers++;
        triggerConfetti();
    } else {
        state.quizFeedback = { index: idx, status: 'wrong' };
    }

    render();

    setTimeout(() => {
        state.quizFeedback = { index: -1, status: null };
        if (state.quizIndex < state.words.length - 1) {
            state.quizIndex++;
        } else {
            const score = Math.round((state.correctAnswers / state.words.length) * 100);
            state.masteryScore = score;
            state.screen = 'report';
        }
        render();
    }, 1500);
}

// --- בלוק 6 מעודכן: מסך סיום ודיווח ---

function renderReportScreen(container) {
    if (state.screen !== 'report') {
        renderMenuScreen(container);
        return;
    }

    container.innerHTML = `
        <div class="p-6 text-center space-y-6">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-yellow-400 relative overflow-hidden">
                <div class="text-4xl mb-2">✨ כל הכבוד! ✨</div>
                <div class="text-slate-500 font-bold mb-4">${state.listName}</div>
                <div class="text-7xl font-black text-yellow-400 mb-2">${state.masteryScore}%</div>
                <div class="text-xl font-bold text-slate-700">ענית נכון על ${state.correctAnswers} מתוך ${state.words.length}</div>
            </div>

            <div class="bg-blue-50 p-6 rounded-[2.5rem] border-2 border-blue-100 space-y-4">
                <p class="text-blue-800 font-bold">דיווח למורה:</p>
                <input type="text" id="studentName" placeholder="שם מלא" class="w-full p-4 rounded-2xl border-none shadow-inner text-center font-bold">
                <select id="studentClass" class="w-full p-4 rounded-2xl border-none shadow-inner text-center font-bold appearance-none bg-white">
                    <option>בחר כיתה...</option>
                    <option>ג'1</option><option>ג'2</option><option>ד'1</option><option>ד'2</option>
                </select>
                <button onclick="submitReport(${state.masteryScore})" class="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-lg shadow-md hover:bg-green-600 transition flex items-center justify-center gap-2">
                    <span>✅</span> שלח תוצאה
                </button>
            </div>

            <div class="flex flex-col gap-3">
                <button onclick="state.screen='flashcards'; learningState.knownWords=[]; render();" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2">
                    <span>🔄</span> תרגול חוזר
                </button>
                <button onclick="state.screen='menu'; render();" class="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2">
                    <span>🏠</span> חזרה לתפריט
                </button>
            </div>
        </div>
    `;
}

// --- בלוק 7: משחק הזיכרון (Memory Game) ---

function initMemoryGame() {
    let cards = [];
    state.words.forEach((w, i) => {
        // יוצרים שני קלפים לכל מילה: אחד אנגלי ואחד עברי
        cards.push({ id: i, type: 'eng', content: w.eng, matched: false });
        cards.push({ id: i, type: 'heb', content: w.heb, matched: false });
    });
    
    state.memoryGame = {
        cards: shuffle(cards),
        flipped: [],
        pairs: 0,
        steps: 0,
        isProcessing: false
    };
    state.screen = 'memory';
    render();
}

function handleMemoryClick(index) {
    const game = state.memoryGame;
    
    // מניעת לחיצה אם: הקלף כבר גלוי, כבר נמצאה לו התאמה, או שהמערכת מעבדת זוג קודם
    if (game.isProcessing || game.flipped.includes(index) || game.cards[index].matched) return;

    game.flipped.push(index);
    render();

    if (game.flipped.length === 2) {
        game.steps++;
        game.isProcessing = true;
        const [i1, i2] = game.flipped;
        
        // בדיקה אם המזהה (ID) זהה אך הסוג (עברית/אנגלית) שונה
        if (game.cards[i1].id === game.cards[i2].id && game.cards[i1].type !== game.cards[i2].type) {
            game.cards[i1].matched = true;
            game.cards[i2].matched = true;
            game.pairs++;
            game.flipped = [];
            game.isProcessing = false;
            
            if (game.pairs === state.words.length) {
                triggerConfetti();
            }
            render();
        } else {
            // אם אין התאמה, מחכים שנייה והופכים חזרה
            setTimeout(() => {
                game.flipped = [];
                game.isProcessing = false;
                render();
            }, 1000);
        }
    }
}

function renderMemory(app) {
    if (state.screen !== 'memory') {
        renderConnect4(app); // קריאה למשחק הבא בשרשרת
        return;
    }

    const game = state.memoryGame;
    app.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border-b-2 border-slate-100">
                <button onclick="state.screen='menu'; render();" class="text-blue-600 font-bold flex items-center gap-1">
                    <span>⬅️</span> תפריט
                </button>
                <div class="font-black text-slate-700 underline decoration-blue-400 decoration-2">מהלכים: ${game.steps}</div>
            </div>
            
            <div class="grid grid-cols-3 gap-3">
                ${game.cards.map((card, i) => {
                    const isFlipped = game.flipped.includes(i) || card.matched;
                    return `
                        <div onclick="handleMemoryClick(${i})" 
                             class="h-28 rounded-2xl shadow-md cursor-pointer transition-all duration-300 flex items-center justify-center p-2 text-center font-bold
                             ${isFlipped ? 'bg-white border-2 border-blue-400' : 'bg-blue-600 hover:bg-blue-500'}">
                            <span class="${isFlipped ? 'block' : 'hidden'} ${card.type === 'eng' ? 'eng-text text-blue-600 text-xl' : 'text-slate-700 text-lg'}">
                                ${card.content}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
            
            ${game.pairs === state.words.length ? `
                <button onclick="initMemoryGame()" class="w-full bg-green-500 text-white py-4 rounded-2xl font-black shadow-lg">שחק שוב! 🔄</button>
            ` : ''}
        </div>
    `;
}

// --- בלוק 8: משחק 4 בשורה (Connect 4) ---

function initConnect4() {
    state.connect4 = { 
        board: Array(6).fill(null).map(() => Array(7).fill(null)), 
        turn: 1, q: null, canDrop: false, isAnswering: false, 
        showQuestionPrompt: true, isAiTurn: false, feedback: { status: null, selectedIdx: -1 } 
    };
    state.screen = 'connect4';
    prepareC4Question();
    render();
}

function prepareC4Question() {
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    let choices = state.words.filter(w => w.eng !== q.eng).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.heb);
    choices.push(q.heb);
    state.connect4.q = { ...q, choices: shuffle(choices) };
    state.connect4.isAnswering = true;
}

function checkC4Answer(idx, selected) {
    const game = state.connect4;
    if (selected === game.q.heb) {
        game.feedback = { status: 'correct', selectedIdx: idx };
        triggerConfetti();
        setTimeout(() => {
            game.isAnswering = false;
            game.canDrop = true;
            game.feedback = { status: null, selectedIdx: -1 };
            render();
        }, 1000);
    } else {
        game.feedback = { status: 'wrong', selectedIdx: idx };
        setTimeout(() => {
            game.feedback = { status: null, selectedIdx: -1 };
            prepareC4Question();
            render();
        }, 1000);
    }
    render();
}

function dropToken(col) {
    const game = state.connect4;
    if (!game.canDrop || game.isAiTurn) return;

    for (let r = 5; r >= 0; r--) {
        if (!game.board[r][col]) {
            game.board[r][col] = 1;
            game.canDrop = false;
            if (checkWin(r, col, 1)) {
                state.winner = 'השחקן';
            } else {
                game.isAiTurn = true;
                setTimeout(aiMove, 1000);
            }
            render();
            return;
        }
    }
}

function aiMove() {
    const game = state.connect4;
    let availableCols = [];
    for (let c = 0; c < 7; c++) if (!game.board[0][c]) availableCols.push(c);
    
    if (availableCols.length > 0) {
        const col = availableCols[Math.floor(Math.random() * availableCols.length)];
        for (let r = 5; r >= 0; r--) {
            if (!game.board[r][col]) {
                game.board[r][col] = 2;
                if (checkWin(r, col, 2)) state.winner = 'המחשב';
                break;
            }
        }
    }
    game.isAiTurn = false;
    prepareC4Question();
    render();
}

function checkWin(r, col, p) {
    const b = state.connect4.board;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        for (let s of [1, -1]) {
            let nr = r + dr*s, nc = col + dc*s;
            while (nr>=0 && nr<6 && nc>=0 && nc<7 && b[nr][nc] === p) {
                count++; nr += dr*s; nc += dc*s;
            }
        }
        if (count >= 4) return true;
    }
    return false;
}

function renderConnect4(app) {
    if (state.screen !== 'connect4') {
        renderWordQuest(app);
        return;
    }

    const game = state.connect4;
    app.innerHTML = `
        <div class="p-4 flex flex-col items-center h-full">
            <div class="w-full flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm">
                <button onclick="state.screen='menu'; state.winner=null; render();" class="text-red-500 font-bold">⬅️ יציאה</button>
                <div class="font-black">${state.winner ? 'המשחק נגמר!' : (game.isAnswering ? 'ענו על השאלה' : 'בחרו עמודה')}</div>
            </div>

            <div class="bg-blue-800 p-2 rounded-xl shadow-2xl grid grid-cols-7 gap-1 mb-4 w-full max-w-[350px]">
                ${game.board[0].map((_, c) => `
                    <div onclick="dropToken(${c})" class="h-10 w-full flex justify-center items-center cursor-pointer">
                        <div class="w-6 h-6 rounded-full bg-blue-700/50 hover:bg-white/30 transition"></div>
                    </div>
                `).join('')}
                ${game.board.map(row => row.map(cell => `
                    <div class="aspect-square bg-blue-900 rounded-full flex items-center justify-center shadow-inner">
                        ${cell === 1 ? '<div class="w-4/5 h-4/5 rounded-full bg-red-500 shadow-lg"></div>' : 
                          cell === 2 ? '<div class="w-4/5 h-4/5 rounded-full bg-yellow-400 shadow-lg"></div>' : ''}
                    </div>
                `).join('')).join('')}
            </div>

            ${game.isAnswering && !state.winner ? `
                <div class="w-full bg-white p-4 rounded-[2rem] shadow-xl border-t-4 border-red-400">
                    <p class="text-center text-sm font-bold text-slate-400 mb-2">תרגמו כדי לשחק:</p>
                    <h3 class="eng-text text-3xl font-black text-center text-blue-600 mb-4" lang="en">${game.q.eng}</h3>
                    <div class="grid grid-cols-2 gap-2">
                        ${game.q.choices.map((c, i) => {
                            let bClass = "bg-slate-50 text-slate-700 border-2 border-slate-100";
                            if (game.feedback.selectedIdx === i) {
                                bClass = game.feedback.status === 'correct' ? "bg-green-500 text-white" : "bg-red-500 text-white";
                            }
                            return `<button onclick="checkC4Answer(${i},'${c}')" class="${bClass} py-3 px-1 rounded-xl font-bold text-sm transition-all">${c}</button>`;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            ${state.winner ? `
                <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6 text-center">
                    <div class="bg-white p-8 rounded-[3rem] shadow-2xl space-y-4">
                        <h2 class="text-3xl font-black text-slate-800">הנצחון ל${state.winner}!</h2>
                        <button onclick="initConnect4(); state.winner=null; render();" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">שחק שוב 🔄</button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// --- בלוק 9: משחק הקוד הסודי (Word Quest) ושורת סיום ---

function initWordQuest() {
    const wordPool = state.words.filter(w => w.eng.length >= 3 && w.eng.length <= 6);
    if (wordPool.length === 0) {
        alert("נחוצות מילים באורך 3-6 אותיות למשחק זה");
        state.screen = 'menu';
        render();
        return;
    }
    const targetWord = wordPool[Math.floor(Math.random() * wordPool.length)];
    state.wordQuest = {
        target: targetWord.eng.toLowerCase(),
        hint: targetWord.heb,
        guesses: [],
        currentGuess: '',
        maxAttempts: 6,
        isGameOver: false,
        keyStates: {}
    };
    state.screen = 'wordquest';
    render();
}

function handleKey(char) {
    const q = state.wordQuest;
    if (q.isGameOver) return;
    if (char === 'BACKSPACE') q.currentGuess = q.currentGuess.slice(0, -1);
    else if (char === 'ENTER') {
        if (q.currentGuess.length === q.target.length) {
            q.guesses.push(q.currentGuess);
            if (q.currentGuess === q.target) {
                q.isGameOver = true;
                triggerConfetti();
            } else if (q.guesses.length >= q.maxAttempts) {
                q.isGameOver = true;
            }
            q.currentGuess = '';
        }
    } else if (q.currentGuess.length < q.target.length && /^[a-z]$/.test(char)) {
        q.currentGuess += char;
    }
    render();
}

function renderWordQuest(app) {
    if (state.screen !== 'wordquest') return;
    const q = state.wordQuest;
    app.innerHTML = `
        <div class="p-4 flex flex-col items-center h-full max-w-sm mx-auto">
            <div class="w-full flex justify-between items-center mb-6">
                <button onclick="state.screen='menu'; render();" class="text-blue-600 font-bold">⬅️ תפריט</button>
                <div class="bg-blue-100 px-4 py-1 rounded-full text-blue-800 font-black">רמז: ${q.hint}</div>
            </div>

            <div class="grid gap-2 mb-8">
                ${Array.from({length: q.maxAttempts}).map((_, rowIndex) => {
                    const guess = q.guesses[rowIndex] || (rowIndex === q.guesses.length ? q.currentGuess : '');
                    return `<div class="flex gap-2">
                        ${Array.from({length: q.target.length}).map((_, colIndex) => {
                            const char = guess[colIndex] || '';
                            let bgColor = 'bg-white border-2 border-slate-200';
                            if (q.guesses[rowIndex]) {
                                if (char === q.target[colIndex]) bgColor = 'bg-green-500 border-green-500 text-white';
                                else if (q.target.includes(char)) bgColor = 'bg-yellow-400 border-yellow-400 text-white';
                                else bgColor = 'bg-slate-400 border-slate-400 text-white';
                            }
                            return `<div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl uppercase eng-text shadow-sm ${bgColor}">${char}</div>`;
                        }).join('')}
                    </div>`;
                }).join('')}
            </div>

            <div class="w-full grid grid-cols-10 gap-1 mb-4">
                ${'qwertyuiopasdfghjklzxcvbnm'.split('').map(l => `
                    <button onclick="handleKey('${l}')" class="bg-white p-2 rounded shadow text-sm font-bold uppercase hover:bg-slate-100">${l}</button>
                `).join('')}
                <button onclick="handleKey('ENTER')" class="col-span-3 bg-blue-600 text-white p-2 rounded shadow font-bold">ENTER</button>
                <button onclick="handleKey('BACKSPACE')" class="col-span-3 bg-slate-200 p-2 rounded shadow font-bold">DEL</button>
            </div>

            ${q.isGameOver ? `
                <div class="text-center space-y-2">
                    <p class="font-black text-xl">${q.guesses.includes(q.target) ? 'מצאתם את הקוד!' : 'אולי בפעם הבאה...'}</p>
                    <p class="eng-text text-2xl text-blue-600 font-bold uppercase">${q.target}</p>
                    <button onclick="initWordQuest()" class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg">שחק שוב 🔄</button>
                </div>
            ` : ''}
        </div>
    `;
}

// --- שורות הפעלה סופיות (הדובדבן שבקצפת) ---

// מאזין למקלדת עבור משחק הקוד הסודי
window.addEventListener('keydown', (e) => {
    if (state.screen === 'wordquest') {
        const key = e.key.toUpperCase();
        if (key === 'ENTER' || key === 'BACKSPACE') handleKey(key);
        else if (/^[A-Z]$/.test(key)) handleKey(key.toLowerCase());
    }
});

// הפעלת האפליקציה בטעינה
loadFromLocal();
initFromURL();
render();
