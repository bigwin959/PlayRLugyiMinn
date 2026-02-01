let currentData = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    // Event Listeners
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('addGameBtn').addEventListener('click', openAddModal);
    document.getElementById('saveGameBtn').addEventListener('click', saveGame);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
});

async function fetchData() {
    try {
        const res = await fetch('/api/data');
        currentData = await res.json();
        renderSettings();
        renderGames();
    } catch (err) {
        console.error('Error fetching data:', err);
        alert('Failed to load data.');
    }
}

function renderSettings() {
    if (!currentData || !currentData.siteSettings) return;
    const s = currentData.siteSettings;
    document.getElementById('siteTitle').value = s.title || '';
    document.getElementById('randomBtnText').value = s.randomBtnText || '';
    document.getElementById('contactLink').value = s.contactLink || '';
}

function renderGames() {
    const tbody = document.getElementById('gamesTableBody');
    tbody.innerHTML = '';

    if (!currentData || !currentData.games) return;

    currentData.games.forEach((game, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${game.image}" class="preview" alt="${game.name}"></td>
            <td>${game.name}</td>
            <td>${game.provider}</td>
            <td>${game.rtp || '-'}</td>
            <td class="actions">
                <button class="btn-primary" onclick="editGame(${index})">Edit</button>
                <button class="btn-danger" onclick="deleteGame(${index})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function saveSettings() {
    currentData.siteSettings = {
        title: document.getElementById('siteTitle').value,
        randomBtnText: document.getElementById('randomBtnText').value,
        contactLink: document.getElementById('contactLink').value
    };
    await saveData();
    alert('Settings saved!');
}

async function saveData() {
    try {
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData)
        });
        const result = await res.json();
        if (result.success) {
            console.log('Data saved successfully');
        } else {
            alert('Error saving data');
        }
    } catch (err) {
        console.error('Save error:', err);
        alert('Error saving data');
    }
}

function deleteGame(index) {
    if (!confirm('Are you sure you want to delete this game?')) return;
    currentData.games.splice(index, 1);
    saveData().then(renderGames);
}

// Modal Logic
let editingIndex = -1;

function openAddModal() {
    editingIndex = -1;
    document.getElementById('modalTitle').textContent = 'Add New Game';
    document.getElementById('gameForm').reset();
    document.getElementById('gameModal').classList.add('show');
}

window.editGame = function (index) {
    editingIndex = index;
    const game = currentData.games[index];
    document.getElementById('modalTitle').textContent = 'Edit Game';
    document.getElementById('gameName').value = game.name;
    document.getElementById('gameImage').value = game.image;
    document.getElementById('gameProvider').value = game.provider;
    document.getElementById('gameRtp').value = game.rtp || '';
    document.getElementById('gameModal').classList.add('show');
}

function closeModal() {
    document.getElementById('gameModal').classList.remove('show');
}

async function saveGame() {
    const gameData = {
        name: document.getElementById('gameName').value,
        image: document.getElementById('gameImage').value,
        provider: document.getElementById('gameProvider').value,
        rtp: document.getElementById('gameRtp').value
    };

    if (editingIndex === -1) {
        // Add
        currentData.games.push(gameData);
    } else {
        // Update
        currentData.games[editingIndex] = gameData;
    }

    await saveData();
    renderGames();
    closeModal();
}
