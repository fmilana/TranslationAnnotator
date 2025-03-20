document.addEventListener("DOMContentLoaded", function () {
  const tag = "LS";
  
  fetch(`../data/results/behn_${tag}.json`)
      .then(response => response.json())
      .then(data => {
          const tableBody = document.getElementById("comparisonTable");
          let manualCount = 0;
          let aiCount = 0;
          
          data.chunks.forEach(chunk => {
              const row = document.createElement("tr");

              // Create table cells
              const sourceCell = document.createElement("td");
              sourceCell.innerHTML = formatText(chunk.source_fr_manual);

              const manualCell = document.createElement("td");
              manualCell.innerHTML = formatText(chunk.target_en_manual, tag);

              manualCount += (manualCell.querySelectorAll(".highlight-text").length || 0);

              // For the AI column, we need to create text with highlights
              const aiCell = document.createElement("td");
              
              // Start with the base text
              let aiText = chunk.target_en_manual;
              
              // Apply highlights for each segment
              if (chunk.segments && chunk.segments.length > 0) {
                  // Convert the text to an array for easier manipulation
                  let textArray = [...aiText];
                  
                  // Add tags in reverse order to avoid index shifting
                  // We need to sort segments by their positions in reverse order
                  const sortedSegments = [...chunk.segments].sort((a, b) => {
                      // Assuming segments contain start and end indices
                      // If not, you'll need to adjust this based on your actual data structure
                      return b.start - a.start;
                  });
                  
                  sortedSegments.forEach((segment, index) => {
                      const start = segment.start;
                      const end = segment.end;
                      
                      // Insert closing tag
                      textArray.splice(end, 0, `</span>`);
                      
                      // Insert opening tag with data-index
                      textArray.splice(start, 0, `<span class="highlight-text" data-index="${index}">`);
                  });
                  
                  // Convert back to string
                  aiText = textArray.join('');
              }
              
              aiCell.innerHTML = formatText(aiText, tag);

              aiCount += (aiCell.querySelectorAll(".highlight-text").length || 0);
              
              // Start with the base text and apply formatting
              let baseText = formatText(chunk.target_en_manual);
                
              // If we have segments to highlight
              if (chunk.segments && chunk.segments.length > 0) {
                  // Process each segment and create the highlighted version
                  chunk.segments.forEach((segment, index) => {
                      // Escape special characters for regex safety
                      const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      
                      // Replace the segment with a highlighted version
                      // Using a regex that ensures we match whole words/phrases
                      const regex = new RegExp(`(${escapedSegment})`, 'g');
                      baseText = baseText.replace(regex, 
                          `<span class="highlight-text" data-index="${index}">$1</span>`);
                  });
              }
              
              aiCell.innerHTML = baseText;
              
              // Add click event listener to highlighted text in the AI column
              aiCell.addEventListener("click", function(event) {
                  if (event.target.classList.contains("highlight-text")) {
                      const index = parseInt(event.target.getAttribute("data-index"));
                      const explanation = chunk.explanations[index];
                      
                      if (explanation) {
                          showExplanationPopup(explanation);
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

  // Function to format text by adding paragraph structure
  function formatText(text, tag) {
      // Replace chunk tags with HTML chunk tags and add the original paragraph tag name
      let result = text.replace(/<(P\d+)>(.*?)<\/\1>/gs, function(match, p1, p2) {
          return `<p><span>${p1}</span>: ${p2}</p>`;
      });

      // if tag is provided, highlight the text wrapped in that tag
      if (tag) {
          result = result.replace(new RegExp(`<${tag}>(.*?)<\/${tag}>`, 'gs'), function(match, p1) {
              return `<span class="highlight-text">${p1}</span>`;
          });
      }

      return result
  }

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