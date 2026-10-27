// equipment.js - the "database" for MakerspaceHub.
// Data starts in the api/*.json files. The first time we load a file, we copy it into
// localStorage (the browser's built-in storage). After that we read and change the copy.

// ---------- Loading and saving ----------

// Save a list (like all reservations) into the browser.
function saveData(name, data) {
  localStorage.setItem('mh_' + name, JSON.stringify(data));
}

// Get a list by name: 'equipment', 'reservations', 'tickets' or 'inventory'.
async function loadData(name) {
  // Equipment is never changed by the app, so always read it fresh from the JSON file.
  // (Otherwise edits to api/equipment.json would be hidden by an old saved copy.)
  const saved = (name === 'equipment') ? null : localStorage.getItem('mh_' + name);
  if (saved !== null) {
    return JSON.parse(saved); // we already have a copy, use it
  }
  const response = await fetch('api/' + name + '.json'); // first visit: read the JSON file
if (!response.ok) {
    throw new Error('Could not load api/' + name + '.json (status ' + response.status + ')');
  }
  const data = await response.json();
if (name !== 'equipment') {
  saveData(name, data);
}
  return data;
}

// Throw away all changes and go back to the JSON file data.
function resetData() {
  const names = ['equipment', 'reservations', 'tickets', 'inventory'];
  for (let i = 0; i < names.length; i++) {
    localStorage.removeItem('mh_' + names[i]);
  }
  location.reload();
}

// ---------- Login check ----------

// Call at the top of a page. Sends people back to the login if they aren't the right role.
// Returns the logged-in user, like { username: 'Susan', role: 'student' }.
function checkLogin(role) {
  const user = JSON.parse(sessionStorage.getItem('user'));
  if (user === null || user.role !== role) {
    location.replace('index.html');
    return null;
  }
  return user;
}

// ---------- Small helpers ----------

// Find the item in a list whose id matches. Returns null if there isn't one.
function findById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return list[i];
    }
  }
  return null;
}

// Turn a number like 5 into '05' so times look right.
function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return '' + number;
}

// Turn a Date into text like '2026-10-28T09:00'.
// Text in this format can be compared with < and > to see which time is earlier.
function dateToText(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
         'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

// Today's date as text like '2026-10-28'.
function todayText() {
  return dateToText(new Date()).slice(0, 10);
}

// Make text safe to put inside HTML (stops someone typing <b> or <script> into a note).
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Show a stored date-time like '2026-10-28T09:00' in a friendly way.
function showDateTime(text) {
  return new Date(text).toLocaleString();
}

// Show a stored date like '2026-09-21'. Tickets that haven't been updated have no date.
function showDate(text) {
  if (text === null) {
    return '---';
  }
  return new Date(text + 'T00:00').toLocaleDateString();
}

// ---------- Equipment and tickets ----------

// Equipment is out of service if it has an unfinished ticket that is
// 'In Progress' or High priority. (Change this rule here if you want a different one.)
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

// Make a new ticket. Returns its id, like 'MT-105'.
async function createTicket(equipmentId, reason, priority, username) {
  const tickets = await loadData('tickets');

  // Find the biggest ticket number so far, then add 1.
  let biggest = 100;
  for (let i = 0; i < tickets.length; i++) {
    const number = Number(tickets[i].id.split('-')[1]); // 'MT-104' -> 104
    if (number > biggest) {
      biggest = number;
    }
  }
  const newId = 'MT-' + (biggest + 1);

  const today = todayText();
  tickets.unshift({ // unshift puts it at the top of the list
    id: newId, equipmentId: equipmentId, assigned: 'Unassigned', priority: priority,
    status: 'Pending', created: today, updated: null,
    log: [{ date: today, status: 'Pending', by: username, note: reason }]
  });
  saveData('tickets', tickets);
  return newId;
}

// Change a ticket's status and add a line to its history.
async function updateTicket(ticketId, status, note, username) {
  const tickets = await loadData('tickets');
  const ticket = findById(tickets, ticketId);
  ticket.status = status;
  ticket.assigned = username;
  ticket.updated = todayText();
  ticket.log.push({ date: ticket.updated, status: status, by: username, note: note });
  saveData('tickets', tickets);
}

// ---------- Reservations ----------

// Try to book equipment. Returns { ok: true } or { ok: false, error: 'why not' }.
async function reserve(equipmentId, username, date, time, minutes) {
  if (date === '') {
    return { ok: false, error: 'Choose a date.' };
  }

  const start = date + 'T' + time; // e.g. '2026-10-28T09:00'
  const endDate = new Date(start);
  endDate.setMinutes(endDate.getMinutes() + minutes);
  const end = dateToText(endDate);

  if (start < dateToText(new Date())) {
    return { ok: false, error: 'That time has already passed.' };
  }

  const tickets = await loadData('tickets');
  if (isDown(equipmentId, tickets)) {
    return { ok: false, error: 'This equipment is in maintenance.' };
  }

  // Two bookings overlap when each one starts before the other ends.
  const reservations = await loadData('reservations');
  for (let i = 0; i < reservations.length; i++) {
    const r = reservations[i];
    if (r.equipmentId === equipmentId && r.status === 'confirmed' && start < r.end && end > r.start) {
      return { ok: false, error: 'Already reserved ' + showDateTime(r.start) + ' to ' + showDateTime(r.end) + '.' };
    }
  }

  reservations.push({ id: 'R-' + Date.now(), equipmentId: equipmentId, user: username,
                      start: start, end: end, status: 'confirmed' });
  saveData('reservations', reservations);
  return { ok: true };
}

// Cancel a reservation (we keep it in the list but mark it cancelled).
async function cancelReservation(reservationId) {
  const reservations = await loadData('reservations');
  findById(reservations, reservationId).status = 'cancelled';
  saveData('reservations', reservations);
}

// ---------- Inventory ----------

// Add (positive number) or subtract (negative number) stock.
// Returns { ok: true } or { ok: false, error: 'why not' }.
async function adjustStock(itemId, change) {
  if (isNaN(change) || change === 0) {
    return { ok: false, error: 'Enter a quantity greater than 0.' };
  }
  const inventory = await loadData('inventory');
  const item = findById(inventory, itemId);
  const newStock = Math.round((item.stock + change) * 100) / 100; // rounds to 2 decimals
  if (newStock < 0) {
    return { ok: false, error: "Can't subtract " + Math.abs(change) + ": only " + item.stock + " of " + item.name + " in stock." };
  }
  item.stock = newStock;
  saveData('inventory', inventory);
  return { ok: true };
}
