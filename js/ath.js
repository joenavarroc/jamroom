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

      // 🔴 CERRAMOS SESIÓN MANUALMENTE
      await firebase.auth().signOut();

      // ✅ MENSAJE CLARO
      alert("Registro exitoso. Ahora podés iniciar sesión");

      // 👉 volver al login
      window.location.href = "login.html";

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
  if (!claveIngresada) return alert("Ingresá tu clave");

  let encontrado = null;
  let uidAdmin = null;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    // 🔑 buscamos solo en <UID>_VIP
    if (key.endsWith("_VIP")) {
      const lista = JSON.parse(localStorage.getItem(key)) || [];

      const vip = lista.find(v => v.clave === claveIngresada);
      if (vip) {
        encontrado = vip;
        uidAdmin = key.replace("_VIP", "");
        break;
      }
    }
  }

  if (!encontrado) {
    alert("Clave VIP inválida");
    return;
  }

  sessionStorage.setItem("rol", "vip");
  sessionStorage.setItem("vipNombre", encontrado.nombre);
  sessionStorage.setItem("uidAdmin", uidAdmin);

  window.location.href = "index.html";
}

// =====================
// Login Google
// =====================

// GOOGLE/FACEBOOK LOGIN
const googleBtn = document.getElementById("googleLogin");

googleBtn.addEventListener("click", (e) => {
  e.preventDefault(); // CLAVE

  const provider = new firebase.auth.GoogleAuthProvider();

  firebase.auth()
    .signInWithPopup(provider)
    .then((result) => {
      const user = result.user;

      sessionStorage.setItem("rol", "admin");
      console.log("ROL GUARDADO:", localStorage.getItem("rol"));

      alert("Bienvenido " + user.displayName);
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Error Google:", error);
      alert(error.message);
    });
});

const facebookBtn = document.getElementById("facebookLogin");

facebookBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const provider = new firebase.auth.FacebookAuthProvider();

  firebase.auth()
    .signInWithPopup(provider)
    .then((result) => {
      const user = result.user;

      sessionStorage.setItem("rol", "admin"); 
      console.log("ROL GUARDADO:", sessionStorage.getItem("rol"));

      alert("Bienvenido " + (user.displayName || "usuario"));
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Error Facebook:", error);
      alert(error.message);
    });
});
