// משתנים גלובליים
let currentWords = [];
let quizIndex = 0;
let score = 0;
let wrongAnswers = [];
let currentUnitName = "";

// פונקציית טעינה ראשונית
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const unitKey = params.get('unitKey');

    // אם הגענו מהספרייה עם מפתח יחידה
    if (unitKey && typeof courseData !== 'undefined') {
        loadFromLibrary(unitKey);
    }
};

// שליפת מילים מתוך data.js לפי המפתח מה-URL
function loadFromLibrary(unitKey) {
    // פירוק המפתח (למשל: Magical-Unit1-Part1)
    for (const book in courseData) {
        courseData[book].forEach(unit => {
            unit.parts.forEach(part => {
                const checkKey = `${book}-${unit.unit.replace(/\s+/g, '')}-${part.name.replace(/\s+/g, '')}`;
                if (checkKey === unitKey) {
                    document.getElementById('wordInput').value = `${unit.unit} - ${part.name}\n${part.words}`;
                    initApp(); // הפעלה אוטומטית של המשחק
                }
            });
        });
    }
}

function initApp() {
    const text = document.getElementById('wordInput').value.trim();
    if (!text) return;

    const lines = text.split('\n');
    currentUnitName = lines[0];
    currentWords = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('-');
        if (parts.length === 2) {
            currentWords.push({
                eng: parts[0].trim(),
                heb: parts[1].trim()
            });
        }
    }

    if (currentWords.length < 4) {
        alert("יש להזין לפחות 4 מילים");
        return;
    }

    showScreen('screen-quiz');
    startQuiz();
}

function startQuiz() {
    quizIndex = 0;
    score = 0;
    wrongAnswers = [];
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
    const allBtns = document.querySelectorAll('.opt-btn');
    allBtns.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add('correct');
        score++;
    } else {
        btn.classList.add('wrong');
        allBtns.forEach(b => {
            if (b.innerText === correct) b.classList.add('correct');
        });
        wrongAnswers.push(currentWords[quizIndex]);
    }

    setTimeout(() => {
        quizIndex++;
        if (quizIndex < currentWords.length) {
            showQuestion();
        } else {
            showSummary();
        }
    }, 1200);
}

function showSummary() {
    showScreen('screen-summary');
    const percent = Math.round((score / currentWords.length) * 100);
    document.getElementById('final-score').innerText = percent + "%";

    const btnC4 = document.getElementById('btn-c4');
    const btnMem = document.getElementById('btn-mem');
    const lockMsg = document.getElementById('lock-msg');

    if (percent >= 70) {
        btnC4.disabled = false;
        btnMem.disabled = false;
        lockMsg.innerText = "🔓 המשחקים פתוחים! כל הכבוד!";
    } else {
        btnC4.disabled = true;
        btnMem.disabled = true;
        lockMsg.innerText = "🔒 המשחקים ייפתחו ב-70% הצלחה";
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.card-box').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function speak(id) {
    const text = document.getElementById(id).innerText;
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}

function restartQuiz() {
    startQuiz();
}

// פונקציות שיתוף (וואטסאפ וקישור)
function shareAchievement() {
    const percent = document.getElementById('final-score').innerText;
    const text = `הצלחתי לקבל ${percent} ביחידה ${currentUnitName} ב-Word Academy! 🎓`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
}

function shareList() {
    const listText = document.getElementById('wordInput').value;
    const url = new URL(window.location.href);
    url.searchParams.set('list', listText);
    navigator.clipboard.writeText(url.href);
    alert("הקישור הועתק! ניתן לשלוח לתלמידים.");
}
