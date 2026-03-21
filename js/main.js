function initApp() {
    const text = document.getElementById('wordInput').value.trim();
    if (!text) return;

    const lines = text.split('\n');
    currentUnitName = lines[0]; 
    currentWords = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('-');
        if (parts.length === 2) {
            currentWords.push({ eng: parts[0].trim(), heb: parts[1].trim() });
        }
    }

    if (currentWords.length < 4) {
        alert("צריך לפחות 4 מילים");
        return;
    }

    // במקום להתחיל מבחן - מציגים את מסך הלימוד (Flashcards)
    renderFlashcards(); 
    showScreen('screen-intro'); 
}

function showSummary() {
    showScreen('screen-summary');
    const percent = Math.round((score / currentWords.length) * 100);
    document.getElementById('final-score').innerText = percent + "%";
    
    const canPlay = percent >= 70;
    document.getElementById('btn-c4').disabled = !canPlay;
    document.getElementById('btn-mem').disabled = !canPlay;
    
    // הצגת הודעת הנעילה
    const lockMsg = document.getElementById('lock-msg');
    if(lockMsg) lockMsg.innerText = canPlay ? "🔓 המשחקים פתוחים!" : "🔒 צריך 70% כדי לשחק";
}

// פונקציות עזר לכפתורים (וודא שהן קיימות)
function restartQuiz() {
    showScreen('screen-quiz');
    startQuiz();
}

function shareWatsapp() {
    const text = `הצלחתי במבחן המילים של Word Academy ביחידה ${currentUnitName} בציון ${score}/${currentWords.length}!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
}
