(() => {
    const loginBtn = document.getElementById("loginButton");
    const registerBtn = document.getElementById("registerButton");

    // Registro de usuario
    if (registerBtn) {
        registerBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const name = document.getElementById("registerName").value.trim();
            const email = document.getElementById("registerEmail").value.trim();
            const password = document.getElementById("registerPassword").value.trim();

            if (!name || !email || !password) {
                alert("Por favor, completa todos los campos.");
                return;
            }

            try {
                
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

             
                await user.updateProfile({ displayName: name });

               
                await db.collection("usuarios").doc(user.uid).set({
                    nombre: name,
                    correo: email,
                    uid: user.uid,
                    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert("✅ Registro exitoso. Bienvenido/a, " + name);
                window.location.href = "home.html";
            } catch (error) {
                alert("❌ Error: " + error.message);
            }
        });
    }

    // Inicio de sesión
    if (loginBtn) {
        loginBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value.trim();

            if (!email || !password) {
                alert("Completa todos los campos.");
                return;
            }

            try {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                alert("Inicio de sesión exitoso");
                window.location.href = "home.html";
            } catch (error) {
                alert("Error: " + error.message);
            }
        });
    }
})();