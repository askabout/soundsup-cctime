/* ============================================================
   CCTime — app.js (Production)
   ============================================================ */

const GUID_EMPTY = '00000000-0000-0000-0000-000000000001';
const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/* ---------- State ---------- */
let apiUrl = '';
let references = null;  // { specialists, clients, rooms, timeSlots }
let reserves = [];       // array of reserve DTOs for displayed range
let currentDate = null;  // Date object for displayed day (Monday in multi-day mode)
let viewDays = 1;        // 1, 7, 14, 21, 28, 35
let viewMode = 'day';    // 'day', 'horizontal', 'vertical'

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

function getDayNameShort(date) {
    return DAY_NAMES_SHORT[date.getDay()];
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

function isDateToday(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return d.getTime() === today.getTime();
}

function getWeekRange(date) {
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = addDays(date, diffToMonday);
    const sunday = addDays(monday, 6);
    return { monday, sunday };
}

function getMonday(date) {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return addDays(date, diff);
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

async function loadReservesForRange(startDate, numDays) {
    const dates = [];
    for (let i = 0; i < numDays; i++) {
        dates.push(formatDateISO(addDays(startDate, i)));
    }
    const results = await Promise.all(dates.map(d => apiPost('/api/reserves/for-date', { date: d })));
    reserves = results.flatMap(r => r.reserves || []);
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
    if (viewMode === 'day') {
        const { monday, sunday } = getWeekRange(currentDate);
        document.getElementById('header-week-range').textContent =
            `${formatDateShort(monday)} — ${formatDateDisplay(sunday)}`;
    } else {
        const lastDay = addDays(currentDate, viewDays - 1);
        document.getElementById('header-week-range').textContent =
            `${formatDateShort(currentDate)} — ${formatDateDisplay(lastDay)}`;
    }
    document.getElementById('input-date-picker').value = formatDateISO(currentDate);
}

/* ---------- Render schedule ---------- */
function renderSchedule() {
    renderHeader();
    if (viewMode === 'day') {
        renderSingleDay();
    } else if (viewMode === 'horizontal') {
        renderMultiDay();
    } else {
        renderVerticalMultiWeek();
    }
    updateStickyOffsets();
}

function updateStickyOffsets() {
    const main = document.getElementById('schedule-main');
    if (viewMode === 'day') {
        const dateRow = document.getElementById('schedule-date-row');
        main.style.setProperty('--room-sticky-top', dateRow.offsetHeight + 'px');
    } else {
        const dateHeader = document.querySelector('.cell-date-header');
        main.style.setProperty('--room-sticky-top', (dateHeader ? dateHeader.offsetHeight : 28) + 'px');
    }
}

/* ---------- Single day render ---------- */
function renderSingleDay() {
    const dateRow = document.getElementById('schedule-date-row');
    dateRow.style.display = '';

    const dateStr = formatDateISO(currentDate);
    const isPast = isDatePast(dateStr);
    const rooms = references.rooms;
    const slots = references.timeSlots;
    const colCount = 1 + rooms.length;

    // Date row
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
    grid.style.minWidth = '';

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
            renderReserveCell(cell, reserve);

            cell.addEventListener('click', () => {
                openReserveModal(dateStr, slot.id, slot.name, room.id, room.name, isPast);
            });

            grid.appendChild(cell);
        });
    });
}

/* ---------- Multi-day render ---------- */
function renderMultiDay() {
    // Hide single-day date row
    document.getElementById('schedule-date-row').style.display = 'none';

    const rooms = references.rooms;
    const slots = references.timeSlots;
    const totalCols = rooms.length * viewDays;
    const colWidth = 60;

    const grid = document.getElementById('schedule-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `56px repeat(${totalCols}, minmax(${colWidth}px, 1fr))`;
    grid.style.minWidth = `${56 + totalCols * colWidth}px`;

    // Build dates array
    const dates = [];
    for (let i = 0; i < viewDays; i++) {
        const d = addDays(currentDate, i);
        const ds = formatDateISO(d);
        dates.push({ date: d, dateStr: ds, isPast: isDatePast(ds), isToday: isDateToday(ds) });
    }

    // Row 1: Date headers
    const cornerDate = document.createElement('div');
    cornerDate.className = 'cell-date-header cell-corner-sticky';
    grid.appendChild(cornerDate);

    dates.forEach((day, di) => {
        const isMonday = day.date.getDay() === 1 && di > 0;
        const h = document.createElement('div');
        h.className = 'cell-date-header';
        if (day.isToday) h.classList.add('today');
        else if (day.isPast) h.classList.add('past');
        if (isMonday) h.classList.add('week-separator');
        else if (di > 0) h.classList.add('day-separator');
        h.style.gridColumn = `${2 + di * rooms.length} / ${2 + (di + 1) * rooms.length}`;
        h.textContent = `${getDayNameShort(day.date)} ${formatDateShort(day.date)}`;
        grid.appendChild(h);
    });

    // Row 2: Room headers
    const cornerRoom = document.createElement('div');
    cornerRoom.className = 'cell-room-header cell-room-corner-sticky';
    grid.appendChild(cornerRoom);

    dates.forEach((day, di) => {
        const isMonday = day.date.getDay() === 1 && di > 0;
        rooms.forEach((room, ri) => {
            const h = document.createElement('div');
            h.className = 'cell-room-header';
            if (ri === 0 && di > 0) {
                h.classList.add(isMonday ? 'week-separator' : 'day-separator');
            }
            h.textContent = room.name;
            grid.appendChild(h);
        });
    });

    // Data rows
    slots.forEach((slot, si) => {
        if (slot.type === 'break') {
            const timeCell = document.createElement('div');
            timeCell.className = 'cell-break cell-break-time-sticky';
            timeCell.textContent = slot.name;
            grid.appendChild(timeCell);

            dates.forEach((day, di) => {
                const isMonday = day.date.getDay() === 1 && di > 0;
                for (let ri = 0; ri < rooms.length; ri++) {
                    const bc = document.createElement('div');
                    bc.className = 'cell-break';
                    if (ri === 0 && di > 0) {
                        bc.classList.add(isMonday ? 'week-separator' : 'day-separator');
                    }
                    grid.appendChild(bc);
                }
            });
            return;
        }

        // Time cell (sticky)
        const timeCell = document.createElement('div');
        timeCell.className = 'cell-time cell-time-sticky';
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

        // Reserve cells for each day and room
        dates.forEach((day, di) => {
            const isMonday = day.date.getDay() === 1 && di > 0;
            rooms.forEach((room, ri) => {
                const cell = document.createElement('div');
                cell.className = 'cell-reserve' + (day.isPast ? ' past' : '');
                if (ri === 0 && di > 0) {
                    cell.classList.add(isMonday ? 'week-separator' : 'day-separator');
                }

                const reserve = findReserve(day.dateStr, slot.id, room.id);
                renderReserveCell(cell, reserve);

                cell.addEventListener('click', () => {
                    openReserveModal(day.dateStr, slot.id, slot.name, room.id, room.name, day.isPast);
                });

                grid.appendChild(cell);
            });
        });
    });
}

/* ---------- Vertical multi-week render ---------- */
function renderVerticalMultiWeek() {
    document.getElementById('schedule-date-row').style.display = 'none';

    const rooms = references.rooms;
    const slots = references.timeSlots;
    const numWeeks = viewDays / 7;
    const dayCols = 7 * rooms.length;
    const colWidth = 60;

    const grid = document.getElementById('schedule-grid');
    grid.innerHTML = '';
    // Columns: time(56) + week-label(80) + 7 days × rooms
    grid.style.gridTemplateColumns = `56px 80px repeat(${dayCols}, minmax(${colWidth}px, 1fr))`;
    grid.style.minWidth = `${56 + 80 + dayCols * colWidth}px`;

    // Build weeks: array of 7-element arrays
    const weeks = [];
    for (let w = 0; w < numWeeks; w++) {
        const weekDates = [];
        for (let d = 0; d < 7; d++) {
            const date = addDays(currentDate, w * 7 + d);
            const dateStr = formatDateISO(date);
            weekDates.push({ date, dateStr, isPast: isDatePast(dateStr), isToday: isDateToday(dateStr) });
        }
        weeks.push(weekDates);
    }

    // Determine which week is "current" (contains today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateISO(today);
    let currentWeekIdx = -1;
    for (let w = 0; w < numWeeks; w++) {
        if (todayStr >= weeks[w][0].dateStr && todayStr <= weeks[w][6].dateStr) {
            currentWeekIdx = w;
            break;
        }
    }

    function getWeekLabel(w) {
        if (currentWeekIdx === -1) return '';
        const diff = w - currentWeekIdx;
        if (diff === 0) return 'Текущая';
        if (diff === -1) return 'Пред.';
        if (diff === 1) return 'След.';
        return '';
    }

    // Row 1: Day name headers
    const cornerDay = document.createElement('div');
    cornerDay.className = 'cell-date-header cell-corner-sticky';
    grid.appendChild(cornerDay);

    const weekColHeader = document.createElement('div');
    weekColHeader.className = 'cell-date-header cell-week-col-sticky';
    weekColHeader.textContent = 'Неделя';
    grid.appendChild(weekColHeader);

    for (let dow = 0; dow < 7; dow++) {
        const jsDayIndex = (dow + 1) % 7;
        const h = document.createElement('div');
        h.className = 'cell-date-header';
        if (dow > 0) h.classList.add('day-separator');
        h.style.gridColumn = `${3 + dow * rooms.length} / ${3 + (dow + 1) * rooms.length}`;
        h.textContent = DAY_NAMES_SHORT[jsDayIndex];
        grid.appendChild(h);
    }

    // Row 2: Room headers
    const cornerRoom = document.createElement('div');
    cornerRoom.className = 'cell-room-header cell-room-corner-sticky';
    grid.appendChild(cornerRoom);

    const weekColRoom = document.createElement('div');
    weekColRoom.className = 'cell-room-header cell-week-col-sticky';
    grid.appendChild(weekColRoom);

    for (let dow = 0; dow < 7; dow++) {
        rooms.forEach((room, ri) => {
            const h = document.createElement('div');
            h.className = 'cell-room-header';
            if (ri === 0 && dow > 0) h.classList.add('day-separator');
            h.textContent = room.name;
            grid.appendChild(h);
        });
    }

    // Slot rows — each slot is ONE grid row
    slots.forEach((slot) => {
        if (slot.type === 'break') {
            const timeCell = document.createElement('div');
            timeCell.className = 'cell-break cell-break-time-sticky';
            timeCell.textContent = slot.name;
            grid.appendChild(timeCell);

            // Week column break cell (sticky)
            const weekBreak = document.createElement('div');
            weekBreak.className = 'cell-break cell-week-col-sticky';
            grid.appendChild(weekBreak);

            for (let i = 0; i < dayCols; i++) {
                const bc = document.createElement('div');
                bc.className = 'cell-break';
                if (i % rooms.length === 0 && i > 0) bc.classList.add('day-separator');
                grid.appendChild(bc);
            }
            return;
        }

        // Time cell (sticky)
        const timeCell = document.createElement('div');
        timeCell.className = 'cell-time cell-time-sticky';
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

        // Week label column — group with N sub-blocks
        const weekGroup = document.createElement('div');
        weekGroup.className = 'cell-week-group';

        for (let w = 0; w < numWeeks; w++) {
            const weekSub = document.createElement('div');
            weekSub.className = 'cell-week-sub';
            if (w === currentWeekIdx) weekSub.classList.add('current');

            const label = getWeekLabel(w);
            if (label) {
                const labelSpan = document.createElement('span');
                labelSpan.className = 'week-label';
                labelSpan.textContent = label;
                weekSub.appendChild(labelSpan);
            }

            const datesSpan = document.createElement('span');
            datesSpan.className = 'week-dates';
            datesSpan.textContent = `${formatDateShort(weeks[w][0].date)}—${formatDateShort(weeks[w][6].date)}`;
            weekSub.appendChild(datesSpan);

            weekGroup.appendChild(weekSub);
        }
        grid.appendChild(weekGroup);

        // For each day-of-week × room: one group cell with N sub-blocks
        for (let dow = 0; dow < 7; dow++) {
            rooms.forEach((room, ri) => {
                const group = document.createElement('div');
                group.className = 'cell-reserve-group';
                if (ri === 0 && dow > 0) group.classList.add('day-separator');

                for (let w = 0; w < numWeeks; w++) {
                    const day = weeks[w][dow];
                    const reserve = findReserve(day.dateStr, slot.id, room.id);

                    const sub = document.createElement('div');
                    sub.className = 'cell-reserve-sub';
                    if (day.isPast) sub.classList.add('past');
                    if (reserve && reserve.specialistConfirmed && reserve.clientConfirmed) {
                        sub.classList.add('both-confirmed');
                    }

                    // Date label (hidden via CSS, kept for future use)
                    const dateLabel = document.createElement('span');
                    dateLabel.className = 'sub-date';
                    dateLabel.textContent = formatDateShort(day.date);
                    sub.appendChild(dateLabel);

                    // Specialist
                    const specSpan = document.createElement('span');
                    specSpan.className = 'specialist-name';
                    if (reserve) {
                        const specName = getSpecialistName(reserve.specialistId);
                        if (specName && specName !== '-') {
                            specSpan.textContent = specName;
                            if (reserve.specialistConfirmed) {
                                const dot = document.createElement('span');
                                dot.className = 'confirm-dot';
                                specSpan.appendChild(dot);
                            }
                        }
                    }
                    sub.appendChild(specSpan);

                    // Client
                    const clientSpan = document.createElement('span');
                    clientSpan.className = 'client-name';
                    if (reserve) {
                        const clientName = getClientName(reserve.clientId);
                        if (clientName && clientName !== '-') {
                            clientSpan.textContent = clientName;
                            if (reserve.clientConfirmed) {
                                const dot = document.createElement('span');
                                dot.className = 'confirm-dot';
                                clientSpan.appendChild(dot);
                            }
                        }
                    }
                    sub.appendChild(clientSpan);

                    if (reserve && reserve.comment) {
                        const commentSpan = document.createElement('span');
                        commentSpan.className = 'reserve-comment';
                        commentSpan.textContent = reserve.comment.length > 20
                            ? reserve.comment.slice(0, 20) + '…'
                            : reserve.comment;
                        sub.appendChild(commentSpan);
                    }

                    sub.addEventListener('click', () => {
                        openReserveModal(day.dateStr, slot.id, slot.name, room.id, room.name, day.isPast);
                    });

                    group.appendChild(sub);
                }

                grid.appendChild(group);
            });
        }
    });
}

/* ---------- Shared reserve cell renderer ---------- */
function renderReserveCell(cell, reserve) {
    const specSpan = document.createElement('span');
    specSpan.className = 'specialist-name';

    const clientSpan = document.createElement('span');
    clientSpan.className = 'client-name';

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

    if (reserve && reserve.comment) {
        const commentSpan = document.createElement('span');
        commentSpan.className = 'reserve-comment';
        commentSpan.textContent = reserve.comment.length > 20
            ? reserve.comment.slice(0, 20) + '…'
            : reserve.comment;
        cell.appendChild(commentSpan);
    }
}

/* ---------- Reserve modal ---------- */
let modalContext = null;

function openReserveModal(dateStr, timeSlotId, timeSlotName, roomId, roomName, isPast) {
    const modal = document.getElementById('reserve-modal');
    const existing = findReserve(dateStr, timeSlotId, roomId);

    modalContext = { dateStr, timeSlotId, timeSlotName, roomId, roomName, isPast, existingReserve: existing };

    document.getElementById('reserve-modal-title').textContent = existing ? 'Редактирование резерва' : 'Новый резерв';
    const modalDate = new Date(dateStr + 'T00:00:00');
    document.getElementById('reserve-modal-info').textContent = `${roomName} | ${timeSlotName} | ${getDayName(modalDate)}, ${formatDateDisplay(modalDate)}`;

    populateSelect('select-specialist', references.specialists, existing ? existing.specialistId : GUID_EMPTY);
    populateSelect('select-client', references.clients, existing ? existing.clientId : GUID_EMPTY);

    document.getElementById('input-specialist-count').value = 1;
    document.getElementById('input-client-count').value = 1;

    document.getElementById('check-specialist-confirm').checked = existing ? existing.specialistConfirmed : false;
    document.getElementById('check-client-confirm').checked = existing ? existing.clientConfirmed : false;
    document.getElementById('input-comment').value = existing ? (existing.comment || '') : '';

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

    const hasConflict = errors.some(e => e.code === 'CONFLICT_SPECIALIST' || e.code === 'CONFLICT_CLIENT');
    const overwriteEl = document.getElementById('reserve-modal-overwrite');
    if (hasConflict) {
        overwriteEl.classList.remove('hidden');
    } else {
        overwriteEl.classList.add('hidden');
        document.getElementById('check-force-overwrite').checked = false;
    }
}

function hideErrors() {
    const el = document.getElementById('reserve-modal-errors');
    el.innerHTML = '';
    el.classList.add('hidden');
    document.getElementById('reserve-modal-overwrite').classList.add('hidden');
    document.getElementById('check-force-overwrite').checked = false;
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
        clientRepeats: Math.max(1, parseInt(document.getElementById('input-client-count').value) || 1),
        forceOverwrite: document.getElementById('check-force-overwrite').checked,
        comment: document.getElementById('input-comment').value.trim() || null
    };

    try {
        const result = await saveReserve(command);

        if (result.errors && result.errors.length > 0) {
            showErrors(result.errors);
            return;
        }

        closeReserveModal();
        await loadCurrentView();
        renderSchedule();
    } catch (err) {
        showErrors([{ message: 'Ошибка сервера: ' + err.message }]);
    }
}

/* ---------- Data loading for current view ---------- */
async function loadCurrentView() {
    if (viewMode === 'day') {
        await loadReservesForDate(formatDateISO(currentDate));
    } else {
        await loadReservesForRange(currentDate, viewDays);
    }
}

/* ---------- Navigation ---------- */
async function navigateToDate(date) {
    currentDate = date;
    if (viewMode !== 'day') {
        currentDate = getMonday(currentDate);
    }
    currentDate.setHours(0, 0, 0, 0);
    await loadCurrentView();
    renderSchedule();
}

function goToPrevDay() { navigateToDate(addDays(currentDate, viewMode === 'horizontal' ? -7 : -1)); }
function goToNextDay() { navigateToDate(addDays(currentDate, viewMode === 'horizontal' ? 7 : 1)); }
function goToPrevWeek() { navigateToDate(addDays(currentDate, viewMode === 'horizontal' ? -28 : -7)); }
function goToNextWeek() { navigateToDate(addDays(currentDate, viewMode === 'horizontal' ? 28 : 7)); }

function goToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    navigateToDate(today);
}

async function handleViewModeChange(e) {
    const val = e.target.value;
    if (val.startsWith('v')) {
        viewDays = parseInt(val.substring(1));
        viewMode = 'vertical';
    } else {
        viewDays = parseInt(val) || 1;
        viewMode = viewDays === 1 ? 'day' : 'horizontal';
    }
    if (viewMode !== 'day') {
        currentDate = getMonday(currentDate);
    }
    await loadCurrentView();
    renderSchedule();
}

/* ---------- Swipe ---------- */
function initSwipe() {
    const el = document.getElementById('schedule-main');
    let startX = 0;
    let startY = 0;
    let tracking = false;

    el.addEventListener('touchstart', (e) => {
        if (viewMode !== 'day') return;
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
    document.getElementById('select-view-mode').addEventListener('change', handleViewModeChange);
    document.getElementById('btn-reserve-save').addEventListener('click', handleSave);
    document.getElementById('btn-reserve-cancel').addEventListener('click', closeReserveModal);
    document.getElementById('btn-share-specialist').addEventListener('click', handleShareSpecialist);
    document.getElementById('btn-share-client').addEventListener('click', handleShareClient);
    document.getElementById('btn-clear-specialist').addEventListener('click', () => {
        document.getElementById('select-specialist').value = GUID_EMPTY;
    });
    document.getElementById('btn-clear-client').addEventListener('click', () => {
        document.getElementById('select-client').value = GUID_EMPTY;
    });
    document.getElementById('btn-refresh').addEventListener('click', async () => {
        await loadCurrentView();
        renderSchedule();
    });

    initSwipe();
    renderSchedule();
}

init();
