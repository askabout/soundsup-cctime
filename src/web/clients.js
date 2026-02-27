let apiUrl = '';
let clients = [];
let editingId = null;

async function loadConfig() {
    const resp = await fetch('ui.config.json');
    const config = await resp.json();
    apiUrl = config.api_url;
}

async function apiPost(endpoint, body = {}) {
    const resp = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return resp.json();
}

async function loadClients() {
    const result = await apiPost('/api/clients');
    clients = result.clients || [];
    renderList();
}

function renderList() {
    const list = document.getElementById('clients-list');
    list.innerHTML = '';

    clients.forEach(c => {
        const item = document.createElement('div');
        item.className = 'directory-item' + (c.isArchived ? ' archived' : '');
        item.dataset.id = c.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'directory-item-name';
        nameSpan.textContent = c.name;
        item.appendChild(nameSpan);

        const rightGroup = document.createElement('span');
        rightGroup.style.display = 'flex';
        rightGroup.style.alignItems = 'center';
        rightGroup.style.gap = '6px';

        if (c.isArchived) {
            const badge = document.createElement('span');
            badge.className = 'directory-item-badge';
            badge.textContent = 'архив';
            rightGroup.appendChild(badge);
        }

        const orderSpan = document.createElement('span');
        orderSpan.className = 'directory-item-order';
        orderSpan.textContent = '#' + c.orderIndex;
        rightGroup.appendChild(orderSpan);

        item.appendChild(rightGroup);

        item.addEventListener('click', () => openModal(c));
        list.appendChild(item);
    });
}

function openModal(client) {
    if (client) {
        editingId = client.id;
        document.getElementById('client-modal-title').textContent = 'Редактирование';
        document.getElementById('input-client-name').value = client.name;
        document.getElementById('input-client-order').value = client.orderIndex;
        document.getElementById('check-client-archived').checked = client.isArchived;
    } else {
        editingId = null;
        document.getElementById('client-modal-title').textContent = 'Новый клиент';
        document.getElementById('input-client-name').value = '';
        document.getElementById('input-client-order').value = 0;
        document.getElementById('check-client-archived').checked = false;
    }
    hideErrors();
    document.getElementById('client-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('client-modal').classList.add('hidden');
    editingId = null;
}

function showErrors(messages) {
    const el = document.getElementById('client-modal-errors');
    el.textContent = messages.join('; ');
    el.classList.remove('hidden');
}

function hideErrors() {
    const el = document.getElementById('client-modal-errors');
    el.textContent = '';
    el.classList.add('hidden');
}

async function handleSave() {
    const name = document.getElementById('input-client-name').value.trim();
    const orderIndex = parseInt(document.getElementById('input-client-order').value, 10) || 0;
    const isArchived = document.getElementById('check-client-archived').checked;

    if (!name) {
        showErrors(['Имя клиента обязательно']);
        return;
    }

    const command = {
        id: editingId,
        name,
        orderIndex,
        isArchived
    };

    const result = await apiPost('/api/clients/save', command);

    if (result.errors && result.errors.length > 0) {
        showErrors(result.errors.map(e => e.message));
        return;
    }

    closeModal();
    await loadClients();
}

async function init() {
    await loadConfig();
    await loadClients();

    document.getElementById('btn-add-client').addEventListener('click', () => openModal(null));
    document.getElementById('btn-client-save').addEventListener('click', handleSave);
    document.getElementById('btn-client-cancel').addEventListener('click', closeModal);
}

init();
