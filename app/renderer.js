const translators = ["behn", "knight", "glanvill"];

const tags = {
    "IIM": "Indirect Manipulation",
    "LS": "Language Simplification",
    "NCE": "Domestication",
    "RW": "Explicitation",
    "SC": "Self-Censorship",
    "UP": "Added Text"
}

// renderer.js - Main application code
document.addEventListener("DOMContentLoaded", function () {
    showLoading();

    // window.electron.updateSaveButton(translators, tags);
  
    let translator = "knight";
    let tag = "IIM";
    
    // Get the navbar and content wrapper elements
    const navbar = document.querySelector(".navbar");
    const contentWrapper = document.querySelector(".content-wrapper");
  
    // Add event listeners to tag dropdown items
    document.querySelectorAll(".tag-item").forEach(item => {
      item.addEventListener("click", function(e) {
        const tagSelected = this.textContent.split(" -")[0];
  
        // Update the displayed tag in the dropdown
        document.getElementById("selectedTag").textContent = tagSelected;
  
        let same = false;
        if (tagSelected === tag) {
          same = true;
        }
        if (same) {
          return;
        }
        
        // Store the selected tag in the variable
        tag = tagSelected;
  
        showLoading();

        closeExplanationPopup();
  
        // load data for the selected tag
        // setTimeout(() => {
          loadData();
        // }, 0);
  
        // Prevent default anchor behavior
        e.preventDefault();
      });
    });
  
    document.querySelectorAll(".translator-item").forEach(item => {
      item.addEventListener("click", function(e) {
        const translatorSelected = this.textContent.replace(/\s*\(\d+\)$/, '').toLowerCase();
  
        // Update the displayed translator in the dropdown
        document.getElementById("selectedTranslator").textContent = this.textContent;
        
        // Store the selected translator in the variable
        let same = false;
        if (translatorSelected === translator.toLowerCase()) {
          same = true;
        }
  
        if (same) {
          return;
        }
  
        translator = translatorSelected;
  
        // load data for the selected translator
        showLoading();

        closeExplanationPopup();
  
        // setTimeout(() => {
          loadData();
        // }, 0);
  
        // Prevent default anchor behavior
        e.preventDefault();
      });
    });

    // Add event listener to save button
    document.getElementById("saveButton").addEventListener("click", function() {      
      window.electron.openDialog({
        title: "Select Save Location",
        buttonLabel: "Select",
        properties: ["openDirectory"]
      }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
          const selectedDirectory = result.filePaths[0];
          console.log('Selected save location:', selectedDirectory);
          //
          window.electron.saveFiles(selectedDirectory);
        }
      }
      ).catch(err => {
        console.error("Error selecting save location:", err);
      });
    });
  
    // dark mode toggle
    const toggle = document.getElementById("darkModeToggle");
    
    // set light mode by default
    darkMode = false;
    toggle.checked = false;

    // Set initial icon based on toggle state
    updateTheme(toggle.checked);
    
    // Add event listener to toggle
    toggle.addEventListener("change", function() {
        darkMode = this.checked;
        updateTheme(this.checked);
    });

    // Listen for scroll events on the content wrapper instead of window
    contentWrapper.addEventListener("scroll", function() {
        if (contentWrapper.scrollTop > 0) {
        // User has scrolled down, add shadow
        navbar.classList.add("navbar-shadow");
        } else {
        // User is at the top, remove shadow
        navbar.classList.remove("navbar-shadow");
        }
    });

    // Initial check in case page is loaded scrolled down
    if (contentWrapper.scrollTop > 0) {
        navbar.classList.add("navbar-shadow");
    }

    // Close popup when clicking outside of it
    document.addEventListener('click', function(event) {
        const popup = document.getElementById('explanationPopup');
        
        // Check if the popup exists and is visible
        if (popup && popup.style.display === 'block') {
            // Check if the click was inside the popup or on the close button
            if (popup.contains(event.target) || event.target.classList.contains('close-button')) {
                return; // Don't close if clicking on popup or close button
            }
            
            // Check if click is on a highlighted text element
            let targetElement = event.target;
            let isHighlightedText = false;
            
            // Check if the click is on or inside a highlighted text
            while (targetElement && !isHighlightedText) {
                if (targetElement.classList && 
                    (targetElement.classList.contains('highlight-text') || 
                    targetElement.classList.contains('semi-highlight-text'))) {
                    isHighlightedText = true;
                }
                targetElement = targetElement.parentElement;
            }
            
            // If click was on a highlighted text, don't close the popup
            if (isHighlightedText) {
                return;
            }
            
            // For all other cases, close the popup
            closeExplanationPopup();
        }
    });
  
    loadData();
    
    /**
     * Load and display data based on current selections
     */
    function loadData() {
        console.log(`Loading data for translator ${translator.toLowerCase()} tag: ${tag}`);
        const tableBody = document.getElementById("comparisonTableBody");
        
        try {
            // Use the data processor to get data
            const dataPromise = window.electron.readData(translator, tag);

            dataPromise.then(data => {  
              tableBody.innerHTML = ""; // Clear previous content

                  // Render the pre-processed data
                data.chunks.forEach(chunk => {
                  const row = document.createElement("tr");
                  
                  // Create source cell
                  const sourceCell = document.createElement("td");
                  sourceCell.innerHTML = chunk.sourceHtml;
                  
                  // Create manual cell
                  const manualCell = document.createElement("td");
                  manualCell.innerHTML = chunk.manualHtml;
                  
                  // Create AI cell
                  const aiCell = document.createElement("td");
                  aiCell.innerHTML = chunk.aiHtml;
                  
                  // Add event listeners to AI cell
                  setupCellEventListeners(aiCell, sourceCell, chunk.explanations);
                  
                  // Append cells to row
                  row.appendChild(sourceCell);
                  row.appendChild(manualCell);
                  row.appendChild(aiCell);
                  
                  tableBody.appendChild(row);
              });
              
              // Update counts
              document.getElementById("manualCount").textContent = `${data.counts.manual} occurrences of ${tags[tag]}`;
              document.getElementById("aiCount").textContent = `${data.counts.ai} occurrences of ${tags[tag]}`;
              
              console.log("Data loaded successfully for tag:", tag);
            });
            
        } catch (error) {
            console.error("Error loading data:", error);
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Error loading data: ${error.message}</td></tr>`;
        } finally {
            // if (document.getElementById("saveButton").disabled) {
            //     window.electron.updateSaveButton(translators, tags);
            // }
            hideLoading();
        }
    }
});



// ui handler functions
// Module-level state for tracking highlighted elements
let currentHighlightedSource = null;
let popupOpen = false;


function setupCellEventListeners(aiCell, sourceCell, explanations) {
    if (!aiCell || !sourceCell || !explanations) {
        console.error("Missing required parameters for setupCellEventListeners");
        return;
    }
    
    // Source cell mouseover event
    sourceCell.addEventListener("mouseover", function(event) {
        const container = event.target.closest(".highlight-text-container");
        if (!container) return;
        
        const highlightText = container.querySelector(".semi-highlight-text");
        if (highlightText) {
            // Allow highlighting on hover even when popup is open, but
            // don't change the current highlighted source when popup is open
            highlightText.classList.remove("semi-highlight-text");
            highlightText.classList.add("highlight-text");
        }
    });

    // Source cell mouseout event
    sourceCell.addEventListener("mouseout", function(event) {
        const container = event.target.closest(".highlight-text-container");
        if (!container) return;
        
        const highlightText = container.querySelector(".highlight-text");
        // Allow un-highlighting on mouseout even when popup is open,
        // but don't change the current highlighted source
        if (highlightText && highlightText !== currentHighlightedSource) {
            highlightText.classList.remove("highlight-text");
            highlightText.classList.add("semi-highlight-text");
        }
    });

    // Source cell click event
    sourceCell.addEventListener("click", function(event) {
        const container = event.target.closest(".highlight-text-container");
        if (!container) return;
        
        const highlightText = container.querySelector(".highlight-text") || 
                              container.querySelector(".semi-highlight-text");
                              
        if (!highlightText) return;
        
        const index = parseInt(highlightText.getAttribute("data-index"));
        if (isNaN(index) || !explanations[index]) return;
        
        // If we already have a highlighted source that's different, unhighlight it first
        if (currentHighlightedSource && currentHighlightedSource !== highlightText) {
            currentHighlightedSource.classList.remove("highlight-text");
            currentHighlightedSource.classList.add("semi-highlight-text");
        }
        
        // Show explanation popup
        showExplanationPopup(explanations[index]);
        popupOpen = true; // Set popup state to open
        
        // Update current highlighted source
        currentHighlightedSource = highlightText;
        
        // Ensure proper highlighting
        highlightText.classList.remove("semi-highlight-text");
        highlightText.classList.add("highlight-text");
    });

    // AI cell click event
    aiCell.addEventListener("click", function(event) {
        const container = event.target.closest(".highlight-text-container");
        if (!container) return;
        
        const highlightText = container.querySelector(".highlight-text");
        if (!highlightText) return;
        
        const index = parseInt(highlightText.getAttribute("data-index"));
        if (isNaN(index) || !explanations[index]) return;
        
        // If we already have a highlighted source, unhighlight it first
        if (currentHighlightedSource) {
            currentHighlightedSource.classList.remove("highlight-text");
            currentHighlightedSource.classList.add("semi-highlight-text");
        }
        
        // Show explanation popup
        showExplanationPopup(explanations[index]);
        popupOpen = true; // Set popup state to open
        
        // Highlight corresponding source text
        const sourceHighlight = sourceCell.querySelector(`[data-index="${index}"]`);
        if (sourceHighlight) {
            sourceHighlight.classList.remove("semi-highlight-text");
            sourceHighlight.classList.add("highlight-text");
            currentHighlightedSource = sourceHighlight;
        }
    });
    
    // AI cell mouseover event
    aiCell.addEventListener("mouseover", function(event) {
        // Allow highlighting on hover even when popup is open
        const container = event.target.closest(".highlight-text-container");
        if (!container) return;
        
        const highlightText = container.querySelector(".highlight-text");
        if (!highlightText) return;
        
        const index = parseInt(highlightText.getAttribute("data-index"));
        if (isNaN(index) || !explanations[index]) return;
        
        // Show tooltip
        highlightText.setAttribute("title", explanations[index]);
        
        // Highlight source
        const sourceHighlight = sourceCell.querySelector(`[data-index="${index}"]`);
        if (sourceHighlight && sourceHighlight !== currentHighlightedSource) {
            sourceHighlight.classList.remove("semi-highlight-text");
            sourceHighlight.classList.add("highlight-text");
        }
    });
    
    // AI cell mouseout event
    aiCell.addEventListener("mouseout", function(event) {
        const container = event.target.closest(".highlight-text-container");
        if (!container) return;
        
        const highlightText = container.querySelector(".highlight-text");
        if (!highlightText) return;
        
        const index = parseInt(highlightText.getAttribute("data-index"));
        if (isNaN(index)) return;
        
        // Reset source highlighting
        const sourceHighlight = sourceCell.querySelector(`[data-index="${index}"]`);
        if (sourceHighlight && sourceHighlight !== currentHighlightedSource) {
            sourceHighlight.classList.remove("highlight-text");
            sourceHighlight.classList.add("semi-highlight-text");
        }
    });
}


function showExplanationPopup(explanation) {
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
            closeExplanationPopup();
        };
        popup.appendChild(closeButton);
        document.body.appendChild(popup);
        popupOpen = true;
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
}


function closeExplanationPopup() {
    const popup = document.getElementById("explanationPopup");
    if (popup) {
        popup.style.display = "none";
        if (currentHighlightedSource) {
            currentHighlightedSource.classList.remove("highlight-text");
            currentHighlightedSource.classList.add("semi-highlight-text");
            currentHighlightedSource = null;  // Clear the highlighted source
            popupOpen = false;
        }
    }
}


function updateTheme(isDarkMode) {
    const themeIcon = document.getElementById("themeIcon");
    
    if (isDarkMode) {
        // Dark mode is on - show moon icon
        themeIcon.className = "bi bi-moon-stars-fill";

        // Set dark mode styles
        document.body.classList.add("bg-dark");
        document.getElementById("comparisonTable").classList.add("table-dark");
        document.getElementById("fontenelleLabel").classList.add("dark-mode");
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
        document.getElementById("fontenelleLabel").classList.remove("dark-mode");
        document.getElementById("aiCount").classList.remove("dark-mode");
        document.getElementById("manualCount").classList.remove("dark-mode");
        if (document.getElementById("explanationPopup")) {
            document.getElementById("explanationPopup").classList.remove("dark-mode");
        }
    }
}


function showLoading() {
    console.log("showing loading");
    document.getElementById('loadingScreen').classList.add('active');
}


function hideLoading() {
    console.log("hiding loading");
    document.getElementById('loadingScreen').classList.remove('active');
}


function getCurrentHighlight() {
    return currentHighlightedSource;
}


function setCurrentHighlight(element) {
    currentHighlightedSource = element;
}