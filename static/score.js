// --- WebSocket live update and liveness check ---
let ws = null;
let wsConnected = false;
let pingInterval = null;
let pongTimeout = null;

function setupWebSocket() {
    let wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let wsUrl = wsProto + '://' + window.location.host + '/ws';
    console.log('Connecting to WebSocket:', wsUrl);
    ws = new WebSocket(wsUrl);
    let reconnectTimeout = null;

    ws.onopen = function() {
        wsConnected = true;
        console.log('WebSocket connected');
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        // Manual update on reconnect
        if (currentMatch) showMatchScoreSection();
        // Start ping interval
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(function() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send('ping');
                // Set pong timeout
                if (pongTimeout) clearTimeout(pongTimeout);
                pongTimeout = setTimeout(function() {
                    console.warn('Pong not received, closing WebSocket and reconnecting');
                    ws.close();
                }, 4000);
            }
        }, 5000);
    };
    ws.onclose = function() {
        wsConnected = false;
        console.log('WebSocket disconnected, will attempt to reconnect in 1/2s');
        if (pingInterval) clearInterval(pingInterval);
        if (pongTimeout) clearTimeout(pongTimeout);
        reconnectTimeout = setTimeout(setupWebSocket, 500);
    };
    ws.onerror = function(e) {
        wsConnected = false;
        console.error('WebSocket error:', e);
    };
    ws.onmessage = function(e) {
        console.log('WebSocket message:', e.data);
        if (e.data === 'pong') {
            if (pongTimeout) clearTimeout(pongTimeout);
            return;
        }
        if (e.data === 'update') {
            if (currentMatch) showMatchScoreSection();
        }
    };
}
// Ryder Score Entry Page

let matches = [];
let currentMatch = null;
let holeResults = Array(18).fill(null); // 'A', 'B', 'AS'
sEnabled = false;

async function fetchMatches() {
    const res = await fetch('/api/match/list');
    const data = await res.json();
    matches = data.matches || [];
}

async function showMatchScoreSection() {
    if (!currentMatch) return;
    document.getElementById('team-a').textContent = `${currentMatch.team_a.name}: ${currentMatch.team_a.players.map(p => p.name).join(', ')}`;
    document.getElementById('team-b').textContent = `${currentMatch.team_b.name}: ${currentMatch.team_b.players.map(p => p.name).join(', ')}`;
    // Load hole results and match status from DB
    await loadHoleResults();
    await loadMatchStatus();
    renderHoles();
    updateMatchScoreDisplay();
    updateFinishButton();
    renderMatchTitle();
    // Register finish button event every time section is shown
    const btn = document.getElementById('finish-btn');
    if (btn) {
        btn.onclick = async function() {
            if (!currentMatch) return;
            if (currentMatch.status === 'completed') {
                // If any hole is set, set to running, else prepared
                if (holeResults.some(v => v === 'A' || v === 'B' || v === 'AS')) {
                    await setMatchStatus('running');
                } else {
                    await setMatchStatus('prepared');
                }
            } else {
                await setMatchStatus('completed');
            }
        };
    }
    setScoringEnabled(currentMatch.status !== 'completed');
}

async function loadMatchStatus() {
    if (!currentMatch) return;
    // Use match list API to get latest status
    const res = await fetch('/api/match/list');
    if (res.ok) {
        const data = await res.json();
        const match = (data.matches || []).find(m => m.id == currentMatch.id);
        if (match && match.status) currentMatch.status = match.status;
    }
}

function renderHoles() {
    const holesDiv = document.getElementById('holes-list');
    holesDiv.innerHTML = '';
    // Determine which holes to show based on match type
    let start = 0, end = 18, showDivider = false;
    if (currentMatch && currentMatch.holes === 'front9') {
        start = 0; end = 9; showDivider = false;
    } else if (currentMatch && currentMatch.holes === 'back9') {
        start = 9; end = 18; showDivider = false;
    } else {
        showDivider = true;
    }
    for (let i = start; i < end; i++) {
        if (showDivider && i === 9) {
            // Add empty row for visual division after 9th hole
            const emptyRow = document.createElement('div');
            emptyRow.className = 'hole-row hole-divider';
            emptyRow.style.height = '1.5em';
            emptyRow.style.background = 'transparent';
            emptyRow.style.border = 'none';
            holesDiv.appendChild(emptyRow);
        }
        const row = document.createElement('div');
        row.className = 'hole-row';
        row.innerHTML = `<span class="hole-label">${i+1}</span>` +
            `<span class="hole-score">
            <button type="button" class="hole-btn" data-hole="${i}" data-val="A">${currentMatch.team_a.name}</button>
            <button type="button" class="hole-btn" data-hole="${i}" data-val="AS">A/S</button>
            <button type="button" class="hole-btn" data-hole="${i}" data-val="B">${currentMatch.team_b.name}</button>
            </span>`;
        holesDiv.appendChild(row);
    }
    if (sEnabled) {
        document.querySelectorAll('.hole-btn').forEach(btn => {
            btn.onclick = function() {
                const hole = parseInt(this.getAttribute('data-hole'));
                const val = this.getAttribute('data-val');
                if (holeResults[hole] === val) {
                    // Unset if already selected
                    holeResults[hole] = undefined;
                } else {
                    holeResults[hole] = val;
                }
                updateHoleButtons(hole);
                updateMatchScoreDisplay();
                saveHoleResults();
            };
        });
    }   
    // Restore selection if any
    for (let i = start; i < end; i++) updateHoleButtons(i);
}

function updateHoleButtons(hole) {
    document.querySelectorAll(`.hole-btn[data-hole="${hole}"]`).forEach(btn => {
        if (btn.getAttribute('data-val') === holeResults[hole]) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function updateMatchScoreDisplay() {
    // Calculate up/down or A/S
    let aUp = 0, bUp = 0;
    let start = 0, end = 18;
    if (currentMatch && currentMatch.holes === 'front9') {
        start = 0; end = 9;
    } else if (currentMatch && currentMatch.holes === 'back9') {
        start = 9; end = 18;
    }
    for (let i = start; i < end; i++) {
        if (holeResults[i] === 'A') aUp++;
        else if (holeResults[i] === 'B') bUp++;
    }
    let scoreText = '';
    if (aUp > bUp) scoreText = `${currentMatch.team_a.name} ${aUp-bUp} Up`;
    else if (bUp > aUp) scoreText = `${currentMatch.team_b.name} ${bUp-aUp} Up`;
    else scoreText = 'All Square';
    // Count holes still to play
    let holesLeft = 0;
    for (let i = start; i < end; i++) {
        if (!holeResults[i]) holesLeft++;
    }
    scoreText += `  (${holesLeft} to play)`;
    document.getElementById('match-score').textContent = scoreText;
}

async function saveHoleResults() {
    if (!currentMatch) return;
    await fetch(`/api/match/holescore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: currentMatch.id, holes: holeResults })
    });
    // If any hole is set, set match as running
    if (holeResults.some(v => v === 'A' || v === 'B' || v === 'AS')) {
        if (currentMatch.status !== 'running') {
            await setMatchStatus('running', true);
        }
    }
    // Notify dashboard to update
    localStorage.setItem('ryder-dashboard-update', Date.now().toString());
}

function setScoringEnabled(enabled) {
    document.querySelectorAll('.hole-btn').forEach(btn => {
        btn.disabled = !enabled;
        if (!enabled) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
}

// Patch setMatchStatus to notify dashboard
async function setMatchStatus(status, silent) {
    if (!currentMatch) return;
    // Optimistically update UI
    currentMatch.status = status;
    updateFinishButton();
    setScoringEnabled(status !== 'completed');
    await fetch('/api/match/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: currentMatch.id, status })
    });
    if (!silent) localStorage.setItem('ryder-dashboard-update', Date.now().toString());
}

async function loadHoleResults() {
    if (!currentMatch) return;
    const res = await fetch(`/api/match/holescore?match_id=${currentMatch.id}`);
    if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.holes)) {
            holeResults = data.holes;
        }
    }
}

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

window.onload = async function() {
    await fetchMatches();
    setupWebSocket();
    renderScoringEnabled();
        // Disable scoring and finish button by default
        sEnabled = false;
        const finishBtn = document.getElementById('finish-btn');
        if (finishBtn) finishBtn.disabled = true;
        // Enable scoring only after click-and-hold on pinned score for 5s
        let holdTimeout = null;
        const pinnedScore = document.getElementById('match-score');
        if (pinnedScore) {
            pinnedScore.addEventListener('mousedown', function() {
                holdTimeout = setTimeout(() => {
                    sEnabled = true;
                    if (finishBtn) finishBtn.disabled = false;
                    console.log('Scoring enabled');
                    renderHoles();
                    renderScoringEnabled();
                }, 3000);
            });
            pinnedScore.addEventListener('mouseup', function() {
                if (holdTimeout) clearTimeout(holdTimeout);
            });
            pinnedScore.addEventListener('mouseleave', function() {
                if (holdTimeout) clearTimeout(holdTimeout);
            });
            // For touch devices
            pinnedScore.addEventListener('touchstart', function() {
                holdTimeout = setTimeout(() => {
                    sEnabled = true;
                    if (finishBtn) finishBtn.disabled = false;
                    renderHoles();
                    renderScoringEnabled();
                }, 3000);
            });
            pinnedScore.addEventListener('touchend', function() {
                if (holdTimeout) clearTimeout(holdTimeout);
            });
            pinnedScore.addEventListener('touchcancel', function() {
                if (holdTimeout) clearTimeout(holdTimeout);
            });
        }
    window.onfocus = function() {
        if (!wsConnected) {
            console.log('Window focused: WebSocket not connected, reconnecting and updating match');
            setupWebSocket();
            if (currentMatch) showMatchScoreSection();
        }
    };
    const matchId = getQueryParam('match');
    if (matchId) {
        currentMatch = matches.find(m => m.id == matchId);
        if (currentMatch) {
            showMatchScoreSection();
            return;
        }
    }
};

function updateFinishButton() {
    const btn = document.getElementById('finish-btn');
    if (!btn || !currentMatch) return;
    if (currentMatch.status === 'completed') {
        btn.textContent = 'Unfinish Match';
        btn.style.background = '#e53e3e';
    } else {
        btn.textContent = 'Finish Match';
        btn.style.background = '#38a169';
    }
}

function renderMatchTitle() {
    const title = document.getElementById('match-title');
    if (!title || !currentMatch) return;
    let typeText = '';
    if (currentMatch.holes === 'front9') {
        typeText = 'Front 9';
    } else if (currentMatch.holes === 'back9') {
        typeText = 'Back 9';
    } else {
        typeText = '18 Holes';
    }
    // Optionally append format (singles, foursome, etc.)
    if (currentMatch.format) {
        typeText += ' - ' + currentMatch.format.charAt(0).toUpperCase() + currentMatch.format.slice(1);
    }
    title.textContent = typeText;
}

function renderScoringEnabled() {
    const se = document.getElementById('scoring-enabled');
    if (!se) return;
    if (sEnabled) {
        se.textContent = 'Scoring Enabled';
        se.style.color = 'green';
    } else {
        se.textContent = '';
    }
}   

// Call renderMatchTitle() after loading match data
function loadMatch(matchId) {
    fetch(`/api/match?id=${matchId}`)
        .then(r => r.json())
        .then(data => {
            currentMatch = data.match;
            renderMatchTitle();
            renderHoles();
            updateMatchScoreDisplay();
            updateFinishButton();
        });
}
