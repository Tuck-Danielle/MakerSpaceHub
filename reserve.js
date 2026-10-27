// reserve.js - the reservation form
const user = checkLogin('student');
const equipmentId = new URLSearchParams(location.search).get('id'); // from ...?id=cnc-router

// Fill in the equipment name and description at the top of the page.
async function showEquipment() {
  const equipment = await loadData('equipment');
  const item = findById(equipment, equipmentId);
  if (item === null) {
    location.replace('StudentDashboard.html'); // unknown equipment, go back
    return;
  }
  document.getElementById('eqName').textContent = item.name;
  document.getElementById('eqDesc').textContent = item.description;
  document.getElementById('date').min = todayText(); // can't pick past dates
}

// Runs when the form is submitted.
document.getElementById('reserveForm').addEventListener('submit', async function (event) {
  event.preventDefault(); // stop the page from reloading
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const minutes = Number(document.getElementById('duration').value);

  const result = await reserve(equipmentId, user.username, date, time, minutes);
  if (result.ok) {
    location.href = 'StudentDashboard.html';
  } else {
    document.getElementById('msg').textContent = result.error;
  }
});

if (user !== null) {
  showEquipment();
}
