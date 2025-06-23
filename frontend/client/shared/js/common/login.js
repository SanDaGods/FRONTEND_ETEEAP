async function handleLogin(event, role) {
    event.preventDefault();

    const email = document.getElementById(`${role}-email`).value;
    const password = document.getElementById(`${role}-password`).value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            alert("Login successful!");

            // Redirect based on role
            if (data.role === "admin") {
                window.location.href = "/frontend/admin/dashboard/dashboard.html";
            } else {
                window.location.href = "/frontend/applicant/dashboard/dashboard.html";
            }
        } else {
            alert(data.error || "Login failed!");
        }
    } catch (error) {
        alert("An error occurred. Please try again later.");
    }
}
