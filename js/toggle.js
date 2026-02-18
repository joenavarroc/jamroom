// Obtiene el contenedor con el id 'container' del documento HTML
const container = document.getElementById('container');


const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');


registerBtn.addEventListener('click', () => {
       container.classList.add("active");
});

// Añade un evento al botón de inicio de sesión que se activa cuando se hace clic
loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

const vipCard = document.getElementById("vipCard");

vipCard.addEventListener("click", (e) => {
    // evita que el click en inputs cierre el form
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;

    vipCard.classList.toggle("active");
});
