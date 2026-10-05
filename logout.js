//Looks for the logout link to be clicked
document.getElementById('logoutLink').addEventListener('click', (event) => {
    event.preventDefault; //prevents refresh
    sessionStorage.removeItem('user') //Clears out current user listed in session
    window.location.replace('index.html') //Puts you back on the login screen
});