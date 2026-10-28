// ---------- loading / saving ----------

function saveData(name, data) {
  localStorage.setItem('mh_' + name, JSON.stringify(data));
}

// name is 'equipment', 'reservations', 'tickets' or 'inventory'
async function loadData(name) {
  // equipment never changes in the app, so just read the file 
  const saved = (name === 'equipment') ? null : localStorage.getItem('mh_' + name);
  if (saved !== null) {
    return JSON.parse(saved);
  }

  const response = await fetch('api/' + name + '.json');
  if (!response.ok) {
    throw new Error('Could not load api/' + name + '.json (status ' + response.status + ')');
  }
  const data = await response.json();

  if (name !== 'equipment') {
    saveData(name, data);
  }
  return data;
}

// Clears session storage to revert back to just the json fiels
function resetData() {
  const names = ['equipment', 'reservations', 'tickets', 'inventory'];
  for (let i = 0; i < names.length; i++) {
    localStorage.removeItem('mh_' + names[i]);
  }
  location.reload();
}


// ---------- login check ----------

// Put at the top of each dashboard. Kicks you back to the login page if you're
// not logged in or have the wrong role, otherwise returns the user.
function checkLogin(role) {
  const user = JSON.parse(sessionStorage.getItem('user'));
  if (user === null || user.role !== role) {
    location.replace('index.html');
    return null;
  }
  return user;
}


// ---------- helpers ----------

function findById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return list[i];
    }
  }
  return null;
}

// makes the numbrs prettier
function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return '' + number;
}

// Date -> '2026-10-28T09:00'. Strings in this format can be compared with < and >
// to see which time comes first, which the reservation check uses.
function dateToText(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
         'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

// '2026-10-28'
function todayText() {
  return dateToText(new Date()).slice(0, 10);
}

// so a note with <b> or <script> in it shows up as plain text
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showDateTime(text) {
  return new Date(text).toLocaleString();
}

// tickets that were never updated have null here
function showDate(text) {
  if (text === null) {
    return '---';
  }
  return new Date(text + 'T00:00').toLocaleDateString();
}


// ---------- equipment and tickets ----------

// Equipment counts as down if it has an open ticket that is In Progress or High priority.
// Change the rule here if we want something different.
function isDown(equipmentId, tickets) {
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (t.equipmentId === equipmentId && t.status !== 'Completed') {
      if (t.status === 'In Progress' || t.priority === 'High') {
        return true;
      }
    }
  }
  return false;
}

// returns the new ticket id, like 'MT-105'
async function createTicket(equipmentId, reason, priority, username) {
  const tickets = await loadData('tickets');

  // new id = highest number so far + 1
  let biggest = 100;
  for (let i = 0; i < tickets.length; i++) {
    const number = Number(tickets[i].id.split('-')[1]);
    if (number > biggest) {
      biggest = number;
    }
  }
  const newId = 'MT-' + (biggest + 1);

  const today = todayText();
  tickets.unshift({
    id: newId,
    equipmentId: equipmentId,
    assigned: 'Unassigned',
    priority: priority,
    status: 'Pending',
    created: today,
    updated: null,
    log: [{ date: today, status: 'Pending', by: username, note: reason }]
  });
  saveData('tickets', tickets);
  return newId;
}

// sets the new status and adds a line to the ticket's history
async function updateTicket(ticketId, status, note, username) {
  const tickets = await loadData('tickets');
  const ticket = findById(tickets, ticketId);
  ticket.status = status;
  ticket.assigned = username;
  ticket.updated = todayText();
  ticket.log.push({ date: ticket.updated, status: status, by: username, note: note });
  saveData('tickets', tickets);
}


// ---------- reservations ----------

// returns { ok: true } or { ok: false, error: '...' }
async function reserve(equipmentId, username, date, time, minutes) {
  if (date === '') {
    return { ok: false, error: 'Choose a date.' };
  }

  const start = date + 'T' + time;
  const endDate = new Date(start);
  endDate.setMinutes(endDate.getMinutes() + minutes);
  const end = dateToText(endDate);

  if (start < dateToText(new Date())) {
    return { ok: false, error: 'Can not select time in the past.' };
  }

  const tickets = await loadData('tickets');
  if (isDown(equipmentId, tickets)) {
    return { ok: false, error: 'Equipment is in maintenance.' };
  }

  // two reservations overlap if each one starts before the other one ends
  const reservations = await loadData('reservations');
  for (let i = 0; i < reservations.length; i++) {
    const r = reservations[i];
    if (r.equipmentId === equipmentId && r.status === 'confirmed' && start < r.end && end > r.start) {
      return { ok: false, error: 'Already reserved ' + showDateTime(r.start) + ' to ' + showDateTime(r.end) + '.' };
    }
  }

  reservations.push({
    id: 'R-' + Date.now(),
    equipmentId: equipmentId,
    user: username,
    start: start,
    end: end,
    status: 'confirmed'
  });
  saveData('reservations', reservations);
  return { ok: true };
}

// stays in the list, just marked cancelled
async function cancelReservation(reservationId) {
  const reservations = await loadData('reservations');
  findById(reservations, reservationId).status = 'cancelled';
  saveData('reservations', reservations);
}


// ---------- inventory ----------

// change is positive to add stock, negative to remove
// returns { ok: true } or { ok: false, error: '...' }
async function adjustStock(itemId, change) {
  if (isNaN(change) || change === 0) {
    return { ok: false, error: 'Enter a quantity greater than 0.' };
  }

  const inventory = await loadData('inventory');
  const item = findById(inventory, itemId);

  // round to 2 decimals 
  const newStock = Math.round((item.stock + change) * 100) / 100;
  if (newStock < 0) {
    return { ok: false, error: "Can't subtract " + Math.abs(change) + ": only " + item.stock + " of " + item.name + " in stock." };
  }

  item.stock = newStock;
  saveData('inventory', inventory);
  return { ok: true };
}