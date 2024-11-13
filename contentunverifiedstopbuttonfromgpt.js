function createSearchInterface() {
  // Check if search box already exists
  if (document.querySelector(".custom-search-container")) {
    return;
  }

  const SEARCH_ENGINE_API_URL = "https://search-engine.shuwen.cloud/api";
  // const SEARCH_ENGINE_API_URL = "http://localhost:5009/api";

  // Create search container
  const container = document.createElement("div");
  container.className = "custom-search-container";

  // Create build knowledge button
  const buildButton = document.createElement("button");
  buildButton.className = "build-knowledge-button";
  buildButton.textContent = "Build Knowledge";
  buildButton.style.display = "none"; // Hidden by default until we check status

  // Create stop scraping button
  const stopButton = document.createElement("button");
  stopButton.className = "stop-scraping-button";
  stopButton.textContent = "Stop Scraping";
  stopButton.style.display = "none"; // Hidden by default

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
  let scrapeAbortController = null;

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
        resultsPanel.style.display = "none";
		stopButton.style.display = "none";

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
      resultsPanel.style.display = "none";
	  stopButton.style.display = "block";

      const apiUrl = `${SEARCH_ENGINE_API_URL}/build_index_by_url`;
	  scrapeAbortController = new AbortController();
	  const { signal } = scrapeAbortController;

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

      startStatusPolling();

	  resultsPanel.style.display = "block";
	  resultsPanel.innerHTML =
		'<div class="success-message">Building knowledge base...</div>';
	} catch (error) {
	  if (error.name === 'AbortError') {
		resultsPanel.style.display = "block";
		resultsPanel.innerHTML =
		  '<div class="error-message">Scraping process stopped.</div>';
	  } else {
		resultsPanel.style.display = "block";
		resultsPanel.innerHTML =
		  '<div class="error-message">Failed to build knowledge base. Please try again.</div>';
	  }
	} finally {
	  buildButton.disabled = false;
	  buildButton.textContent = "Build Knowledge";
	}
  }

  async function performSearch() {
    resultsPanel.style.display = "none";

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

  function stopScraping() {
	if (scrapeAbortController) {
	  scrapeAbortController.abort();  // Abort the ongoing scraping process
	  resultsPanel.innerHTML =
		'<div class="error-message">Scraping stopped and data cleared.</div>';
	  stopButton.style.display = "none";  // Hide stop button
	  statusMessage.style.display = "none";
	  buildButton.style.display = "block";  // Allow the user to start building knowledge again
	  searchButton.disabled = true;  // Disable search button while scraping is stopped
	}
  }

  buildButton.addEventListener("click", buildKnowledge);
  searchButton.addEventListener("click", performSearch);
  input.addEventListener("keypress", (e) => {
	if (e.key === "Enter") {
	  performSearch();
	}
  });
  stopButton.addEventListener("click", stopScraping);

  // Close results panel when clicking outside
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target) && !resultsPanel.contains(e.target)) {
      resultsPanel.style.display = "none";
    }
  });

  // Append elements in order
  container.appendChild(buildButton);
  container.appendChild(stopButton);
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