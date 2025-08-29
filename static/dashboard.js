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
    return `<li><span class="match-link" onclick="goToScore(${m.id})">${format}: ${left} / ${right}</span>${score}<span class="status"> [${m.status}]</span></li>`;
}

window.goToScore = function(matchId) {
    window.location.href = `/static/score.html?match=${matchId}`;
};


window.onload = function() {
    fetchDashboard();
    // WebSocket for live updates
    let wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let ws = new WebSocket(wsProto + '://' + window.location.host + '/ws');
    ws.onmessage = function(e) {
        if (e.data === 'update') fetchDashboard();
    };
};
