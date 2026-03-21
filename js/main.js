let currentWords = [];
let quizIndex = 0;
let score = 0;
let wrongAnswers = [];
let currentUnitName = "";

window.onload = () => {
    // בדיקה אם הגענו מהספרייה
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') === 'library') {
        const savedData = sessionStorage.getItem('currentWords');
        if (savedData) {
            document.getElementById('wordInput').value = savedData;
            initApp();
        }
    }
};

function initApp() {
    const text = document.getElementById('wordInput').value.trim();
    if (!text) return;

    const lines = text.split('\n');
    currentUnitName = lines[0]; // השורה הראשונה היא שם היחידה
    currentWords = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('-');
        if (parts.length === 2) {
            currentWords.push({ eng: parts[0].trim(), heb: parts[1].trim() });
        }
    }

    if (currentWords.length < 4) {
        alert("צריך לפחות 4 מילים למבחן");
        return;
    }

    // שלב 1: הצגת כרטיסיות לימוד
    renderFlashcards();
    showScreen('screen-intro');
}

// --- מכניקת כרטיסיות לימוד (Flashcards) ---
function renderFlashcards() {
    const container = document.getElementById('intro-cards');
    if (!container) return;
    
    container.innerHTML = '';
    currentWords.forEach(word => {
        const card = document.createElement('div');
        card.className = 'flashcard';
        card.innerHTML = `
            <div class="eng">${word.eng}</div>
            <div class="heb">${word.heb}</div>
        `;
        container.appendChild(card);
    });
    document.getElementById('intro-unit-name').innerText = currentUnitName;
}

// --- מכניקת המבחן ---
function startQuiz() {
    quizIndex = 0; 
    score = 0; 
    wrongAnswers = [];
    currentWords = [...currentWords].sort(() => Math.random() - 0.5);
    showScreen('screen-quiz');
    showQuestion();
}

function showQuestion() {
    const word = currentWords[quizIndex];
    document.getElementById('quiz-unit-display').innerText = currentUnitName;
    document.getElementById('quiz-progress').innerText = `שאלה ${quizIndex + 1} מתוך ${currentWords.length}`;
    document.getElementById('quiz-eng').innerText = word.eng;

    const options = [word.heb];
    while (options.length < 4) {
        const rand = currentWords[Math.floor(Math.random() * currentWords.length)].heb;
        if (!options.includes(rand)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    const container = document.getElementById('quiz-options');
    container.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(opt, btn);
        container.appendChild(btn);
    });
}

function checkAnswer(selected, btn) {
    const correct = currentWords[quizIndex].heb;
    const allButtons = document.querySelectorAll('.opt-btn');
    
    // מניעת לחיצות נוספות
    allButtons.forEach(b => b.style.pointerEvents = 'none');

    if (selected === correct) {
        btn.classList.add('correct');
        score++;
    } else {
        btn.classList.add('wrong');
        wrongAnswers.push(currentWords[quizIndex]);
        // הצגת התשובה הנכונה
        allButtons.forEach(b => {
            if(b.innerText === correct) b.classList.add('correct');
        });
    }

    setTimeout(() => {
        quizIndex++;
        if (quizIndex < currentWords.length) showQuestion();
        else showSummary();
    }, 1200);
}

// --- מסך סיכום ושיתוף ---
function showSummary() {
    showScreen('screen-summary');
    const percent = Math.round((score / currentWords.length) * 100);
    document.getElementById('final-score').innerText = percent + "%";
    
    const canPlay = percent >= 70;
    const btnC4 = document.getElementById('btn-c4');
    const btnMem = document.getElementById('btn-mem');
    const lockMsg = document.getElementById('lock-msg');

    if(btnC4) btnC4.disabled = !canPlay;
    if(btnMem) btnMem.disabled = !canPlay;
    if(lockMsg) lockMsg.innerText = canPlay ? "🔓 המשחקים פתוחים!" : "🔒 צריך 70% כדי לשחק";
}

function shareWatsapp() {
    const text = `הצלחתי במבחן המילים של Word Academy! יחידה: ${currentUnitName}. ציון: ${score}/${currentWords.length} (${Math.round((score/currentWords.length)*100)}%)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
}

function shareList() {
    const list = currentWords.map(w => `${w.eng} - ${w.heb}`).join('\n');
    const text = `רשימת המילים שלי ליחידה ${currentUnitName}:\n${list}`;
    navigator.clipboard.writeText(text).then(() => alert("הרשימה הועתקה! שלח אותה בוואטסאפ."));
}

function showScreen(id) {
    document.querySelectorAll('.card-box').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
}

function speak() {
    const text = document.getElementById('quiz-eng').innerText;
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}

function goHome() {
    window.location.href = 'library.html';
}
