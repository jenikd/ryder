// Ryder Cup Dashboard Frontend

async function fetchDashboard() {
    const res = await fetch('/api/dashboard');
    if (!res.ok) return;
    const data = await res.json();
    renderTeams(data.teams || []);
    renderMatches(data.matches || []);
}

function renderTeams(teams) {
    const el = document.getElementById('teams');
    el.innerHTML = '';
    teams.forEach(team => {
        const div = document.createElement('div');
        div.className = 'player';
        div.innerHTML = `<b>${team.name}</b> (${team.score || 0} pts)`;
        el.appendChild(div);
    });
}

function renderMatches(matches) {
    const el = document.getElementById('match-list');
    el.innerHTML = '';
    matches.forEach(match => {
        const div = document.createElement('div');
        div.className = 'match';
        div.innerHTML = `
            <b>${match.format.toUpperCase()}</b> - <span class="status">${match.status}</span><br>
            <span>${(match.players_a||[]).map(p=>p.name).join(', ')}</span>
            vs
            <span>${(match.players_b||[]).map(p=>p.name).join(', ')}</span>
        `;
        el.appendChild(div);
    });
}

setInterval(fetchDashboard, 3000);
window.onload = fetchDashboard;
