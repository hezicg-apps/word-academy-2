// js/connect4.js

// משתנים ייחודיים למשחק 4 בשורה
let c4State = {
    board: [],
    turn: 'red', // 'red' או 'yellow'
    canDrop: false
};

/**
 * אתחול משחק חדש
 */
function startC4() {
    // יצירת לוח ריק (6 שורות, 7 עמודות)
    c4State.board = Array(6).fill(null).map(() => Array(7).fill(null));
    c4State.turn = 'red';
    c4State.canDrop = false;
    
    showScreen('screen-c4');
    updateC4Button("שאלה");
    drawBoard();
}

/**
 * ציור הלוח ב-HTML
 */
function drawBoard() {
    const b = document.getElementById('c4-board');
    b.innerHTML = '';
    
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const d = document.createElement('div');
            d.className = 'cell ' + (c4State.board[r][c] || '');
            d.id = `c-${r}-${c}`;
            b.appendChild(d);
        }
    }
}

/**
 * עדכון כפתור הפעולה (שאלה או הוראה להפיל אסימון)
 */
function updateC4Button(mode) {
    const btn = document.getElementById('c4-turn-btn');
    const isRed = c4State.turn === 'red';
    const colorName = isRed ? "אדום" : "צהוב";
    
    btn.style.background = isRed ? "var(--red)" : "var(--accent)";
    btn.style.color = isRed ? "white" : "black";
    
    if (mode === "שאלה") {
        btn.innerText = `תור ${colorName}: לחץ לשאלה`;
        btn.disabled = false;
    } else {
        btn.innerText = `נכון! ${colorName}, בחר טור 👇`;
        btn.disabled = true;
    }
}

/**
 * הצגת שאלה מתוך רשימת המילים
 */
function c4Ask() {
    // בחירת מילה אקראית מהרשימה שנטענה ב-main.js
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    
    // יצירת מסיחים
    const distractors = state.words
        .filter(x => x.heb !== q.heb)
        .map(x => x.heb);
    
    const opts = [q.heb, ...distractors]
        .slice(0, 4)
        .sort(() => Math.random() - 0.5);
    
    let html = `<div style="font-size:24px; margin-bottom:15px; direction:ltr;">${q.eng}</div>`;
    opts.forEach(o => {
        html += `<button class="opt-btn" onclick="checkC4Ans(this,'${o}','${q.heb}')">${o}</button>`;
    });
    
    // פתיחת המודאל (הפונקציה נמצאת ב-main.js)
    openMsg(html, c4State.turn === 'red' ? 'var(--red)' : 'var(--accent)');
}

/**
 * בדיקת תשובה בתוך המשחק
 */
function checkC4Ans(btn, selected, correct) {
    const allBtns = document.querySelectorAll('#msg-modal .opt-btn');
    allBtns.forEach(b => b.style.pointerEvents = 'none');

    if (selected === correct) {
        btn.classList.add('correct');
        c4State.canDrop = true;
        // סגירה אוטומטית אחרי חצי שנייה כדי לעבור להפלת אסימון
        setTimeout(() => {
            closeMsg();
            updateC4Button("טור");
        }, 800);
    } else {
        btn.classList.add('wrong');
        allBtns.forEach(b => { if (b.innerText === correct) b.classList.add('correct'); });
        // החלפת תור כי התשובה שגויה
        c4State.turn = c4State.turn === 'red' ? 'yellow' : 'red';
        setTimeout(() => {
            closeMsg();
            updateC4Button("שאלה");
        }, 1200);
    }
}

/**
 * הפלת אסימון לטור שנבחר
 */
async function dropToken(col) {
    if (!c4State.canDrop) return;
    c4State.canDrop = false;

    // מציאת השורה הפנויה הנמוכה ביותר
    let row = -1;
    for (let r = 5; r >= 0; r--) {
        if (!c4State.board[r][col]) {
            row = r;
            break;
        }
    }

    if (row === -1) { // טור מלא
        c4State.canDrop = true;
        return;
    }

    const currentColor = c4State.turn;
    
    // אנימציית נפילה
    for (let r = 0; r <= row; r++) {
        const cellElement = document.getElementById(`c-${r}-${col}`);
        cellElement.classList.add(currentColor);
        await new Promise(res => setTimeout(res, 60));
        if (r < row) cellElement.classList.remove(currentColor);
    }

    c4State.board[row][col] = currentColor;
    
    // בדיקת ניצחון או תיקו
    if (checkWin(row, col)) {
        const winnerName = currentColor === 'red' ? 'האדום' : 'הצהוב';
        setTimeout(() => {
            openMsg(`<h2>השחקן ${winnerName} ניצח! 🏆</h2><button class="btn" onclick="startC4(); closeMsg()">משחק חדש</button>`, 
            currentColor === 'red' ? 'var(--red)' : 'var(--accent)');
        }, 300);
    } else if (c4State.board.every(r => r.every(cell => cell !== null))) {
        setTimeout(() => {
            openMsg(`<h2>תיקו! 🤝</h2><button class="btn" onclick="startC4(); closeMsg()">משחק חדש</button>`, 'var(--navy)');
        }, 300);
    } else {
        // מעבר לתור הבא
        c4State.turn = c4State.turn === 'red' ? 'yellow' : 'red';
        updateC4Button("שאלה");
        drawBoard();
    }
}

/**
 * אלגוריתם בדיקת ניצחון (4 בשורה)
 */
function checkWin(r, c) {
    const color = c4State.board[r][c];
    const directions = [
        [0, 1],  // אופקי
        [1, 0],  // אנכי
        [1, 1],  // אלכסון יורד
        [1, -1]  // אלכסון עולה
    ];

    return directions.some(([dr, dc]) => {
        let count = 1;
        // בדיקה לשני הכיוונים של כל ציר
        [1, -1].forEach(dir => {
            for (let i = 1; i < 4; i++) {
                const nr = r + dr * i * dir;
                const nc = c + dc * i * dir;
                if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && c4State.board[nr][nc] === color) {
                    count++;
                } else {
                    break;
                }
            }
        });
        return count >= 4;
    });
}