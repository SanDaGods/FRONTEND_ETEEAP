document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

    const wrapper = document.querySelector('.wrapper');
    const loginContainer = document.querySelector('.form-box.login');
    const roleTabs = document.querySelectorAll('.role-tab');
    const loginForms = document.querySelectorAll('.login-form');

    function initForms() {
        loginForms.forEach(form => form.classList.remove('active'));
        document.querySelector('.login-form[data-role="applicant"]').classList.add('active');
        roleTabs.forEach(tab => tab.classList.remove('active'));
        document.querySelector('.role-tab[data-role="applicant"]').classList.add('active');
        document.querySelector('.register').style.display = 'none';
        document.querySelector('.forgot').style.display = 'none';
        document.getElementById('verificationForm').style.display = 'none';
        document.getElementById('newPasswordForm').style.display = 'none';
        wrapper.classList.remove('active', 'active-forgot', 'active-verification', 'active-new-password');
    }

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
        initForms();
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
            window.location.href = "/frontend/client/applicant/info/information.html";
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
                window.location.href = "/frontend/client/applicant/timeline/timeline.html";
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

// Add this with your other form selectors at the top
const adminLoginForm = document.getElementById("adminLoginForm");

// Enhanced admin login handler with notifications and debugging
adminLoginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    if (!email || !password) {
        showNotification("Email and password are required", "error");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include"
        });

        const data = await response.json();

        if (response.ok) {
            showNotification("Admin login successful! Redirecting...", "success");
            
            // Store admin data
            if (data.data) {
                localStorage.setItem("adminEmail", data.data.email);
                localStorage.setItem("adminName", data.data.fullName);
            }
            
            // Use the path that matches your deployment structure
            const dashboardPath = "/frontend/client/admin/dashboard/dashboard.html";
            
            setTimeout(() => {
                window.location.href = data.redirectTo || dashboardPath;
            }, 1500);
        } else {
            throw new Error(data.error || "Admin login failed");
        }
    } catch (error) {
        let userErrorMessage = "Admin login failed";
        if (error.message.includes("credentials")) {
            userErrorMessage = "Invalid email or password";
        } else if (error.message.includes("network")) {
            userErrorMessage = "Network error - please try again";
        }
        showNotification(userErrorMessage, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
});

// Add this CSS for error highlighting
const style = document.createElement('style');
style.textContent = `
    .error {
        border-color: #ff4444 !important;
        background-color: #ffebee !important;
    }
    .error-message {
        color: #ff4444;
        margin-top: 10px;
        font-size: 14px;
        text-align: center;
    }
`;
document.head.appendChild(style);


document.getElementById("assessorLoginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("assessorEmail").value.trim();
    const password = document.getElementById("assessorPassword").value;
    
    if (!email || !password) {
        showNotification("Email and password are required", "error");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
        console.log("Sending assessor login request to:", `${API_BASE_URL}/assessor/login`);
        const response = await fetch(`${API_BASE_URL}/assessor/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include"
        });

        const data = await response.json();
        console.log("Assessor login response:", data);

        if (response.ok) {
            showNotification("Assessor login successful! Redirecting...", "success");
            
            // Store assessor data
            if (data.data) {
                sessionStorage.setItem("assessorData", JSON.stringify({
                    assessorId: data.data.assessorId,
                    email: data.data.email,
                    fullName: data.data.fullName,
                    expertise: data.data.expertise
                }));
                console.log("Assessor data stored in sessionStorage");
            }
            
            // Use the path that matches your deployment structure
            const dashboardPath = "/frontend/client/assessor/dashboard/dashboard.html";
            
            setTimeout(() => {
                console.log("Redirecting to:", data.redirectTo || dashboardPath);
                window.location.href = data.redirectTo || dashboardPath;
            }, 1500);
        } else {
            throw new Error(data.error || "Assessor login failed");
        }
    } catch (error) {
        console.error("Assessor login error:", error);
        
        let userErrorMessage = "Assessor login failed";
        if (error.message.includes("credentials")) {
            userErrorMessage = "Invalid email or password";
        } else if (error.message.includes("network")) {
            userErrorMessage = "Network error - please try again";
        }
        
        showNotification(userErrorMessage, "error");
        
        // Highlight problematic fields
        document.getElementById("assessorEmail").classList.toggle("error", error.message.includes("email"));
        document.getElementById("assessorPassword").classList.toggle("error", error.message.includes("password"));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
});

});

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
      const mobileMenuBtn = document.getElementById('mobileMenuBtn');
      const mobileNav = document.getElementById('mobileNav');
      
      mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('open');
        mobileNav.classList.toggle('active');
      });
      
      // Close mobile menu when clicking on a link
      const mobileLinks = mobileNav.querySelectorAll('a');
      mobileLinks.forEach(link => {
        link.addEventListener('click', function() {
          mobileMenuBtn.classList.remove('open');
          mobileNav.classList.remove('active');
        });
      });
      
      // Handle mobile login button click
      const mobileLoginBtn = document.querySelector('.mobile-login-btn');
      if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener('click', function() {
          // Trigger the same action as desktop login button
          document.querySelector('.btnLogin-popup').click();
          mobileMenuBtn.classList.remove('open');
          mobileNav.classList.remove('active');
        });
      }
    });