(() => { 
const loginBtn = document.getElementById("loginButton");
const registerBtn = document.getElementById("registerButton");

// REGISTRO
if (registerBtn) {
  registerBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();

    if (!name || !email || !password) {
      alert("Completa todos los campos");
      return;
    }

    try {
      const userCredential = await firebase.auth()
        .createUserWithEmailAndPassword(email, password);

      const user = userCredential.user;

      await user.updateProfile({ displayName: name });

      await db.collection("usuarios").doc(user.uid).set({
        nombre: name,
        correo: email,
        uid: user.uid,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("Registro exitoso");
      window.location.href = "index.html";

    } catch (error) {
      alert(error.message);
    }
  });
}

// LOGIN
if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
      alert("Completa los campos");
      return;
    }

    try {
      await firebase.auth()
      .signInWithEmailAndPassword(email, password);

    sessionStorage.setItem("rol", "admin"); // 👑
    console.log("ROL GUARDADO:", sessionStorage.getItem("rol"));

    alert("Bienvenido");
    window.location.href = "index.html";


    } catch (error) {
      alert(error.message);
    }
  });
}
})();

// =====================
// Recuperacion de cuenta
// =====================

const forgotPassword = document.getElementById("forgotPassword");

if (forgotPassword) {
  forgotPassword.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
      alert("Ingresá tu email para recuperar la contraseña");
      return;
    }

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      alert("📩 Te enviamos un correo para restablecer tu contraseña");
    } catch (error) {
      alert("Error: " + error.message);
    }
  });
}

function verificarVIP() {
  const claveIngresada = document.getElementById("vipKey").value.trim();
  const listaVIP = JSON.parse(localStorage.getItem("VIP_USERS")) || [];

  console.log("VIP guardados:", listaVIP); // 👈 debug

  const encontrado = listaVIP.find(v => v.clave === claveIngresada);

  if (encontrado) {
    sessionStorage.setItem("rol", "vip"); // 👤
    console.log("ROL GUARDADO:", sessionStorage.getItem("rol"));

    alert("Bienvenido " + encontrado.nombre);
    window.location.href = "index.html";
  }else {
    alert("No sos VIP 😢");
  }
}
