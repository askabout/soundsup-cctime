/* ============================================================
   CCTime Prototype — app.js
   ============================================================ */

const GUID_EMPTY = '00000000-0000-0000-0000-000000000000';
const STORAGE_KEY = 'cctime.reserves';

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/* ---------- State ---------- */
let config = null;       // loaded from cctime.config.json
let reserves = [];       // array of reserve objects
let currentDate = null;  // Date object for displayed day

/* ---------- UUID ---------- */
function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

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

/* ---------- Storage ---------- */
function loadReserves() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        reserves = raw ? JSON.parse(raw) : [];
    } catch {
        reserves = [];
    }
}

function saveReserves() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reserves));
}

function findReserve(dateStr, timeSlot, roomId) {
    return reserves.find(r => r.date === dateStr && r.timeSlot === timeSlot && r.roomId === roomId);
}

function upsertReserve(reserve) {
    const idx = reserves.findIndex(r => r.id === reserve.id);
    if (idx >= 0) {
        reserves[idx] = reserve;
    } else {
        reserves.push(reserve);
    }
    saveReserves();
}

/* ---------- Config loader ---------- */
async function loadConfig() {
    const resp = await fetch('cctime.config.json');
    config = await resp.json();
}

function getSpecialistName(id) {
    const s = config.specialists.find(x => x.id === id);
    return s ? s.name : '';
}

function getClientName(id) {
    const c = config.clients.find(x => x.id === id);
    return c ? c.name : '';
}

/* ---------- Render header ---------- */
function renderHeader() {
    const { monday, sunday } = getWeekRange(currentDate);
    document.getElementById('header-week-range').textContent =
        `${formatDateShort(monday)} — ${formatDateDisplay(sunday)}`;
}

/* ---------- Render schedule ---------- */
function renderSchedule() {
    renderHeader();

    const dateStr = formatDateISO(currentDate);
    const isPast = isDatePast(dateStr);
    const rooms = config.rooms;
    const slots = config.timeSlots;
    const colCount = 1 + rooms.length; // time + rooms

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
            timeCell.textContent = slot.time;
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
        timeCell.textContent = slot.time;
        grid.appendChild(timeCell);

        // Reserve cells per room
        rooms.forEach((room, ri) => {
            const cell = document.createElement('div');
            cell.className = 'cell-reserve' + (isPast ? ' past' : '');
            cell.id = `cell-${si}-room-${ri}`;

            const reserve = findReserve(dateStr, slot.time, room.id);

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
                    if (reserve.specialistConfirm) {
                        const dot = document.createElement('span');
                        dot.className = 'confirm-dot';
                        specSpan.appendChild(dot);
                    }
                }
                if (clientName && clientName !== '-') {
                    clientSpan.textContent = clientName;
                    if (reserve.clientConfirm) {
                        const dot = document.createElement('span');
                        dot.className = 'confirm-dot';
                        clientSpan.appendChild(dot);
                    }
                }

                // Both confirmed — green cell
                if (reserve.specialistConfirm && reserve.clientConfirm) {
                    cell.classList.add('both-confirmed');
                }
            }

            cell.appendChild(specSpan);
            cell.appendChild(clientSpan);

            cell.addEventListener('click', () => {
                openReserveModal(dateStr, slot.time, room.id, room.name, isPast);
            });

            grid.appendChild(cell);
        });
    });
}

/* ---------- Reserve modal ---------- */
let modalContext = null;

function openReserveModal(dateStr, timeSlot, roomId, roomName, isPast) {
    const modal = document.getElementById('reserve-modal');
    const existing = findReserve(dateStr, timeSlot, roomId);

    modalContext = { dateStr, timeSlot, roomId, roomName, isPast, existingReserve: existing };

    document.getElementById('reserve-modal-title').textContent = existing ? 'Редактирование резерва' : 'Новый резерв';
    document.getElementById('reserve-modal-info').textContent = `${roomName} | ${timeSlot} | ${formatDateDisplay(new Date(dateStr + 'T00:00:00'))}`;

    populateSelect('select-specialist', config.specialists, existing ? existing.specialistId : GUID_EMPTY);
    populateSelect('select-client', config.clients, existing ? existing.clientId : GUID_EMPTY);

    document.getElementById('input-specialist-count').value = 1;
    document.getElementById('input-client-count').value = 1;

    document.getElementById('check-specialist-confirm').checked = existing ? existing.specialistConfirm : false;
    document.getElementById('check-client-confirm').checked = existing ? existing.clientConfirm : false;

    const saveBtn = document.getElementById('btn-reserve-save');
    saveBtn.style.display = isPast ? 'none' : '';

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
    const { dateStr, timeSlot, roomName } = modalContext;
    const clientId = document.getElementById('select-client').value;
    const clientName = getClientName(clientId);
    const displayName = (clientName && clientName !== '-') ? clientName : 'Клиент';
    const dateDisplay = formatDateDisplay(new Date(dateStr + 'T00:00:00'));
    const text = `${displayName} подтвердил занятие ${dateDisplay} ${timeSlot}`;
    shareText(text);
}

function handleShareClient() {
    if (!modalContext) return;
    const { dateStr, timeSlot, roomName } = modalContext;
    const dateDisplay = formatDateDisplay(new Date(dateStr + 'T00:00:00'));
    const text = `Вы придёте на ${roomName} ${dateDisplay} в ${timeSlot}?`;
    shareText(text);
}

/* ---------- Save logic ---------- */
function handleSave() {
    if (!modalContext) return;

    const { dateStr, timeSlot, roomId, isPast, existingReserve } = modalContext;
    if (isPast) return;

    const specialistId = document.getElementById('select-specialist').value;
    const clientId = document.getElementById('select-client').value;
    const specialistConfirm = document.getElementById('check-specialist-confirm').checked;
    const clientConfirm = document.getElementById('check-client-confirm').checked;
    const specCount = Math.max(1, parseInt(document.getElementById('input-specialist-count').value) || 1);
    const clientCount = Math.max(1, parseInt(document.getElementById('input-client-count').value) || 1);

    const baseDate = new Date(dateStr + 'T00:00:00');

    // Check specialist conflicts
    if (specCount > 1 && specialistId !== GUID_EMPTY) {
        for (let w = 1; w < specCount; w++) {
            const futureDate = formatDateISO(addDays(baseDate, w * 7));
            const futureReserve = findReserve(futureDate, timeSlot, roomId);
            if (futureReserve && futureReserve.specialistId !== specialistId && futureReserve.specialistId !== GUID_EMPTY) {
                const conflictSpecName = getSpecialistName(futureReserve.specialistId);
                alert(`Конфликт специалиста на ${futureDate}: уже назначен "${conflictSpecName}". Измените количество недель на 1 для сохранения только текущего резерва.`);
                return;
            }
        }
    }

    // Check client conflicts
    if (clientCount > 1 && clientId !== GUID_EMPTY) {
        for (let w = 1; w < clientCount; w++) {
            const futureDate = formatDateISO(addDays(baseDate, w * 7));
            const futureReserve = findReserve(futureDate, timeSlot, roomId);
            if (futureReserve && futureReserve.clientId !== clientId && futureReserve.clientId !== GUID_EMPTY) {
                const conflictClientName = getClientName(futureReserve.clientId);
                alert(`Конфликт клиента на ${futureDate}: уже назначен "${conflictClientName}". Измените количество недель на 1 для сохранения только текущего резерва.`);
                return;
            }
        }
    }

    // Save current reserve
    const currentReserve = existingReserve
        ? { ...existingReserve, specialistId, clientId, specialistConfirm, clientConfirm }
        : { id: generateUUID(), date: dateStr, timeSlot, roomId, specialistId, clientId, specialistConfirm, clientConfirm };

    upsertReserve(currentReserve);

    // Replicate specialist to future weeks
    for (let w = 1; w < specCount; w++) {
        const futureDate = formatDateISO(addDays(baseDate, w * 7));
        let futureReserve = findReserve(futureDate, timeSlot, roomId);
        if (futureReserve) {
            futureReserve = { ...futureReserve, specialistId, specialistConfirm: false };
        } else {
            futureReserve = {
                id: generateUUID(),
                date: futureDate,
                timeSlot,
                roomId,
                specialistId,
                clientId: GUID_EMPTY,
                specialistConfirm: false,
                clientConfirm: false
            };
        }
        upsertReserve(futureReserve);
    }

    // Replicate client to future weeks
    for (let w = 1; w < clientCount; w++) {
        const futureDate = formatDateISO(addDays(baseDate, w * 7));
        let futureReserve = findReserve(futureDate, timeSlot, roomId);
        if (futureReserve) {
            futureReserve = { ...futureReserve, clientId, clientConfirm: false };
        } else {
            futureReserve = {
                id: generateUUID(),
                date: futureDate,
                timeSlot,
                roomId,
                specialistId: GUID_EMPTY,
                clientId,
                specialistConfirm: false,
                clientConfirm: false
            };
        }
        upsertReserve(futureReserve);
    }

    closeReserveModal();
    renderSchedule();
}

/* ---------- Navigation ---------- */
function goToPrevDay() {
    currentDate = addDays(currentDate, -1);
    renderSchedule();
}

function goToNextDay() {
    currentDate = addDays(currentDate, 1);
    renderSchedule();
}

function goToPrevWeek() {
    currentDate = addDays(currentDate, -7);
    renderSchedule();
}

function goToNextWeek() {
    currentDate = addDays(currentDate, 7);
    renderSchedule();
}

function goToToday() {
    currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    renderSchedule();
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
    } catch (e) {
        document.body.innerHTML = '<p style="padding:20px;color:red;">Ошибка загрузки cctime.config.json</p>';
        return;
    }

    loadReserves();
    currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Bind events
    document.getElementById('btn-prev-day').addEventListener('click', goToPrevDay);
    document.getElementById('btn-next-day').addEventListener('click', goToNextDay);
    document.getElementById('btn-prev-week').addEventListener('click', goToPrevWeek);
    document.getElementById('btn-next-week').addEventListener('click', goToNextWeek);
    document.getElementById('btn-today').addEventListener('click', goToToday);
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
