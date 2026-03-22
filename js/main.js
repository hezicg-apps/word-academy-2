// js/main.js

const firebaseConfig = {
  apiKey: "AIzaSyCD7Xb0xOyW5Objw0Q0Fu0HIyyMH2D7B_8",
  authDomain: "word-academy-8b91d.firebaseapp.com",
  projectId: "word-academy-8b91d",
  storageBucket: "word-academy-8b91d.firebasestorage.app",
  messagingSenderId: "422537496030",
  appId: "1:422537496030:web:c2264930ca04481213494f",
  measurementId: "G-D67J19K57G"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let state = { words: [], unit: '', qIdx: 0, qCorrect: 0, score: 0 };

// פונקציה לטעינה מהטבלה הענקית (1,200 מילים)
async function loadFromGoogleSheets(unitId) {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTrPQsiWxLFkuoC457oX5WytDYP7f0nFGaJlx87JiOWL-p085UZlhDMPfnKGW4p6MBlaiGOYTEMfdP_/pub?output=csv";
    try {
        const response = await fetch(sheetUrl);
        const csvData = await response.text();
        const rows = csvData.split('\n').map(row => row.split(','));
        const unitRows = rows.filter(r => r[0] && r[0].trim() === unitId);
        
        if (unitRows.length > 0) {
            state.unit = "Unit " + unitId;
            state.words = unitRows.map(r => ({
                eng: r[1] ? r[1].trim() : '',
                heb: r[2] ? r[2].trim() : ''
            })).filter(w => w.eng && w.heb);
            restartQuiz();
            return true;
        }
    } catch (e) { console.error("Sheet Error:", e); }
    return false;
}

window.onload = async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('unit')) {
        const uId = params.get('unit');
        const found = await loadFromGoogleSheets(uId);
        if (!found) {
            const doc = await db.collection("units").doc(uId).get();
            if (doc.exists) {
                state.unit = doc.data().title;
                state.words = doc.data().words;
                restartQuiz();
            }
        }
    } else if (params.has('list')) {
        try {
            const data = JSON.parse(decodeURIComponent(escape(atob(params.get('list')))));
            document.getElementById('wordInput').value = data.u + '\n' + data.w.map(x => `${x.eng} - ${x.heb}`).join('\n');
        } catch (e) {}
    }
};

function showScreen(id) {
    document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function initApp() {
    const input = document.getElementById('wordInput').value.trim();
    const lines = input.split('\n');
    if (lines.length < 2) return;
    state.unit = lines[0];
    state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
        const parts = l.split('-');
        return { eng: parts[0].trim(), heb: parts[1].trim() };
    });
    restartQuiz();
}

function restartQuiz() {
    state.qIdx = 0; state.qCorrect = 0;
    showScreen('screen-quiz');
    renderQuiz();
}

function renderQuiz() {
    if (state.qIdx >= state.words.length) return endQuiz();
    document.getElementById('quiz-unit-display').innerText = state.unit;
    document.getElementById('quiz-progress').innerText = `מילה ${state.qIdx + 1} מתוך ${state.words.length}`;
    const q = state.words[state.qIdx];
    document.getElementById('quiz-eng').innerText = q.eng;
    const distractors = state.words.filter(x => x.heb !== q.heb).map(x => x.heb);
    const opts = [q.heb, ...distractors].slice(0, 4).sort(() => Math.random() - 0.5);
    const cont = document.getElementById('quiz-options');
    cont.innerHTML = '';
    opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'opt-btn';
        b.innerText = o;
        b.onclick = () => {
            cont.querySelectorAll('button').forEach(btn => btn.style.pointerEvents = 'none');
            if (o === q.heb) { b.classList.add('correct'); state.qCorrect++; }
            else { b.classList.add('wrong'); }
            setTimeout(() => { state.qIdx++; renderQuiz(); }, 1000);
        };
        cont.appendChild(b);
    });
}

function endQuiz() {
    state.score = Math.round((state.qCorrect / state.words.length) * 100);
    document.getElementById('final-score').innerText = state.score + '%';
    const isOpen = state.score >= 70;
    document.getElementById('btn-c4').disabled = !isOpen;
    document.getElementById('btn-mem').disabled = !isOpen;
    showScreen('screen-summary');
}

function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}

// לחיצה ארוכה על הלוגו לכניסה לניהול
let pressTimer;
function startPress() { pressTimer = window.setTimeout(() => location.href = 'admin.html', 3000); }
function endPress() { clearTimeout(pressTimer); }

// עזרים למודלים
function openMsg(html, color) {
    document.getElementById('msg-body').innerHTML = html;
    document.getElementById('msg-stripe').style.background = color || 'var(--blue)';
    document.getElementById('msg-modal').style.display = 'flex';
}
function closeMsg() { document.getElementById('msg-modal').style.display = 'none'; }
