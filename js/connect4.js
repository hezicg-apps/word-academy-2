let c4State = { board: [], turn: 'red', canDrop: false };

function startC4() {
    c4State.board = Array(6).fill(null).map(() => Array(7).fill(null));
    c4State.turn = 'red';
    c4State.canDrop = false;
    showScreen('screen-c4');
    updateC4Button("שאלה");
    drawBoard();
}

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

function updateC4Button(mode) {
    const btn = document.getElementById('c4-turn-btn');
    const isRed = c4State.turn === 'red';
    btn.style.background = isRed ? "var(--red)" : "var(--accent)";
    btn.style.color = isRed ? "white" : "black";
    btn.innerText = mode === "שאלה" ? `תור ${isRed ? 'אדום' : 'צהוב'}: לחץ לשאלה` : "נכון! בחר טור 👇";
    btn.disabled = (mode !== "שאלה");
}

function c4Ask() {
    const q = state.words[Math.floor(Math.random() * state.words.length)];
    const distractors = state.words.filter(x => x.heb !== q.heb).map(x => x.heb);
    const opts = [q.heb, ...distractors].slice(0, 4).sort(() => Math.random() - 0.5);
    
    let html = `<div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:15px;">
                    <span id="c4-q-text" style="font-size:24px; direction:ltr;">${q.eng}</span>
                    <button onclick="speak('c4-q-text')" style="background:none; border:none; font-size:20px; cursor:pointer;">🔊</button>
                </div>`;
    opts.forEach(o => {
        html += `<button class="opt-btn" onclick="checkC4Ans(this,'${o}','${q.heb}')">${o}</button>`;
    });
    openMsg(html, c4State.turn === 'red' ? 'var(--red)' : 'var(--accent)');
}

function checkC4Ans(btn, selected, correct) {
    const all = document.querySelectorAll('#msg-modal .opt-btn');
    all.forEach(b => b.style.pointerEvents = 'none');
    if (selected === correct) {
        btn.classList.add('correct');
        c4State.canDrop = true;
        setTimeout(() => { closeMsg(); updateC4Button("טור"); }, 800);
    } else {
        btn.classList.add('wrong');
        all.forEach(b => { if(b.innerText === correct) b.classList.add('correct'); });
        c4State.turn = c4State.turn === 'red' ? 'yellow' : 'red';
        setTimeout(() => { closeMsg(); updateC4Button("שאלה"); }, 1200);
    }
}

async function dropToken(col) {
    if (!c4State.canDrop) return;
    let row = -1;
    for (let r = 5; r >= 0; r--) { if (!c4State.board[r][col]) { row = r; break; } }
    if (row === -1) return;

    c4State.canDrop = false;
    const color = c4State.turn;
    for (let r = 0; r <= row; r++) {
        const cell = document.getElementById(`c-${r}-${col}`);
        cell.classList.add(color);
        await new Promise(res => setTimeout(res, 60));
        if (r < row) cell.classList.remove(color);
    }
    c4State.board[row][col] = color;
    
    if (checkWin(row, col)) {
        openMsg(`<h2>השחקן ${color === 'red' ? 'האדום' : 'הצהוב'} ניצח! 🏆</h2><button class="btn" onclick="startC4(); closeMsg()">משחק חדש</button>`, color === 'red' ? 'var(--red)' : 'var(--accent)');
    } else {
        c4State.turn = color === 'red' ? 'yellow' : 'red';
        updateC4Button("שאלה");
        drawBoard();
    }
}

function checkWin(r, c) {
    const color = c4State.board[r][c];
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    return dirs.some(([dr, dc]) => {
        let count = 1;
        [1, -1].forEach(dir => {
            for (let i = 1; i < 4; i++) {
                const nr = r + dr*i*dir, nc = c + dc*i*dir;
                if (nr>=0 && nr<6 && nc>=0 && nc<7 && c4State.board[nr][nc] === color) count++; else break;
            }
        });
        return count >= 4;
    });
}
