document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

    const wrapper = document.querySelector('.wrapper');
    const loginContainer = document.querySelector('.form-box.login');
    const roleTabs = document.querySelectorAll('.role-tab');
    const loginForms = document.querySelectorAll('.login-form');

    // Modified initForms without default tab selection
function initForms(keepCurrentTab = false) {
    // Don't reset tabs if we want to keep current
    if (!keepCurrentTab) {
        // If no tab is active, set first one as active
        if (!document.querySelector('.role-tab.active')) {
            document.querySelector('.role-tab').classList.add('active');
            document.querySelector('.login-form').classList.add('active');
        }
    }
    
    // Rest of your initForms code...
    document.querySelector('.register').style.display = 'none';
    document.querySelector('.forgot').style.display = 'none';
    document.getElementById('verificationForm').style.display = 'none';
    document.getElementById('newPasswordForm').style.display = 'none';
    wrapper.classList.remove('active', 'active-forgot', 'active-verification', 'active-new-password');
}

    // Initialize forms
    initForms();

    roleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const role = tab.dataset.role;
            roleTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loginForms.forEach(form => form.classList.remove('active'));
            document.querySelector(`.login-form[data-role="${role}"]`).classList.add('active');
        });
    });

    document.querySelector('.btnLogin-popup')?.addEventListener('click', (e) => {
        e.preventDefault();
        initForms();
        wrapper.scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelectorAll(".toggle-password").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const input = toggle.parentElement.querySelector("input");
            const icon = toggle.querySelector("ion-icon");
            input.type = input.type === "password" ? "text" : "password";
            icon.setAttribute("name", input.type === "text" ? "eye" : "eye-off");
        });
    });

    document.getElementById("terms-link")?.addEventListener("click", function (event) {
        event.preventDefault();
        document.getElementById("terms-con").style.display = "block";
    });

    document.getElementById("accept-btn")?.addEventListener("click", function () {
        document.getElementById("terms-con").style.display = "none";
        document.getElementById("terms-checkbox").checked = true;
    });

    document.querySelector(".register-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll('.form-box').forEach(form => form.style.display = 'none');
        document.querySelector('.register').style.display = 'block';
        wrapper.classList.add('active');
    });

    document.querySelector(".login-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll('.form-box').forEach(form => form.style.display = 'none');
        loginContainer.style.display = 'block';
        initForms(true); // Keep current tab active
        wrapper.classList.remove('active');
    });

    document.querySelector(".forgot-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll('.form-box').forEach(form => form.style.display = 'none');
        document.querySelector('.forgot').style.display = 'block';
        wrapper.classList.add('active-forgot');
    });

    const resetInputs = () => {
        document.querySelectorAll("input").forEach((input) => {
            input.type === "checkbox" ? input.checked = false : input.value = "";
        });
    };

    const showNotification = (message, type = "info") => {
        const notification = document.getElementById("notification");
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = "block";
        setTimeout(() => {
            notification.style.opacity = "0";
            setTimeout(() => {
                notification.style.display = "none";
                notification.style.opacity = "1";
            }, 500);
        }, 3000);
    };

    document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("regEmail").value.trim().toLowerCase();
        const password = document.getElementById("regPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        if (!email || !password || !confirmPassword) return showNotification("Please fill in all fields", "error");
        if (!email.includes("@") || !email.includes(".")) return showNotification("Please enter a valid email address", "error");
        if (password !== confirmPassword) return showNotification("Passwords do not match!", "error");
        if (password.length < 8) return showNotification("Password must be at least 8 characters", "error");
        if (!document.getElementById("terms-checkbox").checked) return showNotification("You must accept the terms and conditions", "error");

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Registering...";

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.details || data.error || "Registration failed");
            showNotification("Registration successful! Please fill out your personal information.", "success");
            localStorage.setItem("userId", data.data.userId);
            localStorage.setItem("applicantId", data.data.applicantId);
            window.location.href = "https://frontendeteeap-production.up.railway.app/frontend/client/applicant/info/information.html";
        } catch (error) {
            showNotification(`Registration failed: ${error.message}`, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });

    document.getElementById("applicantLoginForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("applicantEmail").value.trim().toLowerCase();
        const password = document.getElementById("applicantPassword").value;
        if (!email || !password) return showNotification("Please enter both email and password", "error");
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Logging in...";

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "include"
            });
            const data = await response.json();
            if (response.ok) {
                showNotification("Login successful!", "success");
                localStorage.setItem("userId", data.data.userId);
                localStorage.setItem("userEmail", data.data.email);
                window.location.href = "https://frontendeteeap-production.up.railway.app/frontend/client/applicant/timeline/timeline.html";
            } else {
                throw new Error(data.error || "Login failed");
            }
        } catch (error) {
            showNotification(`Login failed: ${error.message}`, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });

    // Admin Login with persistent tab and enhanced logging
document.getElementById("adminLoginForm")?.addEventListener("submit", async function(e) {
    e.preventDefault(); // Must be first
    e.stopPropagation(); // Add this
    console.log("Admin login submitted"); // Debug

        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPassword").value;
        const rememberMe = document.getElementById("rememberMe").checked;
        const errorElement = document.getElementById("admin-error-message");

        errorElement.style.display = "none";

        if (!email || !password) {
            const errorMsg = "Email and password are required";
            console.error('Validation Error:', errorMsg);
            showNotification(errorMsg, "error");
            errorElement.textContent = errorMsg;
            errorElement.style.display = "block";
            console.groupEnd();
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Logging in...";

        try {
            console.log('Sending request to:', `${API_BASE_URL}/api/admin/login`);
            const startTime = performance.now();
            
            const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "include"
            });

            const responseTime = performance.now() - startTime;
            console.log(`Response received in ${responseTime.toFixed(2)}ms`);
            console.log('HTTP Status:', response.status);

            const data = await response.json();
            console.log('Response Data:', data);

            if (!response.ok) {
                throw new Error(data.error || data.message || "Login failed");
            }

            // On success
            sessionStorage.setItem("adminData", JSON.stringify({
                adminId: data.data.adminId,
                email: data.data.email
            }));
            
            if (rememberMe) {
                localStorage.setItem("adminEmail", email);
            } else {
                localStorage.removeItem("adminEmail");
            }

            showNotification("Admin login successful! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "https://frontendeteeap-production.up.railway.app/frontend/client/admin/dashboard/dashboard.html";
            }, 1000);

        } catch (error) {
            console.error('Login Error:', error);
            showNotification(`Admin login failed: ${error.message}`, "error");
            errorElement.textContent = error.message;
            errorElement.style.display = "block";
            
            // Keep admin tab active
            document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.role-tab[data-role="admin"]').classList.add('active');
            document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
            document.querySelector('.login-form[data-role="admin"]').classList.add('active');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            console.groupEnd();
        }
    });

    // Assessor Login with persistent tab and enhanced logging
document.getElementById("assessorLoginForm")?.addEventListener("submit", async function(e) {
    e.preventDefault(); // Must be first
    e.stopPropagation(); // Add this
    console.log("Assessor login submitted"); // Debug

        const email = document.getElementById("assessorEmail").value.trim();
        const password = document.getElementById("assessorPassword").value;
        const errorElement = document.getElementById("assessor-error-message");

        errorElement.style.display = "none";

        if (!email || !password) {
            const errorMsg = "Email and password are required";
            console.error('Validation Error:', errorMsg);
            showNotification(errorMsg, "error");
            errorElement.textContent = errorMsg;
            errorElement.style.display = "block";
            console.groupEnd();
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Logging in...";

        try {
            console.log('Sending request to:', `${API_BASE_URL}/api/assessor/login`);
            const startTime = performance.now();
            
            const response = await fetch(`${API_BASE_URL}/api/assessor/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "include"
            });

            const responseTime = performance.now() - startTime;
            console.log(`Response received in ${responseTime.toFixed(2)}ms`);
            console.log('HTTP Status:', response.status);

            const data = await response.json();
            console.log('Response Data:', data);

            if (!response.ok) {
                throw new Error(data.error || data.message || "Login failed");
            }

            // On success
            sessionStorage.setItem("assessorData", JSON.stringify({
                assessorId: data.data.assessorId,
                email: data.data.email,
                fullName: data.data.fullName
            }));

            showNotification("Assessor login successful! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "https://frontendeteeap-production.up.railway.app/frontend/client/assessor/dashboard/dashboard.html";
            }, 1000);

        } catch (error) {
            console.error('Login Error:', error);
            showNotification(`Assessor login failed: ${error.message}`, "error");
            errorElement.textContent = error.message;
            errorElement.style.display = "block";
            
            // Keep assessor tab active
            document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.role-tab[data-role="assessor"]').classList.add('active');
            document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
            document.querySelector('.login-form[data-role="assessor"]').classList.add('active');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            console.groupEnd();
        }
    });

    // Check if admin email is remembered
    const savedAdminEmail = localStorage.getItem("adminEmail");
    if (savedAdminEmail) {
        document.getElementById("adminEmail").value = savedAdminEmail;
        document.getElementById("rememberMe").checked = true;
    }
});