document.addEventListener("DOMContentLoaded", function () {
  let darkMode = true;
  let tag = "IIM";
  
  let highlightedSource = null;

  loadData();

  // Get the navbar and content wrapper elements
  const navbar = document.querySelector(".navbar");
  const contentWrapper = document.querySelector(".content-wrapper");

  // Add event listeners to tag dropdown items
  document.querySelectorAll('.tag-item').forEach(item => {
    item.addEventListener('click', function(e) {
      // Update the displayed tag in the dropdown
      document.getElementById('selectedTag').textContent = this.textContent;
      
      // Store the selected tag in the variable
      tag = this.textContent;

      // load data for the selected tag
      loadData();

      // Prevent default anchor behavior
      e.preventDefault();
    });
  });


  // dark mode toggle
  const toggle = document.getElementById("darkModeToggle");
  const themeIcon = document.getElementById("themeIcon");
  
  // Set initial icon based on toggle state
  updateIcon(toggle.checked);
  
  // Add event listener to toggle
  toggle.addEventListener("change", function() {
    darkMode = this.checked;
    updateIcon(this.checked);
  });
  
  function updateIcon(isDarkMode) {
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
      console.log(3);

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

  function loadData() {
    const tableBody = document.getElementById("comparisonTableBody");
    // Show loading indicator
    // tableBody.innerHTML = "<tr><td colspan='3' class='text-center'>Loading data...</td></tr>";

    fetch(`../data/results/behn_${tag}.json`)
        .then(response => response.json())
        .then(data => {
            tableBody.innerHTML = ""; // Clear previous content

            let manualCount = 0;
            let aiCount = 0;
            
            data.chunks.forEach(chunk => {
                const row = document.createElement("tr");

                // Create table cells
                const sourceCell = document.createElement("td");
                sourceCell.innerHTML = formatText(chunk.source_manual);

                const manualCell = document.createElement("td");
                manualCell.innerHTML = formatText(chunk.target_manual, tag);

                manualCount += (manualCell.querySelectorAll(".highlight-text").length || 0);

                // If we have source segments
                if (chunk.source_segments && chunk.source_segments.length > 0) {
                  // Process each segment and create the highlighted version
                  chunk.source_segments.forEach((segment, index) => {
                    // Use the new findAndHighlight function for source cell
                    findAndHighlight(sourceCell, segment, index, "semi-highlight-text", true);
                  });
                }

                // For the AI column, we need to create text with highlights
                const aiCell = document.createElement("td");
                
                // Start with the base text and apply formatting
                aiCell.innerHTML = formatText(chunk.target_manual);
                  
                // If we have target segments to highlight
                if (chunk.target_segments && chunk.target_segments.length > 0) {
                  // Process each segment and create the highlighted version
                  chunk.target_segments.forEach((segment, index) => {
                    // Use the new findAndHighlight function for AI cell
                    findAndHighlight(aiCell, segment, index, "highlight-text", false);
                  });
                }
                
                aiCount += (aiCell.querySelectorAll(".highlight-text").length || 0);

                // Add click event listener to the highlight-text-container in the AI column
                aiCell.addEventListener("click", function(event) {
                  // Check if the event target or any of its ancestors is a highlight-text-container
                  const container = event.target.closest(".highlight-text-container");

                  // Ensure the target is inside a highlight-text-container
                  if (container) {
                    const highlightText = container.querySelector(".highlight-text");
                    const index = parseInt(highlightText.getAttribute("data-index"));
                    const explanation = chunk.explanations[index];
                    
                    // Show the explanation popup if available
                    if (explanation) {
                      showExplanationPopup(explanation);
                    }

                    // Keep the source text highlighted
                    const sourceHighlight = sourceCell.querySelector(`.highlight-text[data-index="${index}"]`);
                    if (sourceHighlight) {
                      sourceHighlight.classList.add("highlight-text");  // Ensure it's highlighted
                      sourceHighlight.classList.remove("semi-highlight-text");  // Remove the semi highlight
                    }

                    highlightedSource = sourceHighlight;  // Store the highlighted source
                  }
                });

                // Add on hover event listener to the highlight-text-container in the ai column
                aiCell.addEventListener("mouseover", function(event) {
                  // Check if the event target or any of its ancestors is a highlight-text-container
                  const container = event.target.closest(".highlight-text-container");

                  // Ensure the target is inside a highlight-text-container
                  if (container) {
                    const highlightText = container.querySelector(".highlight-text");
                    const index = parseInt(highlightText.getAttribute("data-index"));
                    const explanation = chunk.explanations[index];

                    // Show the explanation in a tooltip
                    if (explanation) {
                      highlightText.setAttribute("title", explanation);
                    }

                    // Highlight the corresponding source segment
                    const sourceHighlight = sourceCell.querySelector(`.semi-highlight-text[data-index="${index}"]`);
                    if (sourceHighlight) {
                      sourceHighlight.classList.remove("semi-highlight-text");
                      sourceHighlight.classList.add("highlight-text");
                    }
                  }
                });

                // Use mouseleave on the highlight-text-container
                aiCell.addEventListener("mouseout", function(event) {
                  // Check if the event target or any of its ancestors is a highlight-text-container
                  const container = event.target.closest(".highlight-text-container");

                  // Ensure the target is inside a highlight-text-container
                  if (container) {  // Ignore the mouseout if a click occurred
                    const highlightText = container.querySelector(".highlight-text");
                    const index = parseInt(highlightText.getAttribute("data-index"));

                    // Reset the source text highlighting if it was highlighted and not clicked
                    const sourceHighlight = sourceCell.querySelector(`.highlight-text[data-index="${index}"]`);
                    if (sourceHighlight && sourceHighlight !== highlightedSource) {
                      sourceHighlight.classList.remove("highlight-text");
                      sourceHighlight.classList.add("semi-highlight-text");
                    }
                  }
                });

                // Append cells to row
                row.appendChild(sourceCell);
                row.appendChild(manualCell);
                row.appendChild(aiCell);
                
                tableBody.appendChild(row);
            });

            document.getElementById("manualCount").textContent = `(${manualCount} occurrences)`;
            document.getElementById("aiCount").textContent = `(${aiCount} occurrences)`;
      })
      .catch(error => console.error("Error loading data:", error));
  }

  function findAndHighlight(cell, segment, index, className) {
    const cleanedSegment = segment
      .replace(/<[^>]*>/g, "") // Remove any XML tags
      .replace(/\s{2,}/g, " ") // Remove extra spaces
      .replace(/(\s+)([.,;!?])/g, "$2") // Remove spaces before punctuation
      .slice(0, -1) // Get segment without last character (for handling punctuation differences)
      .replace(/&/g, "&amp;") // Escape special character for HTML entity handling
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape all regex special characters
    
    // Using a regex with optional last character to handle potential punctuation differences
    // 'i' flag for case-insensitive matching
    const regex = new RegExp(`(${cleanedSegment}.)`, "gi");
    
    // Replace matches with highlighted spans
    cell.innerHTML = cell.innerHTML.replace(regex, `<span class="highlight-text-container"><span class="${className} ${tag}" data-index="${index}">$1</span></span>`);
  }
  

  function formatText(text, tag) {
    // Store the original text
    let result = text;

    // Unescape quotation marks \\"
    result = result.replace(/\\"/g, '"');
    
    // Replace paragraph tags with HTML paragraph tags
    result = result.replace(/<(P\d+)>(.*?)<\/\1>/gs, function(match, p1, p2) {
      return `<p><span>${p1}</span>: ${p2}</p>`;
    });
    
    // If tag is provided (manual target cell), replace the tag with highlight-text span
    if (tag) {
      const tagRegex = new RegExp(`<(${tag})>(.*?)<\\/\\1>`, "gs");
      result = result.replace(tagRegex, function(match, p1, p2) {
        return `<span class="highlight-text-container"><span class="highlight-text ${tag}">${p2}</span></span>`;
      });
    }
    
    result = result
      .replace(/<(?!\/?(p|span)\b)[^>]*>/g, "") // Remove all XML tags (except our HTML p and span )
      .replace(/\s{2,}/g, " ") // Remove extra spaces
      .replace(/(\s+)([.,;!?])/g, "$2") // Remove spaces before punctuation
      .replace(/&/g, "&amp;") // Escape special characters for HTML entity handling
        
    return result;
  }

  // Function to show explanation popup
  function showExplanationPopup(explanation) {
      // Create popup element if it doesn't exist
      let popup = document.getElementById("explanationPopup");
      if (!popup) {
        popup = document.createElement("div");
        popup.id = "explanationPopup";

        if (darkMode) {
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
  }
});