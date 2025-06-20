document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  registerForm.appendChild(errorMessage);

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('full-name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Clear previous errors
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';

    // Client-side validation
    if (!fullName || !email || !password || !confirmPassword) {
      showError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords don't match");
      return;
    }

    if (password.length < 8 || password.length > 16) {
      showError("Password must be 8-16 characters");
      return;
    }

    try {
      const response = await fetch('/admin/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          fullName,
          email, 
          password
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Always redirect to login page after successful registration
      showSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => {
        window.location.href = '/frontend/admin/1.adminLogin/adminlogin.html';
      }, 1500);

    } catch (error) {
      showError(error.message);
    }
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.color = 'red';
  }

  function showSuccess(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.color = 'green';
  }
});