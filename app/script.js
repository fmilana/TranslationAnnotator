tag = "LS"

document.addEventListener("DOMContentLoaded", function () {
    fetch(`../data/results/behn_${tag}.json`)
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById("comparisonTable");
            
            data.chunks.forEach(chunk => {
                const row = document.createElement("tr");

                // Create table cells
                const sourceCell = document.createElement("td");
                sourceCell.innerHTML = formatChunks(chunk.source_fr_manual);

                const manualCell = document.createElement("td");
                manualCell.innerHTML = formatChunks(chunk.target_en_manual, tag);

                const aiCell = document.createElement("td");
                aiCell.innerHTML = formatChunks(chunk.target_en_ai, tag);

                // Add click event listener to highlighted text in the AI column
                aiCell.addEventListener("click", function(event) {
                    if (event.target.classList.contains("highlight-text")) {
                    showExplanationPopup(chunk.explanation);
                    }
                });

                // Append cells to row
                row.appendChild(sourceCell);
                row.appendChild(manualCell);
                row.appendChild(aiCell);
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error("Error loading data:", error));

        // Function to show explanation popup
        function showExplanationPopup(explanation) {
            // Create popup element if it doesn't exist
            let popup = document.getElementById("explanationPopup");
            if (!popup) {
              popup = document.createElement("div");
              popup.id = "explanationPopup";
              // Add close button
              const closeButton = document.createElement("button");
              closeButton.className = "close-button";
              closeButton.onclick = function() {
                popup.style.display = "none";
              };
              popup.appendChild(closeButton);
              document.body.appendChild(popup);
            }
            
            // Get the width of the third column
            const thirdColumn = document.querySelector("#comparisonTable tr td:nth-child(3)");
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


function formatChunks(text, tag) {
    // Step 1: Replace chunk tags with HTML chunk tags and add the original tag name
    let result = text.replace(/<(P\d+)>(.*?)<\/\1>/gs, function(match, p1, p2) {
      return `<p><span>${p1}</span>: ${p2}</p>`;
    });
    
    // Step 2: Create a regular expression that matches all XML tags except the specified tag AND p tags
    const tagsToRemoveRegex = new RegExp(`<\\/?(?!${tag}\\b)(?!p\\b)(?!span\\b)[A-Za-z0-9]+>`, 'g');
    
    // Step 3: Remove all XML tags except the specified tag and p tags
    result = result.replace(tagsToRemoveRegex, '');
    
    // Step 4: Highlight the content of the specified tag
    const highlightRegex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, 'g');
    result = result.replace(highlightRegex, '<span class="highlight-text">$1</span>');
    
    return result;
}

