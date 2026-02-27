let apiUrl = '';
let specialists = [];
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

async function loadSpecialists() {
    const result = await apiPost('/api/specialists');
    specialists = result.specialists || [];
    renderList();
}

function renderList() {
    const list = document.getElementById('specialists-list');
    list.innerHTML = '';

    specialists.forEach(s => {
        const item = document.createElement('div');
        item.className = 'directory-item' + (s.isArchived ? ' archived' : '');
        item.dataset.id = s.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'directory-item-name';
        nameSpan.textContent = s.name;
        item.appendChild(nameSpan);

        const rightGroup = document.createElement('span');
        rightGroup.style.display = 'flex';
        rightGroup.style.alignItems = 'center';
        rightGroup.style.gap = '6px';

        if (s.isArchived) {
            const badge = document.createElement('span');
            badge.className = 'directory-item-badge';
            badge.textContent = 'архив';
            rightGroup.appendChild(badge);
        }

        const orderSpan = document.createElement('span');
        orderSpan.className = 'directory-item-order';
        orderSpan.textContent = '#' + s.orderIndex;
        rightGroup.appendChild(orderSpan);

        item.appendChild(rightGroup);

        item.addEventListener('click', () => openModal(s));
        list.appendChild(item);
    });
}

function openModal(specialist) {
    if (specialist) {
        editingId = specialist.id;
        document.getElementById('specialist-modal-title').textContent = 'Редактирование';
        document.getElementById('input-specialist-name').value = specialist.name;
        document.getElementById('input-specialist-order').value = specialist.orderIndex;
        document.getElementById('check-specialist-archived').checked = specialist.isArchived;
    } else {
        editingId = null;
        document.getElementById('specialist-modal-title').textContent = 'Новый специалист';
        document.getElementById('input-specialist-name').value = '';
        document.getElementById('input-specialist-order').value = 0;
        document.getElementById('check-specialist-archived').checked = false;
    }
    hideErrors();
    document.getElementById('specialist-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('specialist-modal').classList.add('hidden');
    editingId = null;
}

function showErrors(messages) {
    const el = document.getElementById('specialist-modal-errors');
    el.textContent = messages.join('; ');
    el.classList.remove('hidden');
}

function hideErrors() {
    const el = document.getElementById('specialist-modal-errors');
    el.textContent = '';
    el.classList.add('hidden');
}

async function handleSave() {
    const name = document.getElementById('input-specialist-name').value.trim();
    const orderIndex = parseInt(document.getElementById('input-specialist-order').value, 10) || 0;
    const isArchived = document.getElementById('check-specialist-archived').checked;

    if (!name) {
        showErrors(['Имя специалиста обязательно']);
        return;
    }

    const command = {
        id: editingId,
        name,
        orderIndex,
        isArchived
    };

    const result = await apiPost('/api/specialists/save', command);

    if (result.errors && result.errors.length > 0) {
        showErrors(result.errors.map(e => e.message));
        return;
    }

    closeModal();
    await loadSpecialists();
}

async function init() {
    await loadConfig();
    await loadSpecialists();

    document.getElementById('btn-add-specialist').addEventListener('click', () => openModal(null));
    document.getElementById('btn-specialist-save').addEventListener('click', handleSave);
    document.getElementById('btn-specialist-cancel').addEventListener('click', closeModal);
}

init();
