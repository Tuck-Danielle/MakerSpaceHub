// student.js - the student dashboard
const user = checkLogin('student');

// Build the equipment grid and the "My reservations" table.
async function showPage() {
  const equipment = await loadData('equipment');
  const tickets = await loadData('tickets');
  const reservations = await loadData('reservations');

  // Equipment grid, 3 items per row
  let grid = '<tr>';
  for (let i = 0; i < equipment.length; i++) {
    const item = equipment[i];
    grid += '<td>';
    grid += '<img src="placeholder.svg" alt="' + escapeHtml(item.name) + '">';
    grid += '<p class="equip-name">' + escapeHtml(item.name) + '</p>';
    grid += '<p class="equip-desc">' + escapeHtml(item.description) + '</p>';
    if (isDown(item.id, tickets)) {
      grid += '<span class="reserveButton disabled">In Maintenance</span>';
    } else {
      grid += '<a class="reserveButton" href="CreateReservations.html?id=' + encodeURIComponent(item.id) + '">Reserve</a>';
    }
    grid += '</td>';
    if ((i + 1) % 3 === 0 && i + 1 < equipment.length) {
      grid += '</tr><tr>'; // start a new row after every 3rd item (not after the last one)
    }
  }
  grid += '</tr>';
  document.getElementById('equipGrid').innerHTML = grid;

  // This student's upcoming, confirmed reservations
  let rows = '';
  const now = dateToText(new Date());
  for (let i = 0; i < reservations.length; i++) {
    const r = reservations[i];
    if (r.user === user.username && r.status === 'confirmed' && r.end > now) {
      rows += '<tr>';
      rows += '<td>' + escapeHtml(findById(equipment, r.equipmentId).name) + '</td>';
      rows += '<td>' + showDateTime(r.start) + '</td>';
      rows += '<td>' + showDateTime(r.end) + '</td>';
      rows += '<td><button class="linkButton" onclick="cancelClicked(\'' + r.id + '\')">Cancel</button></td>';
      rows += '</tr>';
    }
  }
  if (rows === '') {
    rows = '<tr><td colspan="4">No upcoming reservations.</td></tr>';
  }
  document.getElementById('myRes').innerHTML = rows;
}

// Runs when a Cancel button is clicked.
async function cancelClicked(reservationId) {
  await cancelReservation(reservationId);
  showPage();
}

if (user !== null) {
  showPage();
}
