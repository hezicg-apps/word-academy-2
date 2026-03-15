// --- בלוק 1: הגדרות מדינה, עזרים וניהול נתונים ---
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
    memoryGame: { cards: [], flipped: [], pairs: 0, steps: 0, isProcessing: false },
    connect4: { board: Array(6).fill(null).map(() => Array(7).fill(null)), turn: 1, q: null, canDrop: false, isAnswering: false, showQuestionPrompt: true, fallingToken: null, isAiTurn: false, isPvP: true, feedback: { status: null, selectedIdx: -1 } },
    wordQuest: { 
        target: '', hint: '', guesses: [], currentGuess: '', maxAttempts: 5, 
        isGameOver: false, keyStates: {}, showTutorial: true, 
        roundIndex: 0, pool: [], completedCount: 0 
    },
    winner: null,
    showShareModal: false
};

// --- עזרים ---
function triggerConfetti() { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
function speak(text) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8; window.speechSynthesis.speak(u); }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function saveToLocal() {
    localStorage.setItem('wm_words', JSON.stringify(state.words));
    localStorage.setItem('wm_input', state.inputText);
    localStorage.setItem('wm_mastery', state.masteryScore);
    localStorage.setItem('wm_listName', state.listName);
}

// --- פונקציית הדיווח המעודכנת (משולבת בתוך הלוגיקה) ---
function handleReportAndContinue() {
    const name = document.getElementById('studentName').value;
    const sClass = document.getElementById('studentClass').value;
    
    if (!name || !sClass) { 
        alert("נא למלא שם ולבחור כיתה"); 
        return; 
    }

    const finalScore = Math.round((state.correctAnswers / state.words.length) * 100);
    
    // שליחה ל-Google Forms
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSe5yaCbYBN4wTU0VCw9TXi3nawnT4fg_fhtVl4Uw0jD2X_T3g/formResponse";
    const iframe = document.createElement('iframe');
    iframe.name = 'hidden_iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.action = formUrl;
    form.method = "POST";
    form.target = "hidden_iframe";

    const fields = {
        'entry.627334846': name,
        'entry.737005448': sClass,
        'entry.803256071': state.listName,
        'entry.1607469246': finalScore
    };

    for (let key in fields) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = fields[key];
        form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();

    // עדכון תצוגה והמשך למשחקים
    const reportSection = document.getElementById('reportSection');
    reportSection.innerHTML = `
        <div class="space-y-4 animate-fade-in text-center">
            <div class="p-4 bg-green-100 text-green-700 rounded-xl font-bold border-2 border-green-200">
                הדיווח נשלח בהצלחה למורה 🕊️
            </div>
            <button onclick="state.screen='menu'; render();" 
                class="w-full py-5 bg-blue-600 text-white rounded-2xl text-2xl font-black shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                המשך למשחקים 🎮 ⮕
            </button>
        </div>`;
}

// --- בלוק 2: מנוע הרינדור וה-Header ---

function render() {
    const app = document.getElementById('app');
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';
    app.innerHTML = '';

    // Header - עיצוב מותאם אישית: לוגו ושם משמאל, יום/לילה מימין
    const header = document.createElement('div');
    header.className = "flex justify-between items-center p-6 bg-white border-b border-slate-100";
    header.innerHTML = `
        <div class="flex items-center gap-3 text-left">
            <img src="logo.svg" alt="WA" class="h-12 w-12 object-contain">
            <div class="flex flex-col">
                <span class="text-blue-600 font-black text-2xl leading-none">Word Academy</span>
                <span class="text-[11px] font-bold text-slate-400 mt-1">תרגול אוצר מילים בכיף 🦉</span>
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

    // ניתוב מסכים
    if (state.screen === 'welcome') {
        renderWelcomeScreen(content);
    } else if (state.screen === 'flashcards') {
        renderFlashcardsScreen(content);
    } else if (state.screen === 'quiz') {
        renderQuizScreen(content);
    } else if (state.screen === 'report') {
        renderReportScreen(content);
    } else if (state.screen === 'menu') {
        renderMenuScreen(content);
    } else {
        renderGameScreens(content); // משחקי הזיכרון, 4 בשורה וכו'
    }
}

// --- בלוק 3: כרטיסיות לימוד (Flip Cards) ---

let learningState = { currentIndex: 0, isFlipped: false, knownWords: [] };

function renderFlashcardsScreen(container) {
    if (state.words.length === 0) return;
    const word = state.words[learningState.currentIndex];

    container.innerHTML = `
        <div class="p-4 space-y-6 text-center animate-fade-in">
            <div class="space-y-1">
                <h3 class="text-2xl font-black text-slate-800">${state.listName}</h3>
                <p class="text-blue-600 font-bold">לימוד מילים (${learningState.knownWords.length}/${state.words.length})</p>
            </div>

            <div onclick="learningState.isFlipped = !learningState.isFlipped; render();" 
                 class="relative w-full aspect-[4/3] max-w-sm mx-auto cursor-pointer perspective-1000">
                <div class="w-full h-full transition-all duration-500 preserve-3d ${learningState.isFlipped ? 'rotate-y-180' : ''}">
                    
                    <div class="absolute inset-0 bg-white border-4 border-blue-100 rounded-[2.5rem] flex flex-col items-center justify-center shadow-xl backface-hidden">
                        <div class="bg-blue-50 px-4 py-1 rounded-full text-blue-400 text-xs font-bold mb-4 flex items-center gap-2">
                            <span>🔄</span> לחצו על הכרטיסייה לסיבוב
                        </div>
                        <h2 class="eng-text text-5xl font-black text-blue-600" lang="en">${word.eng}</h2>
                        <button onclick="event.stopPropagation(); speak('${word.eng}')" class="mt-6 p-4 bg-slate-50 rounded-full hover:bg-blue-50 transition shadow-sm">
                            <span class="text-3xl">🔊</span>
                        </button>
                    </div>

                    <div class="absolute inset-0 bg-blue-50 border-4 border-blue-200 rounded-[2.5rem] flex items-center justify-center shadow-xl backface-hidden rotate-y-180">
                        <h2 class="text-5xl font-black text-slate-800">${word.heb}</h2>
                    </div>
                </div>
            </div>

            <div class="flex gap-4 max-w-sm mx-auto">
                <button onclick="nextLearningWord(false)" class="flex-1 bg-orange-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:bg-orange-700 transition active:scale-95 flex items-center justify-center gap-2">
                    <span>⌛</span> עוד לא
                </button>
                <button onclick="nextLearningWord(true)" class="flex-1 bg-green-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:bg-green-700 transition active:scale-95 flex items-center justify-center gap-2">
                    <span>✅</span> יודע
                </button>
            </div>

            ${learningState.knownWords.length === state.words.length ? `
                <div class="pt-4">
                    <button onclick="state.screen='quiz'; render();" class="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-2xl shadow-xl animate-bounce border-b-4 border-blue-800">
                        אני מוכן לאתגר! 🏆
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function nextLearningWord(isKnown) {
    if (isKnown && !learningState.knownWords.includes(learningState.currentIndex)) {
        learningState.knownWords.push(learningState.currentIndex);
    }

    // בחירת המילה הבאה (מדלג על מה שכבר יודעים אם יש כאלו)
    let nextIndex = (learningState.currentIndex + 1) % state.words.length;
    
    // אם לא סיימנו הכל, נחפש את המילה הבאה שעדיין לא "ידועה"
    if (learningState.knownWords.length < state.words.length) {
        while (learningState.knownWords.includes(nextIndex)) {
            nextIndex = (nextIndex + 1) % state.words.length;
        }
    }

    learningState.currentIndex = nextIndex;
    learningState.isFlipped = false;
    render();
}

// --- בלוק 4: מנגנון הבוחן (Quiz) ---

function renderQuizScreen(container) {
    const q = state.words[state.quizIndex];
    if (!q) return;

    // יצירת מסיחים (תשובות לא נכונות)
    let choices = state.words
        .filter(w => w.eng !== q.eng)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.heb);
    choices.push(q.heb);
    choices = shuffle(choices);

    const progress = (state.quizIndex / state.words.length) * 100;

    container.innerHTML = `
        <div class="p-6 space-y-8 text-center animate-fade-in">
            <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                <div class="bg-blue-600 h-full transition-all duration-500" style="width: ${progress}%"></div>
            </div>

            <div class="space-y-2">
                <p class="text-slate-400 font-bold uppercase tracking-widest text-sm">Translate to Hebrew</p>
                <h2 class="eng-text text-6xl font-black text-blue-600 drop-shadow-sm">${q.eng}</h2>
                <button onclick="speak('${q.eng}')" class="text-2xl p-2 hover:scale-110 transition">🔊</button>
            </div>

            <div class="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                ${choices.map((choice, i) => `
                    <button onclick="checkQuizAnswer(this, '${choice}', '${q.heb}')" 
                        class="bg-white p-5 rounded-[1.5rem] font-bold text-xl border-2 border-slate-100 shadow-sm hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95">
                        ${choice}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function checkQuizAnswer(btn, selected, correct) {
    if (selected === correct) {
        state.correctAnswers++;
        btn.classList.add('bg-green-500', 'text-white', 'border-green-500');
        triggerConfetti();
    } else {
        btn.classList.add('bg-red-500', 'text-white', 'border-red-500', 'animate-shake');
    }

    // השהיה קלה כדי שהתלמיד יראה את המשוב (נכון/לא נכון)
    setTimeout(() => {
        if (state.quizIndex < state.words.length - 1) {
            state.quizIndex++;
            render();
        } else {
            state.masteryScore = Math.round((state.correctAnswers / state.words.length) * 100);
            state.screen = 'report';
            render();
        }
    }, 600);
}

// --- בלוק 5: מסך סיכום ודיווח למורה ---

function renderReportScreen(container) {
    container.innerHTML = `
        <div class="p-6 text-center space-y-6 animate-fade-in">
            <div class="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-yellow-400 relative">
                <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-white px-6 py-1 rounded-full font-black shadow-md">
                    FINISH!
                </div>
                <h2 class="text-3xl font-black text-slate-800 mb-2">כל הכבוד!</h2>
                <div class="text-8xl font-black text-yellow-400 mb-2">${state.masteryScore}%</div>
                <p class="text-lg font-bold text-slate-500">ענית נכון על ${state.correctAnswers} מתוך ${state.words.length}</p>
            </div>

            <div id="reportSection" class="bg-blue-50 p-6 rounded-[2.5rem] border-2 border-blue-100 space-y-4 shadow-inner">
                <p class="text-blue-800 font-bold">דיווח למורה כדי לפתוח משחקים:</p>
                
                <input type="text" id="studentName" placeholder="מה השם שלך?" 
                    class="w-full p-5 rounded-2xl border-none shadow-md text-center font-bold text-lg focus:ring-4 focus:ring-blue-200 outline-none">
                
                <select id="studentClass" 
                    class="w-full p-5 rounded-2xl border-none shadow-md text-center font-bold text-lg appearance-none bg-white focus:ring-4 focus:ring-blue-200 outline-none">
                    <option value="">בחר כיתה...</option>
                    <option value="ג1">ג' 1</option><option value="ג2">ג' 2</option>
                    <option value="ד1">ד' 1</option><option value="ד2">ד' 2</option>
                    <option value="ה1">ה' 1</option><option value="ה2">ה' 2</option>
                    <option value="ו1">ו' 1</option><option value="ו2">ו' 2</option>
                </select>

                <button onclick="handleReportAndContinue()" 
                    class="w-full bg-green-500 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:bg-green-600 transition-all flex items-center justify-center gap-3">
                    <span>✅</span> שלח ופתח משחקים
                </button>
            </div>

            <div class="flex flex-col gap-3">
                <button onclick="resetPractice()" 
                    class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                    <span>🔄</span> תרגול חוזר
                </button>
                <button onclick="state.screen='menu'; render();" 
                    class="w-full text-slate-400 font-bold hover:text-slate-600 transition">
                    חזרה לתפריט (ללא דיווח)
                </button>
            </div>
        </div>
    `;
}

function resetPractice() {
    state.quizIndex = 0;
    state.correctAnswers = 0;
    learningState.knownWords = [];
    state.screen = 'flashcards';
    render();
}

// --- בלוק 6: תפריט המשחקים ומשחק הזיכרון ---

function renderMenuScreen(container) {
    container.innerHTML = `
        <div class="p-6 space-y-6 animate-fade-in">
            <div class="text-center space-y-2">
                <h2 class="text-3xl font-black text-slate-800">מרכז המשחקים</h2>
                <p class="text-slate-500 font-bold">הצלחנו! עכשיו הגיע הזמן ליהנות מהמילים שלמדנו.</p>
            </div>

            <div class="grid grid-cols-1 gap-4">
                <button onclick="initMemoryGame()" class="group bg-white p-6 rounded-[2rem] shadow-md border-b-8 border-blue-400 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-4xl group-hover:bg-blue-200 transition">🧠</div>
                    <div class="text-left">
                        <h3 class="font-black text-xl text-slate-800">משחק הזיכרון</h3>
                        <p class="text-sm text-slate-400 font-bold uppercase tracking-tight">Memory Match</p>
                    </div>
                </button>

                <button onclick="initConnect4()" class="group bg-white p-6 rounded-[2rem] shadow-md border-b-8 border-red-400 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-6">
                    <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-4xl group-hover:bg-red-200 transition">🔴</div>
                    <div class="text-left">
                        <h3 class="font-black text-xl text-slate-800">4 בשורה</h3>
                        <p class="text-sm text-slate-400 font-bold uppercase tracking-tight">Connect 4 Quiz</p>
                    </div>
                </button>

                <button onclick="initWordQuest()" class="group bg-white p-6 rounded-[2rem] shadow-md border-b-8 border-green-400 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-6">
                    <div class="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-4xl group-hover:bg-green-200 transition">🕵️</div>
                    <div class="text-left">
                        <h3 class="font-black text-xl text-slate-800">הקוד הסודי</h3>
                        <p class="text-sm text-slate-400 font-bold uppercase tracking-tight">Word Quest</p>
                    </div>
                </button>
            </div>
        </div>
    `;
}

// לוגיקת משחק הזיכרון
function initMemoryGame() {
    let cards = [];
    state.words.forEach((w, i) => {
        cards.push({ id: i, type: 'eng', content: w.eng, matched: false });
        cards.push({ id: i, type: 'heb', content: w.heb, matched: false });
    });
    state.memoryGame = { cards: shuffle(cards), flipped: [], pairs: 0, steps: 0, isProcessing: false };
    state.screen = 'memory';
    render();
}

function renderMemory(container) {
    const g = state.memoryGame;
    container.innerHTML = `
        <div class="p-4 space-y-4 animate-fade-in">
            <div class="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                <button onclick="state.screen='menu'; render();" class="text-blue-600 font-black">⬅️ חזרה</button>
                <div class="text-slate-800 font-black">זוגות: ${g.pairs}/${state.words.length}</div>
            </div>
            
            <div class="grid grid-cols-3 gap-3">
                ${g.cards.map((card, i) => {
                    const isFlipped = g.flipped.includes(i) || card.matched;
                    return `
                        <div onclick="handleMemoryClick(${i})" 
                             class="h-28 rounded-2xl flex items-center justify-center text-center p-2 font-bold cursor-pointer transition-all duration-300 shadow-md
                             ${isFlipped ? 'bg-white border-2 border-blue-400 text-blue-600 rotate-y-180' : 'bg-blue-600 text-transparent'}">
                            <span class="${isFlipped ? 'block' : 'hidden'} ${card.type === 'eng' ? 'eng-text text-lg' : 'text-sm'}">
                                ${card.content}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function handleMemoryClick(i) {
    const g = state.memoryGame;
    if (g.isProcessing || g.flipped.includes(i) || g.cards[i].matched) return;
    
    g.flipped.push(i);
    render();

    if (g.flipped.length === 2) {
        g.isProcessing = true;
        const [idx1, idx2] = g.flipped;
        const card1 = g.cards[idx1];
        const card2 = g.cards[idx2];

        if (card1.id === card2.id && card1.type !== card2.type) {
            card1.matched = card2.matched = true;
            g.pairs++;
            g.flipped = [];
            g.isProcessing = false;
            if (g.pairs === state.words.length) {
                setTimeout(() => { triggerConfetti(); render(); }, 300);
            }
            render();
        } else {
            setTimeout(() => {
                g.flipped = [];
                g.isProcessing = false;
                render();
            }, 1000);
        }
    }
}

// --- בלוק 7: הקוד הסודי (Wordle Style) ---

function initWordQuest() {
    const pool = state.words.filter(w => w.eng.length >= 3 && w.eng.length <= 6);
    if (pool.length === 0) {
        alert("אוצר המילים קצר מדי למשחק הזה (צריך לפחות 3 אותיות)");
        state.screen = 'menu';
        render();
        return;
    }
    const target = pool[Math.floor(Math.random() * pool.length)];
    state.wordQuest = {
        target: target.eng.toLowerCase(),
        hint: target.heb,
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
        <div class="p-4 flex flex-col items-center space-y-6 animate-fade-in">
            <div class="w-full flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                <button onclick="state.screen='menu'; render();" class="text-green-600 font-black">⬅️ תפריט</button>
                <div class="bg-green-50 px-4 py-1 rounded-full text-green-700 font-black">רמז: ${q.hint}</div>
            </div>

            <div class="grid gap-2">
                ${Array.from({ length: q.maxAttempts }).map((_, rowIndex) => {
                    const guess = q.guesses[rowIndex] || (rowIndex === q.guesses.length ? q.currentGuess : '');
                    return `
                        <div class="flex gap-2">
                            ${Array.from({ length: q.target.length }).map((_, colIndex) => {
                                const char = guess[colIndex] || '';
                                let colorClass = "bg-white border-2 border-slate-200 text-slate-800";
                                
                                if (q.guesses[rowIndex]) {
                                    if (char === q.target[colIndex]) colorClass = "bg-green-500 border-green-500 text-white";
                                    else if (q.target.includes(char)) colorClass = "bg-yellow-400 border-yellow-400 text-white";
                                    else colorClass = "bg-slate-400 border-slate-400 text-white";
                                }
                                return `<div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl uppercase eng-text shadow-sm ${colorClass}">${char}</div>`;
                            }).join('')}
                        </div>
                    `;
                }).join('')}
            </div>

            ${!q.isGameOver ? `
                <div class="grid grid-cols-10 gap-1 w-full max-w-md">
                    ${'qwertyuiopasdfghjklzxcvbnm'.split('').map(l => `
                        <button onclick="handleWQKey('${l}')" class="bg-white p-3 rounded-lg shadow-sm font-bold uppercase text-slate-600 active:bg-slate-200 transition-all">${l}</button>
                    `).join('')}
                    <button onclick="handleWQKey('Enter')" class="col-span-3 bg-green-600 text-white p-3 rounded-lg font-black">ENTER</button>
                    <button onclick="handleWQKey('Backspace')" class="col-span-3 bg-slate-200 text-slate-600 p-3 rounded-lg font-black">DEL</button>
                </div>
            ` : `
                <div class="text-center p-6 bg-white rounded-3xl shadow-xl border-t-4 border-green-500">
                    <p class="text-xl font-black mb-2">${q.guesses.includes(q.target) ? 'כל הכבוד! גיליתם את הקוד! 🎉' : 'לא נורא, אולי בפעם הבאה...'}</p>
                    <p class="text-3xl font-black text-green-600 uppercase mb-4 tracking-widest">${q.target}</p>
                    <button onclick="initWordQuest()" class="bg-green-600 text-white px-8 py-3 rounded-xl font-black shadow-lg">שחק שוב 🕵️</button>
                </div>
            `}
        </div>
    `;
}

function handleWQKey(key) {
    const q = state.wordQuest;
    if (q.isGameOver) return;

    if (key === 'Backspace') {
        q.currentGuess = q.currentGuess.slice(0, -1);
    } else if (key === 'Enter') {
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
    } else if (q.currentGuess.length < q.target.length && /^[a-z]$/i.test(key)) {
        q.currentGuess += key.toLowerCase();
    }
    render();
}

// --- בלוק 8: משחק 4 בשורה (Connect 4) ולוגיקת סיום ---

function initConnect4() {
    state.connect4 = { 
        board: Array(6).fill(null).map(() => Array(7).fill(null)), 
        turn: 1, q: null, canDrop: false, isAnswering: true 
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
            <div class="w-full flex justify-between mb-4 px-2">
                <button onclick="state.screen='menu'; render();" class="text-red-500 font-black">⬅️ יציאה</button>
                <div class="font-black text-slate-700">תורך: ${g.turn === 1 ? '🔴 שחקן' : '🟡 מחשב'}</div>
            </div>

            <div class="bg-blue-700 p-3 rounded-[2rem] shadow-2xl grid grid-cols-7 gap-2 w-full max-w-[340px] border-b-8 border-blue-900">
                ${g.board[0].map((_, col) => `
                    <div onclick="handleC4Drop(${col})" class="h-6 w-full flex justify-center items-center cursor-pointer hover:bg-white/20 rounded-full transition-colors">
                        ${g.canDrop ? '👇' : ''}
                    </div>
                `).join('')}
                
                ${g.board.map(row => row.map(cell => `
                    <div class="aspect-square bg-blue-800 rounded-full flex items-center justify-center shadow-inner">
                        ${cell === 1 ? '<div class="w-4/5 h-4/5 bg-red-500 rounded-full shadow-lg animate-fade-in"></div>' : 
                          cell === 2 ? '<div class="w-4/5 h-4/5 bg-yellow-400 rounded-full shadow-lg animate-fade-in"></div>' : ''}
                    </div>
                `).join('')).join('')}
            </div>

            ${g.isAnswering ? `
                <div class="mt-6 bg-white p-6 rounded-[2.5rem] shadow-xl w-full max-w-sm border-t-4 border-blue-500 animate-bounce-in">
                    <p class="text-center text-slate-400 font-bold text-xs mb-1 uppercase">Answer to play</p>
                    <h3 class="eng-text text-3xl font-black text-center text-blue-600 mb-6">${g.q.eng}</h3>
                    <div class="grid grid-cols-2 gap-3">
                        ${g.q.choices.map(choice => `
                            <button onclick="handleC4Answer('${choice}')" 
                                class="bg-slate-50 p-4 rounded-2xl font-bold border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all">
                                ${choice}
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : g.canDrop ? `
                <div class="mt-6 p-4 bg-blue-100 text-blue-700 rounded-2xl font-black animate-pulse">
                    תשובה נכונה! בחר טור להפלת האסימון 🔴
                </div>
            ` : ''}

            ${state.winner ? `
                <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div class="bg-white p-10 rounded-[3rem] text-center shadow-2xl border-b-8 border-slate-200">
                        <div class="text-6xl mb-4">${state.winner === 'Player' ? '🏆' : '🤖'}</div>
                        <h2 class="text-3xl font-black mb-2">${state.winner === 'Player' ? 'ניצחתם!' : 'המחשב ניצח...'}</h2>
                        <p class="text-slate-500 font-bold mb-8">כל הכבוד על המאמץ!</p>
                        <button onclick="initConnect4()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg">שחק שוב</button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function handleC4Answer(selected) {
    if (selected === state.connect4.q.heb) {
        state.connect4.isAnswering = false;
        state.connect4.canDrop = true;
        render();
    } else {
        alert("לא נכון, נסה מילה אחרת");
        prepC4Question();
        render();
    }
}

function handleC4Drop(col) {
    const g = state.connect4;
    if (!g.canDrop || state.winner) return;

    for (let r = 5; r >= 0; r--) {
        if (!g.board[r][col]) {
            g.board[r][col] = 1; // שחקן (אדום)
            g.canDrop = false;
            if (checkC4Win(r, col, 1)) {
                state.winner = 'Player';
                triggerConfetti();
            } else {
                g.turn = 2;
                setTimeout(handleAiTurn, 600);
            }
            render();
            return;
        }
    }
}

function handleAiTurn() {
    const g = state.connect4;
    let availableCols = [];
    for (let c = 0; c < 7; c++) if (!g.board[0][c]) availableCols.push(c);

    if (availableCols.length > 0) {
        let col = availableCols[Math.floor(Math.random() * availableCols.length)];
        for (let r = 5; r >= 0; r--) {
            if (!g.board[r][col]) {
                g.board[r][col] = 2; // מחשב (צהוב)
                if (checkC4Win(r, col, 2)) state.winner = 'AI';
                break;
            }
        }
    }
    g.turn = 1;
    g.isAnswering = true;
    prepC4Question();
    render();
}

function checkC4Win(r, c, p) {
    const b = state.connect4.board;
    const directions = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of directions) {
        let count = 1;
        for (let step of [1, -1]) {
            let nr = r + dr * step, nc = c + dc * step;
            while (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && b[nr][nc] === p) {
                count++; nr += dr * step; nc += dc * step;
            }
        }
        if (count >= 4) return true;
    }
    return false;
}

// --- פונקציות הפעלה סופיות ---

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
            return true;
        }
    }
    return false;
}

function renderWelcomeScreen(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center text-center space-y-8 mt-16 p-6 animate-fade-in">
            <div class="bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-blue-100 w-full">
                <h2 class="text-3xl font-black text-slate-800 mb-2">מוכנים?</h2>
                <p class="text-slate-500 font-bold mb-8 italic">ההרפתקה שלכם ללימוד אנגלית מתחילה כאן</p>
                <button onclick="state.screen='flashcards'; render();" 
                    class="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                    בואו נתחיל! 🚀
                </button>
            </div>
            <div class="text-slate-400 font-bold text-sm">יצרתם רשימת מילים? היא תופיע כאן אוטומטית</div>
        </div>
    `;
}

// הפעלה ראשונית
window.addEventListener('load', () => {
    parseWordsFromURL();
    render();
});

// האזנה למקלדת עבור משחק הקוד הסודי
window.addEventListener('keydown', (e) => {
    if (state.screen === 'wordquest') handleWQKey(e.key);
});
