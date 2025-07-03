const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Check authentication status
    const authResponse = await fetch(`${API_BASE_URL}/auth-status`, {
      credentials: 'include'
    });
    const authData = await authResponse.json();

    if (!authData.authenticated) {
      window.location.href = "/applicant/login/login.html";
      return;
    }

    // If authenticated, use the user data from auth response
    if (authData.user) {
      console.log("User data from auth:", authData.user);
      await setupProfilePicUpload();
      loadProfilePicture();
      populateProfile(authData.user);
      setupEventListeners();
    } else {
      showNotification("No user data found. Please log in again.");
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("Failed to load profile data. Please try again.");
  }
});

// Helper function to display errors
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

function populateProfile(userData) {
  if (!userData) {
    console.error("No user data received");
    showNotification("No profile data available");
    return;
  }

  const personalInfo = userData.personalInfo || userData;

  // Update profile name in navigation
  const navProfileName = document.getElementById("nav-profile-name");
  if (navProfileName) {
    const nameParts = [personalInfo.firstname, personalInfo.lastname];
    const displayName = nameParts
      .filter((part) => part && part.trim())
      .join(" ");
    navProfileName.innerText = displayName || "Applicant";
  }

  // Update profile header
  const nameElement = document.getElementById("user-name");
  if (nameElement) {
    const nameParts = [
      personalInfo.firstname,
      personalInfo.middlename,
      personalInfo.lastname,
      personalInfo.suffix,
    ];

    const fullName = nameParts.filter((part) => part && part.trim()).join(" ");

    nameElement.innerText = fullName || "N/A";
  }

  const occupationElement = document.getElementById("user-occupation");
  if (occupationElement) {
    occupationElement.innerText = personalInfo.occupation || "Not specified";
  }

  // Add applicant ID display
  const idElement = document.getElementById("user-id");
  if (idElement) {
    idElement.innerHTML = `<i class="fa-solid fa-id-card"></i> ${userData.applicantId || "Not assigned"}`;
  }

  const emailElement = document.getElementById("user-email");
  if (emailElement) {
    emailElement.innerHTML = `<i class="fa-solid fa-envelope"></i> ${
      personalInfo.emailAddress || userData.email || "N/A"
    }`;
  }

  // Field mappings for profile sections
  const fieldMappings = {
    "first-name": "firstname",
    "middle-name": "middlename",
    "last-name": "lastname",
    suffix: "suffix",
    gender: "gender",
    age: "age",
    occupation: "occupation",
    nationality: "nationality",
    "civil-status": "civilstatus",
    birthday: "birthDate",
    "birth-place": "birthplace",
    phone: "mobileNumber",
    telephone: "telephoneNumber",
    email: "emailAddress",
    country: "country",
    province: "province",
    city: "city",
    street: "street",
    "zip-code": "zipCode",
    "first-priority": "firstPriorityCourse",
    "second-priority": "secondPriorityCourse",
    "third-priority": "thirdPriorityCourse",
  };

  for (const [htmlId, dataKey] of Object.entries(fieldMappings)) {
    const element = document.getElementById(htmlId);
    if (element) {
      // Get the value from personalInfo or root object
      let value = personalInfo[dataKey] || userData[dataKey] || "N/A";

      // Format birthDate if it exists
      if (dataKey === "birthDate" && value && value !== "N/A") {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            value = date.toISOString().split("T")[0]; // YYYY-MM-DD format
          }
        } catch (e) {
          console.warn("Could not format birthDate:", e);
        }
      }

      element.innerText = value;
    }
  }
}

function setupEventListeners() {
  const logoutButton = document.querySelector("#logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();
      logoutUser();
    });
  }

  // Setup dropdown toggles
  const dropdownToggles = document.querySelectorAll(".dropdown-toggle");
  dropdownToggles.forEach((toggle) => {
    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      const parentDropdown = toggle.parentElement;
      parentDropdown.classList.toggle("active");

      // Close other dropdowns
      document.querySelectorAll(".dropdown").forEach((dropdown) => {
        if (dropdown !== parentDropdown) {
          dropdown.classList.remove("active");
        }
      });
    });
  });

  // Close dropdowns if clicked outside
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown").forEach((dropdown) => {
        dropdown.classList.remove("active");
      });
    }
  });

  // Setup edit buttons
  document.querySelectorAll(".edit-button").forEach((button) => {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      toggleSectionEdit(this);
    });
  });

  // Setup profile edit button
  const profileEditButton = document.querySelector(".edit-profile-button");
  if (profileEditButton) {
    profileEditButton.addEventListener("click", function (event) {
      event.preventDefault();
      toggleProfileEdit(this);
    });
  }
}

async function logoutUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      // Clear frontend storage
      sessionStorage.clear();
      localStorage.clear();

      // Redirect to login page
      window.location.href = "../login/login.html";
    } else {
      throw new Error("Logout failed");
    }
  } catch (error) {
    console.error("Logout error:", error);
    showNotification("Failed to logout. Please try again.");
  }
}

function createDropdown(options, currentValue, excludedValues = []) {
  const select = document.createElement("select");
  select.classList.add("edit-input");
  options.forEach((option) => {
    if (!excludedValues.includes(option)) {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.innerText = option;
      if (option === currentValue) {
        optionElement.selected = true;
      }
      select.appendChild(optionElement);
    }
  });
  return select;
}

function getSelectedCourses() {
  return Array.from(document.querySelectorAll(".info-item span select")).map(
    (select) => select.value
  );
}

function initializePhoneInput(input) {
  if (!input) return null;

  const phoneError = document.createElement("span");
  phoneError.style.color = "red";
  phoneError.style.display = "none";
  phoneError.classList.add("phone-error");
  input.parentNode.appendChild(phoneError);

  const itiPhone = intlTelInput(input, {
    separateDialCode: true,
    initialCountry: "auto",
    geoIpLookup: (callback) => {
      fetch("https://ipinfo.io/json?token=YOUR_TOKEN")
        .then((response) => response.json())
        .then((data) => callback(data.country))
        .catch(() => callback(""));
    },
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
  });

  itiPhone.promise.then(() => {
    const dialCode = `+${itiPhone.getSelectedCountryData().dialCode} `;
    input.value = dialCode;
  });

  input.addEventListener("input", function () {
    const dialCode = `+${itiPhone.getSelectedCountryData().dialCode} `;
    if (!input.value.startsWith(dialCode)) {
      input.value = dialCode;
    }

    if (itiPhone.isValidNumber()) {
      phoneError.style.display = "none";
    } else {
      phoneError.innerText = "Invalid phone number.";
      phoneError.style.display = "block";
    }
  });

  return { input, itiPhone, phoneError };
}

async function toggleProfileEdit(button) {
  const profileInfo = document.querySelector(".profile-info");
  const nameField = profileInfo.querySelector("h1");
  const jobTitleField = profileInfo.querySelector(".job-title");
  const locationField = profileInfo.querySelector(".location");
  const profilePic = document.querySelector(".profile-pic");
  const profilePicUpload = document.querySelector(".profile-pic-upload");
  const isEditing = button.classList.contains("edit-mode");

  if (isEditing) {
    try {
      const formData = new FormData();
      formData.append("userId", localStorage.getItem("userId"));

      // Add profile picture if changed
      if (profilePicUpload.files[0]) {
        formData.append("profilePic", profilePicUpload.files[0]);
      }

      // Split the full name into parts
      const fullNameInput = nameField.querySelector("input").value.trim();
      const nameParts = fullNameInput.split(" ");

      // Extract name parts (handle cases with multiple spaces)
      const firstName = nameParts[0] || "";
      const middleName = nameParts[1] || "";
      const lastName = nameParts[2] || "";
      const suffix = nameParts.slice(3).join(" ") || "";

      // Add other profile data
      const updateData = {
        "personalInfo.firstname": firstName,
        "personalInfo.middlename": middleName,
        "personalInfo.lastname": lastName,
        "personalInfo.suffix": suffix,
        "personalInfo.occupation": jobTitleField
          .querySelector("input")
          .value.trim(),
        "personalInfo.emailAddress": locationField
          .querySelector("input")
          .value.trim(),
      };

      formData.append("data", JSON.stringify(updateData));

      // Update profile
      const updatedUser = await updateProfile(formData);

      // Update display with formatted name
      const displayName = [firstName, middleName, lastName, suffix]
        .filter(Boolean)
        .join(" ");

      nameField.innerText = displayName;
      jobTitleField.innerText = updateData["personalInfo.occupation"];
      locationField.innerHTML = `<i class="fa-solid fa-envelope"></i> ${updateData["personalInfo.emailAddress"]}`;

      button.innerHTML = '<i class="fa-solid fa-pen"></i> Edit Profile';
      document
        .querySelector(".profile-pic-container")
        .classList.remove("edit-mode");
    } catch (error) {
      console.error("Failed to update profile:", error);
      showNotification("Failed to update profile", "error");
      return;
    }
  } else {
    // Enter edit mode - show current values
    const currentName = nameField.innerText.trim();
    nameField.innerHTML = `<input type="text" class="edit-input" value="${currentName}">`;
    jobTitleField.innerHTML = `<input type="text" class="edit-input" value="${jobTitleField.innerText.trim()}">`;
    const email = locationField.innerText.replace(/[✉📧]\s*/, "").trim();
    locationField.innerHTML = `<i class="fa-solid fa-envelope"></i> <input type="text" class="edit-input" value="${email}">`;

    button.innerHTML = '<i class="fa-solid fa-save"></i> Save Profile';
    document.querySelector(".profile-pic-container").classList.add("edit-mode");
  }

  button.classList.toggle("edit-mode");
}

function toggleSectionEdit(button) {
  const section = button.closest(".section");
  const infoItems = section.querySelectorAll(".info-item span:last-child");
  const isEditing = button.classList.contains("edit-mode");

  let phoneInputInstance = null;
  let hasError = false;

  if (isEditing) {
    infoItems.forEach((item) => {
      const input = item.querySelector("input, select");
      if (input) {
        const fieldName = item.previousElementSibling.innerText.trim();

        if (
          !input.value.trim() &&
          fieldName !== "Suffix:" &&
          fieldName !== "Telephone:"
        ) {
          input.style.border = "1px solid red";
          hasError = true;
        } else {
          input.style.border = "";
          item.innerText = input.value;
        }

        if (fieldName === "Phone:" && input.type === "tel") {
          const phoneError = item.querySelector(".phone-error");
          if (
            !input.value.trim() ||
            !phoneInputInstance.itiPhone.isValidNumber()
          ) {
            input.style.border = "1px solid red";
            phoneError.innerText = "Please enter a valid phone number.";
            phoneError.style.display = "block";
            hasError = true;
          } else {
            phoneError.style.display = "none";
          }
        }
      }
    });

    if (hasError) {
      showNotification("Please fill in all required fields before saving.");
      return;
    }
  } else {
    infoItems.forEach((item) => {
      const currentValue = item.innerText.trim();
      let inputElement;

      if (item.previousElementSibling.innerText === "Gender:") {
        inputElement = createDropdown(
          ["Male", "Female", "Other"],
          currentValue
        );
      } else if (item.previousElementSibling.innerText === "Civil Status:") {
        inputElement = createDropdown(
          ["Single", "Married", "Divorced", "Widowed"],
          currentValue
        );
      } else if (item.previousElementSibling.innerText.includes("Priority")) {
        const selectedCourses = getSelectedCourses();
        inputElement = createDropdown(
          [
            "BS Information Technology",
            "BS Entrepreneurship",
            "BS Office Administration",
            "BSBA Operations Management",
            "BSBA Marketing Management",
            "BSBA Financial Management",
            "BSBA Human Resource Management",
            "BS Political Science",
            "BS Statistics",
            "BS Biology",
            "BS Astronomy",
          ],
          currentValue,
          selectedCourses
        );

        inputElement.addEventListener("change", () => {
          document.querySelectorAll(".edit-button").forEach((btn) => {
            if (btn.classList.contains("edit-mode")) {
              toggleSectionEdit(btn);
              toggleSectionEdit(btn);
            }
          });
        });
      } else if (item.previousElementSibling.innerText === "Birthday:") {
        inputElement = document.createElement("input");
        inputElement.type = "date";
        inputElement.classList.add("edit-input");
        inputElement.value = currentValue;
      } else if (item.previousElementSibling.innerText === "Phone:") {
        inputElement = document.createElement("input");
        inputElement.type = "tel";
        inputElement.classList.add("edit-input");
        inputElement.id = "phone";
        inputElement.value = currentValue;

        item.innerHTML = "";
        item.appendChild(inputElement);
        phoneInputInstance = initializePhoneInput(inputElement);
        return;
      } else {
        inputElement = document.createElement("input");
        inputElement.type = "text";
        inputElement.classList.add("edit-input");
        inputElement.value = currentValue;
      }
      item.innerHTML = "";
      item.appendChild(inputElement);
    });
  }

  button.innerHTML = isEditing
    ? '<i class="fa-solid fa-pen"></i> Edit'
    : '<i class="fa-solid fa-save"></i> Save';
  button.classList.toggle("edit-mode");
}

async function updateProfile(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to update profile");
    }

    const result = await response.json();
    if (result.success) {
      showNotification("Profile updated successfully", "success");
      return result.user;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Update error:", error);
    showNotification(error.message, "error");
    throw error;
  }
}

async function loadProfilePicture() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile-pic/${userId}`, {
      credentials: 'include'
    });
    if (response.ok) {
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      // Update both profile pictures
      const profilePic = document.querySelector(".profile-pic");
      const navProfilePic = document.getElementById("nav-profile-pic");

      if (profilePic) profilePic.src = imageUrl;
      if (navProfilePic) navProfilePic.src = imageUrl;
    }
  } catch (error) {
    console.error("Error loading profile picture:", error);
  }
}

function setupProfilePicUpload() {
  const profilePicUpload = document.querySelector(".profile-pic-upload");
  const profilePic = document.querySelector(".profile-pic");
  const navProfilePic = document.getElementById("nav-profile-pic");

  if (profilePicUpload) {
    profilePicUpload.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          // Update both profile pictures
          if (profilePic) profilePic.src = e.target.result;
          if (navProfilePic) navProfilePic.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}