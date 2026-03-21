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
            initApp(); // מתחיל את המשחק אוטומטית
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

    showScreen('screen-quiz');
    startQuiz();
}

// לוגיקת המבחן (הקוד המקורי שלך שנשאר ללא שינוי)
function startQuiz() {
    quizIndex = 0; score = 0; wrongAnswers = [];
    currentWords = currentWords.sort(() => Math.random() - 0.5);
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
    if (selected === correct) {
        btn.classList.add('correct');
        score++;
    } else {
        btn.classList.add('wrong');
        wrongAnswers.push(currentWords[quizIndex]);
    }

    setTimeout(() => {
        quizIndex++;
        if (quizIndex < currentWords.length) showQuestion();
        else showSummary();
    }, 1000);
}

function showSummary() {
    showScreen('screen-summary');
    const percent = Math.round((score / currentWords.length) * 100);
    document.getElementById('final-score').innerText = percent + "%";
    
    const canPlay = percent >= 70;
    document.getElementById('btn-c4').disabled = !canPlay;
    document.getElementById('btn-mem').disabled = !canPlay;
    document.getElementById('lock-msg').innerText = canPlay ? "🔓 המשחקים פתוחים!" : "🔒 צריך 70% כדי לשחק";
}

function showScreen(id) {
    document.querySelectorAll('.card-box').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function speak() {
    const text = document.getElementById('quiz-eng').innerText;
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}
