// משתנה ה-state המקורי שהמשחקים (memory/connect4) מסתמכים עליו
let state = { 
    words: [], 
    unit: '', 
    qIdx: 0, 
    qCorrect: 0, 
    score: 0 
};

window.onload = () => {
    // בדיקה אם הגענו מהספרייה החדשה
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') === 'library') {
        const savedData = sessionStorage.getItem('currentWords');
        if (savedData) {
            document.getElementById('wordInput').value = savedData;
            initApp();
        }
    } 
    // תמיכה בלינקים ישנים (שיתוף רשימה)
    else if (params.has('list')) {
        try {
            const data = JSON.parse(decodeURIComponent(escape(atob(params.get('list')))));
            document.getElementById('wordInput').value = data.u + '\n' + data.w.map(x => `${x.eng} - ${x.heb}`).join('\n');
            initApp();
        } catch (e) { console.error("Error loading shared list"); }
    }
};

function showScreen(id) {
    // מסתיר את כל התיבות ומציג את הנבחרת
    document.querySelectorAll('.card-box').forEach(d => d.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

function initApp() {
    const input = document.getElementById('wordInput').value.trim();
    const lines = input.split('\n');
    if (lines.length < 2) return;

    state.unit = lines[0]; // שם היחידה
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts[1].trim() };
    });

    if (state.words.length < 4) {
        alert("צריך לפחות 4 מילים כדי להתחיל.");
        return;
    }

    // החזרת שלב כרטיסיות הלימוד לפני המבחן
    renderFlashcards();
    showScreen('screen-intro');
}

function renderFlashcards() {
    const container = document.getElementById('intro-cards');
    if (!container) return;
    
    container.innerHTML = '';
    state.words.forEach(word => {
        const card = document.createElement('div');
        card.className = 'flashcard';
        card.innerHTML = `<div class="eng">${word.eng}</div><div class="heb">${word.heb}</div>`;
        container.appendChild(card);
    });
    // עדכון שם היחידה בכותרת של מסך הלימוד
    const title = document.getElementById('intro-unit-name');
    if (title) title.innerText = state.unit;
}

function restartQuiz() {
    state.qIdx = 0; 
    state.qCorrect = 0;
    // ערבוב המילים
    state.words = [...state.words].sort(() => Math.random() - 0.5);
    showScreen('screen-quiz');
    showQuestion();
}

function showQuestion() {
    const word = state.words[state.qIdx];
    document.getElementById('quiz-unit-display').innerText = state.unit;
    document.getElementById('quiz-progress').innerText = `שאלה ${state.qIdx + 1} מתוך ${state.words.length}`;
    document.getElementById('quiz-eng').innerText = word.eng;

    // יצירת מסיחים (תשובות לא נכונות)
    let options = [word.heb];
    while (options.length < 4 && options.length < state.words.length) {
        const rand = state.words[Math.floor(Math.random() * state.words.length)].heb;
        if (!options.includes(rand)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    const cont = document.getElementById('quiz-options');
    cont.innerHTML = '';
    options.forEach(opt => {
        const b = document.createElement('button');
        b.className = 'opt-btn';
        b.innerText = opt;
        b.onclick = () => checkAnswer(opt, b);
        cont.appendChild(b);
    });
}

function checkAnswer(selected, btn) {
    const correct = state.words[state.qIdx].heb;
    const allButtons = document.querySelectorAll('.opt-btn');
    allButtons.forEach(b => b.style.pointerEvents = 'none');

    if (selected === correct) {
        btn.classList.add('correct');
        state.qCorrect++;
    } else {
        btn.classList.add('wrong');
        allButtons.forEach(b => {
            if (b.innerText === correct) b.classList.add('correct');
        });
    }

    setTimeout(() => {
        state.qIdx++;
        if (state.qIdx < state.words.length) showQuestion();
        else endQuiz();
    }, 1200);
}

function endQuiz() {
    state.score = Math.round((state.qCorrect / state.words.length) * 100);
    document.getElementById('final-score').innerText = state.score + '%';
    
    const isOpen = state.score >= 70;
    const btnC4 = document.getElementById('btn-c4');
    const btnMem = document.getElementById('btn-mem');
    
    if (btnC4) btnC4.disabled = !isOpen;
    if (btnMem) btnMem.disabled = !isOpen;
    
    const lockMsg = document.getElementById('lock-msg');
    if (lockMsg) lockMsg.innerText = isOpen ? "🔓 המשחקים פתוחים!" : "🔒 צריך 70% כדי לשחק";
    
    showScreen('screen-summary');
}

function speak(text) {
    const msg = new SpeechSynthesisUtterance(text || document.getElementById('quiz-eng').innerText);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}

function shareWatsapp() {
    const text = `הצלחתי לסיים את "${state.unit}" בציון ${state.score}% ב-Word Academy!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
}

function shareList() {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify({ u: state.unit, w: state.words }))));
    const link = `${window.location.href.split('?')[0]}?list=${data}`;
    const shareText = `הנה רשימת המילים שלי לתרגול ב-Word Academy:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
}

function goHome() {
    window.location.href = 'library.html';
}
