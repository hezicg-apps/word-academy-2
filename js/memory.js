// js/memory.js - גרסה עם שורה אחת במודאל

let memState = { cards: [], flipped: [], lock: false, moves: 0 };

function startMemory() {
    memState.flipped = []; memState.lock = false; memState.moves = 0;
    document.getElementById('memory-moves').innerText = `צעדים: 0`;
    let pool = [];
    state.words.forEach(w => {
        pool.push({ val: w.eng, type: 'eng', match: w.heb });
        pool.push({ val: w.heb, type: 'heb', match: w.eng });
    });
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
    if (memState.flipped.length === 2) checkMatch();
}

function checkMatch() {
    memState.lock = true;
    memState.moves++;
    document.getElementById('memory-moves').innerText = `צעדים: ${memState.moves}`;
    const [idx1, idx2] = memState.flipped;
    if (memState.cards[idx1].val === memState.cards[idx2].match) {
        setTimeout(() => {
            document.getElementById(`mem-${idx1}`).classList.add('matched');
            document.getElementById(`mem-${idx2}`).classList.add('matched');
            memState.flipped = []; memState.lock = false;
            if (document.querySelectorAll('.mem-card:not(.matched)').length === 0) {
                // שורה אחת בלבד
                openMsg(`כל הכבוד! ניצחת ב-${memState.moves} צעדים! 🏆`, "var(--green)");
            }
        }, 600);
    } else {
        setTimeout(() => {
            document.getElementById(`mem-${idx1}`).innerText = '?';
            document.getElementById(`mem-${idx2}`).innerText = '?';
            document.getElementById(`mem-${idx1}`).classList.remove('flipped');
            document.getElementById(`mem-${idx2}`).classList.remove('flipped');
            memState.flipped = []; memState.lock = false;
        }, 1000);
    }
}
