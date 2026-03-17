<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Word Adventure - 4 In A Row</title>
    <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f0f9ff;
            --text-main: #1e3a8a;
            --primary: #2563eb;
            --accent: #facc15;
            --white: #ffffff;
        }

        body {
            font-family: 'Comic Neue', cursive;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        .header {
            background: var(--white);
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .logo { height: 40px; }

        .container {
            flex: 1;
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
            width: 100%;
            box-sizing: border-box;
        }

        /* עיצוב כפתורים כללי */
        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 12px;
            font-family: inherit;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.2s;
            width: 100%;
        }

        .btn-secondary { background: #e2e8f0; color: var(--text-main); }

        /* לוח 4 בשורה */
        .c4-wrapper { text-align: center; }
        
        .c4-status {
            margin: 10px 0;
            font-weight: bold;
            min-height: 1.5em;
            color: var(--primary);
        }

        .c4-board {
            background: #2563eb;
            padding: 8px;
            border-radius: 12px;
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 6px;
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .c4-cell {
            aspect-ratio: 1;
            border-radius: 50%;
            background: #1e3a8a; /* ה"חור" בלוח */
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .token {
            width: 80%;
            height: 80%;
            border-radius: 50%;
            transition: transform 0.3s ease;
        }
        .token.red { background: #ef4444; box-shadow: inset 0 -3px rgba(0,0,0,0.2); }
        .token.yellow { background: #facc15; box-shadow: inset 0 -3px rgba(0,0,0,0.2); }

        /* חלונית שאלה (Modal) */
        .modal {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(30, 58, 138, 0.85);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .modal-content {
            background: white;
            padding: 25px;
            border-radius: 20px;
            width: 85%;
            max-width: 350px;
            text-align: center;
        }

        .choice-btn {
            display: block;
            width: 100%;
            margin: 10px 0;
            padding: 15px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            background: white;
            font-family: inherit;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
        }

        .choice-btn:active { background: #f0f9ff; }

        .hidden { display: none; }
    </style>
</head>
<body>

<div class="header">
    <img src="logo.svg" alt="Word Adventure" class="logo">
    <div style="font-weight: bold; color: var(--primary);">4 In A Row</div>
</div>

<div class="container">
    <div id="setup-screen">
        <h2 style="text-align: center;">הזנת מילים לתרגול</h2>
        <textarea id="wordInput" style="width:100%; height:150px; border-radius:12px; padding:10px; font-family:inherit;" placeholder="שם הרשימה&#10;מילה - תרגום&#10;Apple - תפוח"></textarea>
        <button class="btn" style="margin-top:15px;" onclick="startGame()">צור משחק ושתף 🚀</button>
    </div>

    <div id="game-screen" class="hidden">
        <div class="c4-wrapper">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <button class="btn" style="width: auto;" onclick="askQuestion()">קבל שאלה ❓</button>
                <div id="turn-indicator" style="display: flex; align-items: center; gap: 8px;">
                    תור: <div id="turn-color" style="width:20px; height:20px; border-radius:50%; background:#ef4444;"></div>
                </div>
            </div>

            <div id="status-msg" class="c4-status">לחצו על השאלה כדי להתחיל</div>

            <div id="board" class="c4-board">
                </div>
            
            <button class="btn btn-secondary" style="margin-top: 25px;" onclick="location.reload()">רשימה חדשה</button>
            <button class="btn" style="margin-top: 10px; background: #22c55e;" onclick="shareList()">שתף את הרשימה הזו 🔗</button>
        </div>
    </div>
</div>

<div id="question-modal" class="modal">
    <div class="modal-content">
        <h2 id="q-text" style="font-size: 32px; margin-bottom: 20px;">Word</h2>
        <div id="choices-container"></div>
    </div>
</div>

<script>
    let state = {
        words: [],
        board: Array(6).fill(null).map(() => Array(7).fill(null)),
        turn: 1, // 1 = Red, 2 = Yellow
        canDrop: false,
        listName: ''
    };

    function startGame() {
        const input = document.getElementById('wordInput').value;
        const lines = input.split('\n');
        state.listName = lines[0] || 'אוצר מילים';
        state.words = lines.slice(1).filter(l => l.includes('-')).map(l => {
            const [eng, heb] = l.split('-').map(s => s.trim());
            return { eng, heb };
        });

        if (state.words.length < 4) {
            alert("נא להזין לפחות 4 מילים לתרגול.");
            return;
        }

        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        initBoard();
    }

    function initBoard() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 7; c++) {
                const cell = document.createElement('div');
                cell.className = 'c4-cell';
                cell.onclick = () => dropToken(c);
                cell.id = `cell-${r}-${c}`;
                boardEl.appendChild(cell);
            }
        }
    }

    function askQuestion() {
        const q = state.words[Math.floor(Math.random() * state.words.length)];
        document.getElementById('q-text').innerText = q.eng;
        
        let choices = [q.heb];
        while (choices.length < 4) {
            let rand = state.words[Math.floor(Math.random() * state.words.length)].heb;
            if (!choices.includes(rand)) choices.push(rand);
        }
        choices.sort(() => Math.random() - 0.5);

        const container = document.getElementById('choices-container');
        container.innerHTML = '';
        choices.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerText = c;
            btn.onclick = () => checkAnswer(c, q.heb);
            container.appendChild(btn);
        });

        document.getElementById('question-modal').style.display = 'flex';
    }

    function checkAnswer(selected, correct) {
        document.getElementById('question-modal').style.display = 'none';
        const msgEl = document.getElementById('status-msg');
        
        if (selected === correct) {
            state.canDrop = true;
            msgEl.innerText = "נכון מאוד! עכשיו בחר עמודה בלוח.";
            msgEl.style.color = "#22c55e";
        } else {
            msgEl.innerText = "טעות... התור עובר לשחקן הבא.";
            msgEl.style.color = "#ef4444";
            switchTurn();
        }
    }

    function dropToken(c) {
        if (!state.canDrop) return;
        
        for (let r = 5; r >= 0; r--) {
            if (!state.board[r][c]) {
                state.board[r][c] = state.turn;
                drawToken(r, c);
                if (checkWin(r, c)) {
                    document.getElementById('status-msg').innerText = `כל הכבוד! השחקן ה${state.turn === 1 ? 'אדום' : 'צהוב'} ניצח!`;
                    state.canDrop = false;
                } else {
                    state.canDrop = false;
                    switchTurn();
                }
                return;
            }
        }
    }

    function drawToken(r, c) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        const token = document.createElement('div');
        token.className = `token ${state.turn === 1 ? 'red' : 'yellow'}`;
        cell.appendChild(token);
    }

    function switchTurn() {
        state.turn = state.turn === 1 ? 2 : 1;
        document.getElementById('turn-color').style.background = state.turn === 1 ? '#ef4444' : '#facc15';
        if (!state.canDrop) document.getElementById('status-msg').innerText = "לחצו על השאלה כדי לשחק";
    }

    function checkWin(r, c) {
        const p = state.board[r][c];
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (let [dr, dc] of dirs) {
            let count = 1;
            for (let s of [1, -1]) {
                let nr = r + dr*s, nc = c + dc*s;
                while (nr>=0 && nr<6 && nc>=0 && nc<7 && state.board[nr][nc] === p) {
                    count++; nr += dr*s; nc += dc*s;
                }
            }
            if (count >= 4) return true;
        }
        return false;
    }

    function shareList() {
        const data = btoa(unescape(encodeURIComponent(state.words.map(w => `${w.eng}-${w.heb}`).join('|'))));
        const url = `${window.location.origin}${window.location.pathname}?list=${encodeURIComponent(state.listName)}&v=${data}`;
        const text = `בואו לתרגל איתי "${state.listName}" ב-4 בשורה: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }

    // טעינה מקישור
    const params = new URLSearchParams(window.location.search);
    if(params.has('v')) {
        const decoded = decodeURIComponent(escape(atob(params.get('v'))));
        document.getElementById('wordInput').value = (params.get('list') || 'אוצר מילים') + '\n' + decoded.replace(/\|/g, '\n');
        startGame();
    }
</script>

</body>
</html>
