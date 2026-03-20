// js/memory.js - גרסה מעודכנת עם מונה צעדים

let memState = {
    cards: [],
    flipped: [],
    lock: false,
    moves: 0 // תיקון: מונה צעדים
};

function startMemory() {
    memState.flipped = [];
    memState.lock = false;
    memState.moves = 0; // אתחול מונה צעדים
    updateMovesDisplay(); // עדכון התצוגה בהתחלה
    
    // יצירת זוגות (אנגלית ועברית)
    let pool = [];
    state.words.forEach(w => {
        pool.push({ val: w.eng, type: 'eng', match: w.heb });
        pool.push({ val: w.heb, type: 'heb', match: w.eng });
    });
    
    // ערבוב ובחירת 16 כרטיסים (8 זוגות)
    memState.cards = pool.sort(() => Math.random() - 0.5).slice(0, 16).sort(() => Math.random() - 0.5);
    
    showScreen('screen-memory');
    drawMemory();
}

function drawMemory() {
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    memState.cards.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'mem-card';
        div.id = `mem-${i}`;
        div.innerText = '?';
        div.onclick = () => flipCard(i);
        grid.appendChild(div);
    });
}

function flipCard(i) {
    if (memState.lock || memState.flipped.includes(i)) return;
    
    const card = memState.cards[i];
    const el = document.getElementById(`mem-${i}`);
    
    el.innerText = card.val;
    el.classList.add('flipped');
    memState.flipped.push(i);
    
    // אם הכרטיס הוא באנגלית, השמע אותו
    if (card.type === 'eng') {
        const msg = new SpeechSynthesisUtterance(card.val);
        msg.lang = 'en-US';
        window.speechSynthesis.speak(msg);
    }

    if (memState.flipped.length === 2) {
        checkMatch();
    }
}

function checkMatch() {
    memState.lock = true;
    memState.moves++; // תיקון: הגדלת מונה הצעדים אחרי כל זוג שנפתח
    updateMovesDisplay(); // עדכון התצוגה

    const [idx1, idx2] = memState.flipped;
    const c1 = memState.cards[idx1];
    const c2 = memState.cards[idx2];
    
    if (c1.val === c2.match) {
        setTimeout(() => {
            document.getElementById(`mem-${idx1}`).classList.add('matched');
            document.getElementById(`mem-${idx2}`).classList.add('matched');
            memState.flipped = [];
            memState.lock = false;
            if (document.querySelectorAll('.mem-card:not(.matched)').length === 0) {
                // תיקון: הודעת ניצחון עם מונה הצעדים
                openMsg(`<h2>כל הכבוד! ניצחת ב-${memState.moves} צעדים! 🏆</h2><button class="btn" onclick="startMemory(); closeMsg()">משחק חדש</button>`, "var(--green)");
            }
        }, 600);
    } else {
        setTimeout(() => {
            const el1 = document.getElementById(`mem-${idx1}`);
            const el2 = document.getElementById(`mem-${idx2}`);
            el1.innerText = '?';
            el2.innerText = '?';
            el1.classList.remove('flipped');
            el2.classList.remove('flipped');
            memState.flipped = [];
            memState.lock = false;
        }, 1000);
    }
}

// תיקון: פונקציית עזר לעדכון תצוגת הצעדים
function updateMovesDisplay() {
    document.getElementById('memory-moves').innerText = `צעדים: ${memState.moves}`;
}
