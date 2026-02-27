/* ============================================================
   CCTime — app.js (Production)
   ============================================================ */

const GUID_EMPTY = '00000000-0000-0000-0000-000000000001';
const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/* ---------- State ---------- */
let apiUrl = '';
let references = null;  // { specialists, clients, rooms, timeSlots }
let reserves = [];       // array of reserve DTOs for current date
let currentDate = null;  // Date object for displayed day

/* ---------- Date helpers ---------- */
function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateDisplay(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
}

function formatDateShort(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}.${m}`;
}

function getDayName(date) {
    return DAY_NAMES[date.getDay()];
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function isDatePast(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return d < today;
}

function getWeekRange(date) {
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = addDays(date, diffToMonday);
    const sunday = addDays(monday, 6);
    return { monday, sunday };
}

/* ---------- API ---------- */
async function apiPost(endpoint, body = {}) {
    const resp = await fetch(apiUrl + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    return resp.json();
}

async function loadReferences() {
    references = await apiPost('/api/references');
}

async function loadReservesForDate(dateStr) {
    const result = await apiPost('/api/reserves/for-date', { date: dateStr });
    reserves = result.reserves || [];
}

async function saveReserve(command) {
    return await apiPost('/api/reserves/save', command);
}

/* ---------- Config loader ---------- */
async function loadConfig() {
    const resp = await fetch('ui.config.json');
    const cfg = await resp.json();
    apiUrl = cfg.api_url || '';
}

/* ---------- Lookups ---------- */
function getSpecialistName(id) {
    const s = references.specialists.find(x => x.id === id);
    return s ? s.name : '';
}

function getClientName(id) {
    const c = references.clients.find(x => x.id === id);
    return c ? c.name : '';
}

function findReserve(dateStr, timeSlotId, roomId) {
    return reserves.find(r => r.date === dateStr && r.timeSlotId === timeSlotId && r.roomId === roomId);
}

/* ---------- Render header ---------- */
function renderHeader() {
    const { monday, sunday } = getWeekRange(currentDate);
    document.getElementById('header-week-range').textContent =
        `${formatDateShort(monday)} — ${formatDateDisplay(sunday)}`;
    document.getElementById('input-date-picker').value = formatDateISO(currentDate);
}

/* ---------- Render schedule ---------- */
function renderSchedule() {
    renderHeader();

    const dateStr = formatDateISO(currentDate);
    const isPast = isDatePast(dateStr);
    const rooms = references.rooms;
    const slots = references.timeSlots;
    const colCount = 1 + rooms.length;

    // Date row
    const dateRow = document.getElementById('schedule-date-row');
    dateRow.style.gridTemplateColumns = `56px repeat(${rooms.length}, 1fr)`;
    document.getElementById('date-time-label').textContent = '';

    const dateLabel = document.getElementById('date-label');
    dateLabel.textContent = `${formatDateDisplay(currentDate)} ${getDayName(currentDate)}`;
    dateLabel.style.gridColumn = `2 / ${colCount + 1}`;
    dateLabel.style.textAlign = 'center';

    // Grid
    const grid = document.getElementById('schedule-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `56px repeat(${rooms.length}, 1fr)`;

    // Room headers
    const emptyHeader = document.createElement('div');
    emptyHeader.className = 'cell-room-header';
    emptyHeader.id = 'header-time-col';
    grid.appendChild(emptyHeader);

    rooms.forEach((room, ri) => {
        const h = document.createElement('div');
        h.className = 'cell-room-header';
        h.id = `header-room-${ri}`;
        h.textContent = room.name;
        grid.appendChild(h);
    });

    // Rows
    slots.forEach((slot, si) => {
        if (slot.type === 'break') {
            const timeCell = document.createElement('div');
            timeCell.className = 'cell-break cell-break-time';
            timeCell.id = `break-time-${si}`;
            timeCell.textContent = slot.name;
            grid.appendChild(timeCell);

            for (let ri = 0; ri < rooms.length; ri++) {
                const bc = document.createElement('div');
                bc.className = 'cell-break';
                bc.id = `break-${si}-room-${ri}`;
                grid.appendChild(bc);
            }
            return;
        }

        // Time cell
        const timeCell = document.createElement('div');
        timeCell.className = 'cell-time' + (isPast ? ' past' : '');
        timeCell.id = `time-${si}`;
        const timeParts = slot.name.split('-');
        if (timeParts.length === 2) {
            const startSpan = document.createElement('span');
            startSpan.className = 'time-start';
            startSpan.textContent = timeParts[0];
            const endSpan = document.createElement('span');
            endSpan.className = 'time-end';
            endSpan.textContent = timeParts[1];
            timeCell.appendChild(startSpan);
            timeCell.appendChild(endSpan);
        } else {
            timeCell.textContent = slot.name;
        }
        grid.appendChild(timeCell);

        // Reserve cells per room
        rooms.forEach((room, ri) => {
            const cell = document.createElement('div');
            cell.className = 'cell-reserve' + (isPast ? ' past' : '');
            cell.id = `cell-${si}-room-${ri}`;

            const reserve = findReserve(dateStr, slot.id, room.id);

            const specSpan = document.createElement('span');
            specSpan.className = 'specialist-name';
            specSpan.id = `spec-${si}-room-${ri}`;

            const clientSpan = document.createElement('span');
            clientSpan.className = 'client-name';
            clientSpan.id = `client-${si}-room-${ri}`;

            if (reserve) {
                const specName = getSpecialistName(reserve.specialistId);
                const clientName = getClientName(reserve.clientId);

                if (specName && specName !== '-') {
                    specSpan.textContent = specName;
                    if (reserve.specialistConfirmed) {
                        const dot = document.createElement('span');
                        dot.className = 'confirm-dot';
                        specSpan.appendChild(dot);
                    }
                }
                if (clientName && clientName !== '-') {
                    clientSpan.textContent = clientName;
                    if (reserve.clientConfirmed) {
                        const dot = document.createElement('span');
                        dot.className = 'confirm-dot';
                        clientSpan.appendChild(dot);
                    }
                }

                if (reserve.specialistConfirmed && reserve.clientConfirmed) {
                    cell.classList.add('both-confirmed');
                }
            }

            cell.appendChild(specSpan);
            cell.appendChild(clientSpan);

            cell.addEventListener('click', () => {
                openReserveModal(dateStr, slot.id, slot.name, room.id, room.name, isPast);
            });

            grid.appendChild(cell);
        });
    });
}

/* ---------- Reserve modal ---------- */
let modalContext = null;

function openReserveModal(dateStr, timeSlotId, timeSlotName, roomId, roomName, isPast) {
    const modal = document.getElementById('reserve-modal');
    const existing = findReserve(dateStr, timeSlotId, roomId);

    modalContext = { dateStr, timeSlotId, timeSlotName, roomId, roomName, isPast, existingReserve: existing };

    document.getElementById('reserve-modal-title').textContent = existing ? 'Редактирование резерва' : 'Новый резерв';
    document.getElementById('reserve-modal-info').textContent = `${roomName} | ${timeSlotName} | ${formatDateDisplay(new Date(dateStr + 'T00:00:00'))}`;

    populateSelect('select-specialist', references.specialists, existing ? existing.specialistId : GUID_EMPTY);
    populateSelect('select-client', references.clients, existing ? existing.clientId : GUID_EMPTY);

    document.getElementById('input-specialist-count').value = 1;
    document.getElementById('input-client-count').value = 1;

    document.getElementById('check-specialist-confirm').checked = existing ? existing.specialistConfirmed : false;
    document.getElementById('check-client-confirm').checked = existing ? existing.clientConfirmed : false;

    const saveBtn = document.getElementById('btn-reserve-save');
    saveBtn.style.display = isPast ? 'none' : '';

    hideErrors();

    modal.classList.remove('hidden');
}

function closeReserveModal() {
    document.getElementById('reserve-modal').classList.add('hidden');
    modalContext = null;
}

function populateSelect(selectId, items, selectedId) {
    const sel = document.getElementById(selectId);
    sel.innerHTML = '';
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name === '-' ? '— свободно —' : item.name;
        if (item.id === selectedId) opt.selected = true;
        sel.appendChild(opt);
    });
}

/* ---------- Errors display ---------- */
function showErrors(errors) {
    const el = document.getElementById('reserve-modal-errors');
    el.innerHTML = errors.map(e => e.message).join('<br>');
    el.classList.remove('hidden');
}

function hideErrors() {
    const el = document.getElementById('reserve-modal-errors');
    el.innerHTML = '';
    el.classList.add('hidden');
}

/* ---------- Share (Web Share API) ---------- */
function copyToClipboardFallback(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        alert('Текст скопирован в буфер обмена.');
    } catch {
        alert('Скопируйте текст вручную:\n\n' + text);
    }
    document.body.removeChild(ta);
}

async function shareText(text) {
    const shareData = { text };
    if (navigator.share) {
        try {
            if (navigator.canShare && !navigator.canShare(shareData)) {
                copyToClipboardFallback(text);
                return;
            }
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                copyToClipboardFallback(text);
            }
        }
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            alert('Текст скопирован в буфер обмена.');
        } catch {
            copyToClipboardFallback(text);
        }
    } else {
        copyToClipboardFallback(text);
    }
}

function handleShareSpecialist() {
    if (!modalContext) return;
    const { dateStr, timeSlotName, roomName } = modalContext;
    const clientId = document.getElementById('select-client').value;
    const clientName = getClientName(clientId);
    const displayName = (clientName && clientName !== '-') ? clientName : 'Клиент';
    const dateDisplay = formatDateDisplay(new Date(dateStr + 'T00:00:00'));
    const text = `${displayName} подтвердил занятие ${dateDisplay} ${timeSlotName}`;
    shareText(text);
}

function handleShareClient() {
    if (!modalContext) return;
    const { dateStr, timeSlotName, roomName } = modalContext;
    const dateDisplay = formatDateDisplay(new Date(dateStr + 'T00:00:00'));
    const text = `Вы придёте на ${roomName} ${dateDisplay} в ${timeSlotName}?`;
    shareText(text);
}

/* ---------- Save logic ---------- */
async function handleSave() {
    if (!modalContext) return;

    const { dateStr, timeSlotId, roomId, isPast, existingReserve } = modalContext;
    if (isPast) return;

    const command = {
        id: existingReserve ? existingReserve.id : null,
        date: dateStr,
        timeSlotId: timeSlotId,
        roomId: roomId,
        specialistId: document.getElementById('select-specialist').value,
        specialistConfirmed: document.getElementById('check-specialist-confirm').checked,
        specialistRepeats: Math.max(1, parseInt(document.getElementById('input-specialist-count').value) || 1),
        clientId: document.getElementById('select-client').value,
        clientConfirmed: document.getElementById('check-client-confirm').checked,
        clientRepeats: Math.max(1, parseInt(document.getElementById('input-client-count').value) || 1)
    };

    try {
        const result = await saveReserve(command);

        if (result.errors && result.errors.length > 0) {
            showErrors(result.errors);
            return;
        }

        closeReserveModal();
        await loadReservesForDate(dateStr);
        renderSchedule();
    } catch (err) {
        showErrors([{ message: 'Ошибка сервера: ' + err.message }]);
    }
}

/* ---------- Navigation ---------- */
async function navigateToDate(date) {
    currentDate = date;
    const dateStr = formatDateISO(currentDate);
    await loadReservesForDate(dateStr);
    renderSchedule();
}

function goToPrevDay() { navigateToDate(addDays(currentDate, -1)); }
function goToNextDay() { navigateToDate(addDays(currentDate, 1)); }
function goToPrevWeek() { navigateToDate(addDays(currentDate, -7)); }
function goToNextWeek() { navigateToDate(addDays(currentDate, 7)); }

function goToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    navigateToDate(today);
}

/* ---------- Swipe ---------- */
function initSwipe() {
    const el = document.getElementById('schedule-main');
    let startX = 0;
    let startY = 0;
    let tracking = false;

    el.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0) {
            goToNextDay();
        } else {
            goToPrevDay();
        }
    }, { passive: true });
}

/* ---------- Init ---------- */
async function init() {
    try {
        await loadConfig();
        await loadReferences();
    } catch (e) {
        document.body.innerHTML = '<p style="padding:20px;color:red;">Ошибка загрузки: ' + e.message + '</p>';
        return;
    }

    currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    try {
        await loadReservesForDate(formatDateISO(currentDate));
    } catch (e) {
        console.error('Ошибка загрузки резервов:', e);
    }

    // Bind events
    document.getElementById('btn-prev-day').addEventListener('click', goToPrevDay);
    document.getElementById('btn-next-day').addEventListener('click', goToNextDay);
    document.getElementById('btn-prev-week').addEventListener('click', goToPrevWeek);
    document.getElementById('btn-next-week').addEventListener('click', goToNextWeek);
    document.getElementById('btn-today').addEventListener('click', goToToday);
    document.getElementById('input-date-picker').addEventListener('change', (e) => {
        if (e.target.value) {
            navigateToDate(new Date(e.target.value + 'T00:00:00'));
        }
    });
    document.getElementById('btn-reserve-save').addEventListener('click', handleSave);
    document.getElementById('btn-reserve-cancel').addEventListener('click', closeReserveModal);
    document.getElementById('btn-share-specialist').addEventListener('click', handleShareSpecialist);
    document.getElementById('btn-share-client').addEventListener('click', handleShareClient);

    document.getElementById('reserve-modal').addEventListener('click', (e) => {
        if (e.target.id === 'reserve-modal') closeReserveModal();
    });

    initSwipe();
    renderSchedule();
}

init();
