let ws = null;
let wsConnected = false;
let pingInterval = null;
let pongTimeout = null;

// Periodically check WebSocket connection and reconnect if needed

// Remove old interval check, use ping/pong instead
// Ryder Cup Dashboard

async function fetchDashboard() {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    renderTeams(data.teams || []);
    renderMatches(data.matches || {});
}

function renderTeams(teams) {
    const div = document.getElementById('teams');
    div.innerHTML = '';
    teams.forEach(t => {
        div.innerHTML += `<div class="team">${t.name}: <b>${t.score}</b></div>`;
    });
}

function renderMatches(grouped) {
    renderMatchGroup('matches-completed', grouped.completed || [], 'Completed');
    renderMatchGroup('matches-running', grouped.running || [], 'Running');
    renderMatchGroup('matches-prepared', grouped.prepared || [], 'Prepared');
}

function renderMatchGroup(listId, matches, label) {
    let ul = document.getElementById(listId);
    if (!ul) {
        // fallback for old dashboard.html
        ul = document.getElementById('match-list');
        if (!ul) return;
        ul.innerHTML = '';
        matches.forEach(m => {
            ul.innerHTML += matchRow(m);
        });
        return;
    }
    ul.innerHTML = '';
    matches.forEach(m => {
        ul.innerHTML += matchRow(m);
    });
}

function matchRow(m) {
    // Format player lists
    function playerList(players) {
        return (players || []).map(p => `${p.name}(${p.hcp ?? ''})`).join(', ');
    }
    const left = playerList(m.players_a);
    const right = playerList(m.players_b);
    let format = m.format ? m.format.charAt(0).toUpperCase() + m.format.slice(1).replace('_', ' ') : '';
    let score = '';
    if ((m.status === 'completed' || m.status === 'running') && m.score_text) {
        score = ` | ${m.score_text}`;
    }
    // Split players and score into columns for alignment
    return `<li><span class="match-link" onclick="goToScore(${m.id})">
        <span class='match-format'>${format}</span>
        <span class='match-players'>${left} / ${right}</span>
        <span class='match-score'>${score ? score.replace(' | ','') : ''}</span>
    </span></li>`;
}

window.goToScore = function(matchId) {
    window.location.href = `/static/score.html?match=${matchId}`;
};


window.onload = function() {
    console.log('Dashboard loaded');
    fetchDashboard();
    setupWebSocket();
    window.onfocus = function() {
        if (!wsConnected) {
            console.log('Window focused: WebSocket not connected, reconnecting and fetching scores');
            setupWebSocket();
            fetchDashboard();
        }
    };
};

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
        fetchDashboard();
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
        console.log('WebSocket disconnected, will attempt to reconnect in 2s');
        if (pingInterval) clearInterval(pingInterval);
        if (pongTimeout) clearTimeout(pongTimeout);
        reconnectTimeout = setTimeout(setupWebSocket, 2000);
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
        if (e.data === 'update') fetchDashboard();
    };
}
