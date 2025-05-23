document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // --- Filter and search UI ---
  // Insert toolbar above activities list
  const activitiesContainer = document.getElementById("activities-container");
  const filtersToolbar = document.createElement("div");
  filtersToolbar.id = "filters-toolbar";
  filtersToolbar.innerHTML = `
    <label for="filter-category">Category:</label>
    <select id="filter-category">
      <option value="">All</option>
    </select>
    <label for="filter-sort">Sort by:</label>
    <select id="filter-sort">
      <option value="name">Name</option>
      <option value="time">Time</option>
    </select>
    <label for="filter-search">Search:</label>
    <input type="text" id="filter-search" placeholder="Search activities..." />
  `;
  activitiesContainer.insertBefore(filtersToolbar, activitiesContainer.children[1]);

  // State for filters
  let allActivities = {};
  let filteredActivities = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      applyFiltersAndRender();
      populateCategoryFilter();
      populateActivitySelect();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function populateCategoryFilter() {
    const categorySet = new Set();
    Object.values(allActivities).forEach((details) => {
      if (details.category) categorySet.add(details.category);
    });
    const filterCategory = document.getElementById("filter-category");
    // Remove old options except 'All'
    filterCategory.innerHTML = '<option value="">All</option>';
    categorySet.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      filterCategory.appendChild(opt);
    });
  }

  function applyFiltersAndRender() {
    const category = document.getElementById("filter-category").value;
    const sort = document.getElementById("filter-sort").value;
    const search = document.getElementById("filter-search").value.trim().toLowerCase();
    let activitiesArr = Object.entries(allActivities);
    if (category) {
      activitiesArr = activitiesArr.filter(([, d]) => d.category === category);
    }
    if (search) {
      activitiesArr = activitiesArr.filter(([name, d]) =>
        name.toLowerCase().includes(search) ||
        (d.description && d.description.toLowerCase().includes(search))
      );
    }
    if (sort === "name") {
      activitiesArr.sort(([a], [b]) => a.localeCompare(b));
    } else if (sort === "time") {
      activitiesArr.sort(([, a], [, b]) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      });
    }
    filteredActivities = Object.fromEntries(activitiesArr);
    renderActivities();
  }

  function renderActivities() {
    activitiesList.innerHTML = "";
    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = "<p>No activities found.</p>";
      return;
    }
    Object.entries(filteredActivities).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft =
        details.max_participants - details.participants.length;

      // Create participants HTML with delete icons instead of bullet points
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
            <h5>Participants:</h5>
            <ul class="participants-list">
              ${details.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);

      // Add option to select dropdown
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Add event listeners for filters
  document.getElementById("filter-category").addEventListener("change", applyFiltersAndRender);
  document.getElementById("filter-sort").addEventListener("change", applyFiltersAndRender);
  document.getElementById("filter-search").addEventListener("input", applyFiltersAndRender);

  // Initialize app
  fetchActivities();
});
