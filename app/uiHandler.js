/**
 * Set up event listeners for table cells
 * @param {HTMLElement} aiCell - AI cell element
 * @param {HTMLElement} sourceCell - Source cell element
 * @param {Array} explanations - Array of explanations
 */
function setupCellEventListeners(aiCell, sourceCell, explanations) {
    let highlightedSource = null;
    
    // Add click event listener to highlighted elements in AI cell
    aiCell.addEventListener("click", function(event) {
        const container = event.target.closest(".highlight-text-container");
        if (container) {
            const highlightText = container.querySelector(".highlight-text");
            const index = parseInt(highlightText.getAttribute("data-index"));
            const explanation = explanations[index];
            
            // Show explanation popup
            if (explanation) {
                showExplanationPopup(explanation);
            }
            
            // Highlight corresponding source text
            const sourceHighlight = sourceCell.querySelector(`[data-index="${index}"]`);
            if (sourceHighlight) {
                sourceHighlight.classList.add("highlight-text");
                sourceHighlight.classList.remove("semi-highlight-text");
                highlightedSource = sourceHighlight;
                console.log("highlighted source:", highlightedSource);
            } else {
                console.warn("Source highlight not found for index:", index);
            }

            highlightedSource = sourceHighlight;  // Store the highlighted source
        }
    });
    
    // Add mouseover event listener
    aiCell.addEventListener("mouseover", function(event) {
        const container = event.target.closest(".highlight-text-container");
        if (container) {
            const highlightText = container.querySelector(".highlight-text");
            const index = parseInt(highlightText.getAttribute("data-index"));
            const explanation = explanations[index];
            
            // Show tooltip
            if (explanation) {
                highlightText.setAttribute("title", explanation);
            }
            
            // Highlight source
            const sourceHighlight = sourceCell.querySelector(`.semi-highlight-text[data-index="${index}"]`);
            if (sourceHighlight) {
                sourceHighlight.classList.remove("semi-highlight-text");
                sourceHighlight.classList.add("highlight-text");
            }
        }
    });
    
    // Add mouseout event listener
    aiCell.addEventListener("mouseout", function(event) {
        const container = event.target.closest(".highlight-text-container");
        if (container) {
            const highlightText = container.querySelector(".highlight-text");
            const index = parseInt(highlightText.getAttribute("data-index"));
            
            // Reset source highlighting
            const sourceHighlight = sourceCell.querySelector(`.highlight-text[data-index="${index}"]`);
            if (sourceHighlight && sourceHighlight !== highlightedSource) {
                sourceHighlight.classList.remove("highlight-text");
                sourceHighlight.classList.add("semi-highlight-text");
            }
        }
    });

    return highlightedSource;
}

/**
 * Show explanation popup
 * @param {string} explanation - Explanation text
 * @param {HTMLElement} highlightedSource - Highlighted source element
 */
function showExplanationPopup(explanation) {
    let highlightedSource = null;
    
    // Create popup element if it doesn't exist
    let popup = document.getElementById("explanationPopup");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "explanationPopup";

        const isDarkMode = document.body.classList.contains("bg-dark");
        if (isDarkMode) {
            popup.className = "dark-mode";
        }

        // Add close button
        const closeButton = document.createElement("button");
        closeButton.className = "close-button";
        closeButton.onclick = function() {
            popup.style.display = "none";
            if (highlightedSource) {
                highlightedSource.classList.remove("highlight-text");
                highlightedSource.classList.add("semi-highlight-text");
                highlightedSource = null;  // Clear the highlighted source
            }
        };
        popup.appendChild(closeButton);
        document.body.appendChild(popup);
    }
    
    // Get the width of the third column
    const thirdColumn = document.querySelector("#comparisonTableBody tr td:nth-child(3)");
    if (thirdColumn) {
        const columnWidth = thirdColumn.offsetWidth;
        popup.style.width = columnWidth + "px";
        popup.style.maxWidth = columnWidth + "px";
    }
    
    // Clear previous content
    while (popup.childNodes.length > 1) {
        popup.removeChild(popup.lastChild);
    }
    
    // Create title element
    const titleElement = document.createElement("h3");
    titleElement.textContent = "Explanation";
    titleElement.className = "explanation-title";
    popup.appendChild(titleElement);
    
    // Create content div with the explanation
    const contentDiv = document.createElement("div");
    contentDiv.textContent = explanation;
    contentDiv.className = "explanation-content";
    popup.appendChild(contentDiv);
    
    // Show popup
    popup.style.display = "block";
    
    return highlightedSource;
}

/**
 * Update theme icon based on dark mode setting
 * @param {boolean} isDarkMode - Dark mode state
 */
function updateIcon(isDarkMode) {
    const themeIcon = document.getElementById("themeIcon");
    
    if (isDarkMode) {
        // Dark mode is on - show moon icon
        themeIcon.className = "bi bi-moon-stars-fill";

        // Set dark mode styles
        document.body.classList.add("bg-dark");
        document.getElementById("comparisonTable").classList.add("table-dark");
        document.getElementById("aiCount").classList.add("dark-mode");
        document.getElementById("manualCount").classList.add("dark-mode");
        if (document.getElementById("explanationPopup")) {
            document.getElementById("explanationPopup").className = "dark-mode";
        }
    } else {
        // Dark mode is off - show sun icon
        themeIcon.className = "bi bi-sun-fill";

        // Remove dark mode styles
        document.body.classList.remove("bg-dark");
        document.getElementById("comparisonTable").classList.remove("table-dark");
        document.getElementById("aiCount").classList.remove("dark-mode");
        document.getElementById("manualCount").classList.remove("dark-mode");
        if (document.getElementById("explanationPopup")) {
            document.getElementById("explanationPopup").classList.remove("dark-mode");
        }
    }
}

/**
 * Show loading screen
 */
function showLoading() {
    console.log("showing loading");
    document.getElementById('loadingScreen').classList.add('active');
}

/**
 * Hide loading screen
 */
function hideLoading() {
    console.log("hiding loading");
    document.getElementById('loadingScreen').classList.remove('active');
}

module.exports = {
    setupCellEventListeners,
    showExplanationPopup,
    updateIcon,
    showLoading,
    hideLoading
};