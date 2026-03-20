// js/main.js - קובץ לוגיקה מעודכן

let state = {
    words: [],
    unit: '',
    qIdx: 0,
    qCorrect: 0,
    score: 0
};

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('list')) {
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
    
    if (lines.length < 2) {
        alert("אנא הזן שם יחידה ולפחות מילה אחת (פורמט: מילה - תרגום)");
        return;
    }

    state.unit = lines[0];
    state.words = lines.slice(1)
        .filter(l => l.includes('-'))
        .map(l => {
            const parts = l.split('-');
            return { eng: parts[0].trim(), heb: parts[1].trim() };
        });

    if (state.words.length === 0) {
        alert("לא נמצאו מילים תקינות.");
        return;
    }

    restartQuiz();
}

function restartQuiz() {
    state.qIdx = 0; state.qCorrect = 0;
    showScreen('screen-quiz');
    renderQuiz();
}

function renderQuiz() {
    if (state.qIdx >= state.words.length) return endQuiz();
    const q = state.words[state.qIdx];
    document.getElementById('quiz-progress').innerText = `מילה ${state.qIdx + 1} מתוך ${state.words.length}`;
    document.getElementById('quiz-eng').innerText = q.eng;
    const distractors = state.words.filter(x => x.heb !== q.heb).map(x => x.heb);
    const opts = [q.heb, ...distractors].slice(0, 4).sort(() => Math.random() - 0.5);
    const cont = document.getElementById('quiz-options');
    cont.innerHTML = '';
    opts.forEach(o => {
        const b = document.createElement('button'); b.className = 'opt-btn'; b.innerText = o;
        b.onclick = () => {
            cont.querySelectorAll('button').forEach(btn => btn.style.pointerEvents = 'none');
            if (o === q.heb) { b.classList.add('correct'); state.qCorrect++; }
            else { b.classList.add('wrong'); cont.querySelectorAll('button').forEach(btn => { if (btn.innerText === q.heb) btn.classList.add('correct'); }); }
            setTimeout(() => { state.qIdx++; renderQuiz(); }, 1000);
        };
        cont.appendChild(b);
    });
}

function endQuiz() {
    state.score = Math.round((state.qCorrect / state.words.length) * 100);
    document.getElementById('final-score').innerText = state.score + '%';
    const isOpen = state.score >= 70;
    const lockMsg = document.getElementById('lock-msg');
    const btnC4 = document.getElementById('btn-c4');
    if (isOpen) { lockMsg.innerText = "כל הכבוד! המשחקים פתוחים"; lockMsg.style.color = "var(--green)"; btnC4.disabled = false; btnC4.style.opacity = "1"; }
    else { lockMsg.innerText = "המשחקים ייפתחו ב-70% הצלחה"; lockMsg.style.color = "var(--red)"; btnC4.disabled = true; btnC4.style.opacity = "0.5"; }
    showScreen('screen-summary');
}

function shareAchievement() {
    const text = `הצלחתי לסיים את "${state.unit}" בציון ${state.score}%!`;
    const url = "https://word-academy-8b91d.web.app/"; 
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`);
}

function shareList() {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify({ u: state.unit, w: state.words }))));
    const link = `${window.location.href.split('?')[0]}?list=${data}`;
    window.open(`https://wa.me/?text=${encodeURIComponent('הנה רשימת המילים שלי: ' + link)}`);
}

function speak(textId) {
    const text = document.getElementById(textId).innerText;
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}

function openMsg(html, color) {
    document.getElementById('msg-body').innerHTML = html;
    const stripe = document.getElementById('msg-stripe');
    if (color) stripe.style.background = color;
    document.getElementById('msg-modal').style.display = 'flex';
}

function closeMsg() {
    document.getElementById('msg-modal').style.display = 'none';
}
