let authInProgress = false;

const esMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

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

async function verificarVIP() {

  const claveIngresada = vipKey.value.trim().toLowerCase();

  if (!claveIngresada) {
    alert("Ingresá tu clave");
    return;
  }

  try {

    // 🔥 leer desde config/vipUsers
    const snap = await db.collection("config")
      .doc("vipUsers")
      .get();

    if (!snap.exists) {
      alert("No hay VIP registrados");
      return;
    }

    const lista = snap.data().usuarios || [];

    // buscar clave
    const vip = lista.find(v =>
      (v.clave || "").toLowerCase() === claveIngresada
    );

    if (!vip) {
      alert("Clave VIP inválida");
      return;
    }

    console.log("VIP encontrado:", vip);

    sessionStorage.setItem("rol", "vip");
    sessionStorage.setItem("vipNombre", vip.nombre);
    sessionStorage.setItem("uidAdmin", vip.uidAdmin);

    window.location.href = "index.html";

  }
  catch (error) {

    console.error(error);
    alert("Error verificando VIP");

  }

}

// =====================
//GOOGLE/FACEBOOK LOGIN
// =====================

// GOOGLE LOGIN
const googleBtn = document.getElementById("googleLogin");

if (googleBtn) {
  googleBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (authInProgress) return;
    authInProgress = true;

    const provider = new firebase.auth.GoogleAuthProvider();

    try {
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;

      sessionStorage.setItem("rol", "admin");

      window.location.href = "index.html";

    } catch (error) {
      console.error("Error Google login:", error);
      alert(error.message);
    } finally {
      authInProgress = false;
    }
  });
}

// FACEBOOK LOGIN
const facebookBtn = document.getElementById("facebookLogin");

if (facebookBtn) {
  facebookBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (authInProgress) return;
    authInProgress = true;

    const provider = new firebase.auth.FacebookAuthProvider();

    try {

      if (esMobile) {
        // 📱 Móvil → Redirect
        await firebase.auth().signInWithRedirect(provider);
      } else {
        // 💻 Desktop → Popup
        await firebase.auth().signInWithPopup(provider);
        sessionStorage.setItem("rol", "admin");
        window.location.href = "index.html";
      }

    } catch (error) {
      console.error("Error Facebook login:", error);
      alert(error.message);
      authInProgress = false;
    }
  });
}

firebase.auth().getRedirectResult()
  .then((result) => {
    if (result.user) {
      sessionStorage.setItem("rol", "admin");
      window.location.href = "index.html";
    }
  })
  .catch((error) => {
    console.error("Redirect error:", error);
  });
