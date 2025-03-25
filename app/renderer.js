// Import required modules
const { readData } = require('./dataProcessor');
const { setupCellEventListeners, updateIcon, showLoading, hideLoading } = require('./uiHandler');

// renderer.js - Main application code
document.addEventListener("DOMContentLoaded", function () {
    showLoading();
  
    let darkMode = true;
    let translator = "behn";
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
  
        // load data for the selected tag
        setTimeout(() => {
            loadData();
        }, 0);
  
        // Prevent default anchor behavior
        e.preventDefault();
      });
    });
  
    document.querySelectorAll(".translator-item").forEach(item => {
      item.addEventListener("click", function(e) {
        const translatorSelected = this.textContent.toLowerCase();
  
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
  
        setTimeout(() => {
            loadData();
        }, 0);
  
        // Prevent default anchor behavior
        e.preventDefault();
      });
    });
  
    // dark mode toggle
    const toggle = document.getElementById("darkModeToggle");
    
    // set light mode by default
    darkMode = false;
    toggle.checked = false;

    // Set initial icon based on toggle state
    updateIcon(toggle.checked);
    
    // Add event listener to toggle
    toggle.addEventListener("change", function() {
        darkMode = this.checked;
        updateIcon(this.checked);
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
  
    loadData();
    
    /**
     * Load and display data based on current selections
     */
    function loadData() {
        console.log(`Loading data for translator ${translator.toLowerCase()} tag: ${tag}`);
        const tableBody = document.getElementById("comparisonTableBody");
        
        try {
            // Use the data processor to get data
            const data = readData(translator, tag);
            
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
            document.getElementById("manualCount").textContent = `(${data.counts.manual} occurrences)`;
            document.getElementById("aiCount").textContent = `(${data.counts.ai} occurrences)`;
            
            console.log("Data loaded successfully for tag:", tag);
            
        } catch (error) {
            console.error("Error loading data:", error);
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Error loading data: ${error.message}</td></tr>`;
        } finally {
            hideLoading();
        }
    }
});