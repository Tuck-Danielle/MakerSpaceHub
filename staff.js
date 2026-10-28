// staff.js -  staff dashboard
const user = checkLogin('staff');

// The first time, fill a dropdown with options
function fillDropdown(selectId, list) {
  const select = document.getElementById(selectId);
  if (select.options.length > 0) {
    return;
  }
  for (let i = 0; i < list.length; i++) {
    select.innerHTML += '<option value="' + list[i].id + '">' + escapeHtml(list[i].name) + '</option>';
  }
}

async function showPage() {
  const inventory = await loadData('inventory');
  const equipment = await loadData('equipment');
  const tickets = await loadData('tickets');

  // Inventory table and low stock alert
  let rows = '';
  let lowCount = 0;
  let lowText = '';
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    rows += '<tr><td>' + escapeHtml(item.name) + '</td><td>' + escapeHtml(item.description) + '</td>';
    rows += '<td>' + item.stock.toFixed(2) + '</td><td>' + item.lowThreshold.toFixed(2) + '</td></tr>';
    if (item.stock < item.lowThreshold) {
      lowCount++;
      lowText += '<span>' + escapeHtml(item.name) + ': ' + item.stock + '</span>';
    }
  }
  document.getElementById('invRows').innerHTML = rows;
  document.getElementById('alerts').innerHTML = '<strong>Low stock alerts: ' + lowCount + '</strong>' + lowText;

  // Equipment table
  let eqRows = '';
  for (let i = 0; i < equipment.length; i++) {
    const e = equipment[i];
    let status = 'Available';
    if (isDown(e.id, tickets)) {
      status = 'Maintenance';
    }
    eqRows += '<tr><td>' + escapeHtml(e.name) + '</td><td>' + escapeHtml(e.description) + '</td>';
    eqRows += '<td>' + escapeHtml(e.category) + '</td><td>' + status + '</td></tr>';
  }
  document.getElementById('eqRows').innerHTML = eqRows;

  fillDropdown('item', inventory);
  fillDropdown('equipment', equipment);
}

// Inventory form
document.getElementById('invForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const direction = Number(document.getElementById('action').value); // 1 = add, -1 = subtract
  const quantity = Number(document.getElementById('qty').value);

  const result = await adjustStock(document.getElementById('item').value, direction * quantity);
  if (result.ok) {
    document.getElementById('invMsg').textContent = '';
    document.getElementById('qty').value = '';
  } else {
    document.getElementById('invMsg').textContent = result.error;
  }
  showPage();
});

// Ticket form
document.getElementById('ticketForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const newId = await createTicket(
    document.getElementById('equipment').value,
    document.getElementById('reason').value.trim(),
    document.getElementById('priority').value,
    user.username
  );
  document.getElementById('msg').textContent = 'Ticket ' + newId + ' created.';
  document.getElementById('reason').value = '';
  showPage();
});

// "Reset demo data" link
document.getElementById('resetLink').addEventListener('click', function (event) {
  event.preventDefault();
  resetData();
});

if (user !== null) {
  showPage();
}
