// reserve.js -  reservation form
const user = checkLogin('student');
const equipmentId = new URLSearchParams(location.search).get('id'); 

// Fill in the equipment name and description 
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

// Form is submitted.
document.getElementById('reserveForm').addEventListener('submit', async function (event) {
  event.preventDefault(); //Don't want to reload
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
