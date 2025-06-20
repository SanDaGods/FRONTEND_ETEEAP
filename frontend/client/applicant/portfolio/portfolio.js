document.addEventListener("DOMContentLoaded", async function () {
  const API_BASE_URL = "https://updated-backend-production-ff82.up.railway.app";

  // Initialize the file viewer immediately
  initializeFileViewer();

  try {
    const authResponse = await fetch(${API_BASE_URL}/applicant/auth-status);
    const authData = await authResponse.json();
    const userId = localStorage.getItem("userId");

    if (!userId) {
      showAlert("Session expired. Please login again.", "error");
      setTimeout(() => {
        window.location.href = ${API_BASE_URL}/frontend/client/applicant/login/login.html;
      }, 2000);
      return;
    }

    if (!authData.authenticated) {
      window.location.href = "../login/login.html";
      return;
    }

    if (authData.user) {
      console.log("User data from auth:", authData.user);
      setupEventListeners();
      fetchAndDisplayFiles();
    } else {
      showNotification("No user data found. Please log in again.");
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("Failed to load profile data. Please try again.");
  }

  async function logoutUser() {
    try {
      const response = await fetch(${API_BASE_URL}/applicant/logout, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "../login/login.html";
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Failed to logout. Please try again.", "error");
    }
  }

  async function fetchAndDisplayFiles() {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        showNotification("User session not found. Please login again.", "error");
        setTimeout(() => {
          window.location.href = "../login/login.html";
        }, 2000);
        return;
      }

      const response = await fetch(${API_BASE_URL}/api/fetch-user-files/${userId}, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: Bearer ${localStorage.getItem("token")},
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(HTTP error! status: ${response.status});
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch files");
      }

      const sections = {
        "initial-submission": "Initial Submissions",
        resume: "Updated Resume / CV",
        training: "Certificate of Training",
        awards: "Awards",
        interview: "Interview Form",
        others: "Others",
      };

      Object.entries(sections).forEach(([label, title]) => {
        const section = findSectionByTitle(title);
        if (section) {
          const files = data.files?.[label] || [];
          updateSectionFiles(section, files);
        }
      });
    } catch (error) {
      console.error("Error fetching files:", error);
      showNotification("Failed to load files: " + error.message, "error");
    }
  }

  async function showFile(index) {
    try {
      if (index < 0 || index >= currentFiles.length) return;

      currentFileIndex = index;
      const file = currentFiles[index];

      const prevBtn = document.querySelector(".prev-btn");
      const nextBtn = document.querySelector(".next-btn");

      if (prevBtn) {
        prevBtn.disabled = index === 0;
        prevBtn.style.opacity = index === 0 ? "0.5" : "1";
      }
      if (nextBtn) {
        nextBtn.disabled = index === currentFiles.length - 1;
        nextBtn.style.opacity = index === currentFiles.length - 1 ? "0.5" : "1";
      }

      const currentFileText = document.getElementById("currentFileText");
      const fileName = document.getElementById("fileName");

      if (currentFileText) {
        currentFileText.textContent = File ${index + 1} of ${currentFiles.length};
      }
      if (fileName) {
        fileName.textContent = file.filename;
      }

      const response = await fetch(${API_BASE_URL}/api/fetch-documents/${file._id});
      if (!response.ok) {
        throw new Error(HTTP error! status: ${response.status});
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const fileViewer = document.getElementById("fileViewer");
      const imageViewer = document.getElementById("imageViewer");

      if (fileViewer) {
        fileViewer.style.display = "none";
        fileViewer.src = "";
      }
      if (imageViewer) {
        imageViewer.style.display = "none";
        imageViewer.src = "";
      }

      if (file.contentType.startsWith("image/")) {
        if (imageViewer) {
          imageViewer.src = url;
          imageViewer.style.display = "block";
        }
      } else if (file.contentType === "application/pdf") {
        if (fileViewer) {
          fileViewer.src = url;
          fileViewer.style.display = "block";
        }
      } else {
        showNotification("File type not supported for preview", "info");
      }
    } catch (error) {
      console.error("Error displaying file:", error);
      showNotification("Error loading file: " + error.message, "error");
    }
  }

  async function uploadFiles(files, label, section) {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        showNotification("Please log in to upload files", "error");
        return;
      }

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("label", label);

      files.forEach((file) => {
        formData.append("files", file);
      });

      const uploadBtn = section.querySelector(".upload-btn");
      uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
      uploadBtn.disabled = true;

      const response = await fetch(${API_BASE_URL}/api/submit-documents, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(Upload failed: ${response.statusText});
      }

      const result = await response.json();

      if (result.success) {
        showNotification("Files uploaded successfully", "success");
        await fetchAndDisplayFiles();
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showNotification(error.message, "error");
    } finally {
      const uploadBtn = section.querySelector(".upload-btn");
      uploadBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
      uploadBtn.disabled = false;
    }
  }

  // Dropdown toggles (messages, notifications, profile)
  const dropdownToggles = document.querySelectorAll(".dropdown-toggle");

  dropdownToggles.forEach((toggle) => {
    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      const parentDropdown = toggle.parentElement;
      parentDropdown.classList.toggle("active");

      // Close others
      document.querySelectorAll(".dropdown").forEach((dropdown) => {
        if (dropdown !== parentDropdown) {
          dropdown.classList.remove("active");
        }
      });
    });
  });

  // Close dropdowns on outside click
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown").forEach((dropdown) => {
        dropdown.classList.remove("active");
      });
    }
  });

  // Logout handler
  const logoutButton = document.querySelector("#logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();
      logoutUser();
    });
  }
});
