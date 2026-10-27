// maint.js - the maintenance dashboard
const user = checkLogin('maint');

async function showPage() {
  const equipment = await loadData('equipment');
  const tickets = await loadData('tickets');

  // Tickets table
  let rows = '';
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    rows += '<tr><td>' + t.id + '</td><td>' + escapeHtml(findById(equipment, t.equipmentId).name) + '</td>';
    rows += '<td>' + escapeHtml(t.assigned) + '</td><td>' + t.priority + '</td><td>' + t.status + '</td>';
    rows += '<td>' + showDate(t.created) + '</td><td>' + showDate(t.updated) + '</td></tr>';
  }
  document.getElementById('tickets').innerHTML = rows;

  // Equipment filter dropdown (filled once)
  const filter = document.getElementById('eqFilter');
  if (filter.options.length === 0) {
    filter.innerHTML = '<option value="all">All equipment</option>';
    for (let i = 0; i < equipment.length; i++) {
      filter.innerHTML += '<option value="' + equipment[i].id + '">' + escapeHtml(equipment[i].name) + '</option>';
    }
  }

  // History table: every log line of every ticket that matches the filter
  let history = '';
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (filter.value === 'all' || filter.value === t.equipmentId) {
      for (let j = 0; j < t.log.length; j++) {
        const line = t.log[j];
        history += '<tr><td>' + showDate(line.date) + '</td><td>' + t.id + '</td><td>' + escapeHtml(line.by) + '</td>';
        history += '<td>' + line.status + '</td><td>' + escapeHtml(line.note) + '</td></tr>';
      }
    }
  }
  if (history === '') {
    history = '<tr><td colspan="5">No history for this equipment.</td></tr>';
  }
  document.getElementById('history').innerHTML = history;

  // Update form: only tickets that aren't finished
  let options = '';
  for (let i = 0; i < tickets.length; i++) {
    if (tickets[i].status !== 'Completed') {
      options += '<option value="' + tickets[i].id + '">' + tickets[i].id + ' - ' +
                 escapeHtml(findById(equipment, tickets[i].equipmentId).name) + '</option>';
    }
  }
  if (options === '') {
    options = '<option value="">No open tickets</option>';
  }
  document.getElementById('ticket').innerHTML = options;
}

// Show different history when the dropdown changes
document.getElementById('eqFilter').addEventListener('change', showPage);

// Ticket update form
document.getElementById('updateForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const ticketId = document.getElementById('ticket').value;
  if (ticketId === '') {
    return; // nothing to update
  }
  await updateTicket(ticketId, document.getElementById('status').value,
                     document.getElementById('notes').value.trim(), user.username);
  document.getElementById('notes').value = '';
  showPage();
});

if (user !== null) {
  showPage();
}
