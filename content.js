function createSearchInterface() {
  // Check if search box already exists
  if (document.querySelector(".custom-search-container")) {
    return;
  }

  const SEARCH_ENGINE_API_URL = "http://localhost:5009/api";

  // Create search container
  const container = document.createElement("div");
  container.className = "custom-search-container";

  // Create build knowledge button
  const buildButton = document.createElement("button");
  buildButton.className = "build-knowledge-button";
  buildButton.textContent = "Build Knowledge";
  buildButton.style.display = "none"; // Hidden by default until we check status

  // Create status message div
  const statusMessage = document.createElement("div");
  statusMessage.className = "status-message";
  statusMessage.style.display = "none";

  // Create search input
  const input = document.createElement("input");
  input.type = "text";
  input.className = "custom-search-input";
  input.placeholder = "Search...";

  // Create search button
  const searchButton = document.createElement("button");
  searchButton.className = "custom-search-button";
  searchButton.textContent = "Search";

  // Create results panel
  const resultsPanel = document.createElement("div");
  resultsPanel.className = "results-panel";

  let statusCheckInterval;

  async function checkBuildStatus() {
    try {
      const apiUrl = `${SEARCH_ENGINE_API_URL}/text_index_status_by_url`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Status check failed");
      }

      const statusData = await response.json();
      console.log(statusData, location.href);

      if (statusData?.status === "completed") {
        buildButton.style.display = "none";
        searchButton.disabled = false;
        statusMessage.style.display = "block";
        statusMessage.textContent = "Knowledge base ready - start your search!";
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
        }
      } else {
        buildButton.style.display = "block";
        searchButton.disabled = true;
        statusMessage.style.display = "none";
      }
    } catch (error) {
      console.error("Error checking build status:", error);
      buildButton.style.display = "block";
      searchButton.disabled = true;
      statusMessage.style.display = "none";
    }
  }

  function startStatusPolling() {
    // Clear any existing interval
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    // Check immediately and then every 5 seconds
    checkBuildStatus();
    statusCheckInterval = setInterval(checkBuildStatus, 5000);
  }

  async function buildKnowledge() {
    try {
      buildButton.disabled = true;
      buildButton.textContent = "Building...";

      const apiUrl = `${SEARCH_ENGINE_API_URL}/build_index_by_url`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Build knowledge failed");
      }

      const buildData = await response.json();

      // Start polling for status
      startStatusPolling();

      // Show success message
      resultsPanel.style.display = "block";
      resultsPanel.innerHTML =
        '<div class="success-message">Building knowledge base...</div>';
    } catch (error) {
      resultsPanel.style.display = "block";
      resultsPanel.innerHTML =
        '<div class="error-message">Failed to build knowledge base. Please try again.</div>';
    } finally {
      buildButton.disabled = false;
      buildButton.textContent = "Build Knowledge";
    }
  }

  async function performSearch() {
    const searchTerm = input.value;
    if (!searchTerm) {
      resultsPanel.style.display = "block";
      resultsPanel.innerHTML =
        '<div class="error-message">Please enter a search term</div>';
      return;
    }

    // Show loading state
    resultsPanel.style.display = "block";
    resultsPanel.innerHTML = '<div class="loading">Searching...</div>';

    try {
      const apiUrl = `${SEARCH_ENGINE_API_URL}/search_url`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: location.href,
          query: searchTerm,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      displayResults(data?.results);
    } catch (error) {
      resultsPanel.innerHTML =
        '<div class="error-message">Error: Could not complete the search. Please try again.</div>';
    }
  }

  function displayResults(data) {
    // Clear previous results
    resultsPanel.innerHTML = "";

    // Check if there are results
    if (!data || !data.length) {
      resultsPanel.innerHTML =
        '<div class="error-message">No results found</div>';
      return;
    }

    // Display each result
    data.forEach((result) => {
      const resultItem = document.createElement("div");
      resultItem.className = "result-item";

      resultItem.innerHTML = `
            <div class="title"><strong>${
              result.filename || "No title"
            }</strong></div>
            <div class="url">
              <a href="${
                result.url || "#"
              }" target="_blank" rel="noopener noreferrer">
                ${result.url || "No url"}
              </a>
            </div>
            <div class="content">
              ${((result.content || "No description").match(/\S+/g) || [])
                .slice(0, 50)
                .join(" ")}
            </div>
          `;

      resultItem.style.cursor = "pointer";
      resultItem.addEventListener("click", () => {
        if (result.url) {
          window.open(result.url, "_blank");
        }
      });

      resultsPanel.appendChild(resultItem);
    });
  }

  // Add event listeners
  buildButton.addEventListener("click", buildKnowledge);
  searchButton.addEventListener("click", performSearch);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  // Close results panel when clicking outside
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target) && !resultsPanel.contains(e.target)) {
      resultsPanel.style.display = "none";
    }
  });

  // Append elements in order
  container.appendChild(buildButton);
  container.appendChild(statusMessage);
  container.appendChild(input);
  container.appendChild(searchButton);
  document.body.appendChild(container);
  document.body.appendChild(resultsPanel);

  // Start status polling immediately
  startStatusPolling();
}

// Initialize on page load
createSearchInterface();

// Support for single-page applications
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    createSearchInterface();
  }
}).observe(document, { subtree: true, childList: true });
