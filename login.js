//Disctionary for dashboards based on role 
const dashboards = {
    student: 'StudentDashboard.html',
    staff: 'StaffDashboard.html',
    maint: 'MaintDashboard.html',
  };
  
  //Autnenticate function, compares user data with Json file
  async function authenticate(username, password) {
    const response = await fetch('api/users.json'); //what file to reference
    if (!response.ok) throw new Error(`Request failed: ${response.status}`); //error if not responding
    const users = await response.json(); //wait for the response
  
    //returns user or null if not found
    return users.find(u => u.username === username && u.password === password) || null;
  }
  
  //Listens for the login button to be clicked
  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
  
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const error = document.getElementById('loginError');
  
    //Error handling for when reading from the json file and redirecting
    try { 
      const user = await authenticate(username, password);   // waits until function returns with valid data
  
      if (!user) { //authenticate returned null
        error.textContent = 'Invalid username or password.'; //error if username/password doesn't match data
        return;
      }

      //Creates persistence in what user is logged in 
      sessionStorage.setItem('user', JSON.stringify({ username: user.username, role: user.role }));
      window.location.href = dashboards[user.role]; //redirects user to their role's dashboard 

    } catch (err) {
      error.textContent = 'Could not reach the login server.';
      console.error(err);
    }
  });