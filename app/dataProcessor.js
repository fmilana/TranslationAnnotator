const path = require("path");
const fs = require("fs");

/**
 * Read data from file and return processed or cached data
 * @param {string} translator - Selected translator
 * @param {string} tag - Selected tag
 * @returns {Object} Processed data
 */
function readData(translator, tag) {
    console.log(`Reading data for translator ${translator.toLowerCase()} tag: ${tag}`);
    try {
        // Path to original data
        const dataPath = path.join(__dirname, "data", "results", `${translator}_${tag}.json`);
        
        // Path to cached processed data
        const cacheDir = path.join(__dirname, "data", "cache");
        const cachePath = path.join(cacheDir, `${translator}_${tag}.json`);
        
        // Ensure cache directory exists
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        // Check if we have a processed cache file
        if (fs.existsSync(cachePath)) {
            console.log(`Using cached data for ${translator}_${tag}`);
            const cacheData = JSON.parse(fs.readFileSync(cachePath, "utf8"));
            return cacheData;
        }
        
        // No cache exists, load and process the original data
        console.log(`Processing data for ${translator}_${tag}`);
        const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        
        // Process the data
        const processedData = processData(rawData, tag);
        
        // Save the processed data to cache for future use
        fs.writeFileSync(cachePath, JSON.stringify(processedData));
        
        return processedData;
    } catch (error) {
        console.error("Error loading data:", error);
        throw error;
    }
}

/**
 * Process the raw data and apply all matching/highlighting logic
 * @param {Object} data - Raw data
 * @param {string} tag - Selected tag
 * @returns {Object} Processed data
 */
function processData(data, tag) {
    const processed = {
        chunks: data.chunks.map(chunk => {      
            const formatted_source = formatText(chunk.source_manual);
            const formatted_manual = formatText(chunk.target_manual, tag);
            const formatted_target = formatText(chunk.target_manual);

            const highlightedSourceHtml = highlightSegments(chunk.source_segments, formatted_source, 'semi-highlight-text', tag);
            const highlightedAiHtml = highlightSegments(chunk.target_segments, formatted_target, 'highlight-text', tag);

            return {
                // Return processed chunk data ready for rendering
                sourceHtml: highlightedSourceHtml,
                manualHtml: formatted_manual,
                aiHtml: highlightedAiHtml,
                explanations: chunk.explanations || []            
            };
        }),
        counts: calculateCounts(data.chunks, tag)
    };
    return processed;
}

/**
 * Calculate occurrence counts for manual and AI segments
 * @param {Array} chunks - Data chunks
 * @param {string} tag - Selected tag
 * @returns {Object} Counts object
 */
function calculateCounts(chunks, tag) {
    // Calculate occurrence counts
    let manual_count = 0;
    let ai_count = 0;

    chunks.forEach(chunk => {
        const chunk_manual_count = (chunk.target_manual.match(new RegExp(`<(${tag})>`, "g")) || []).length;
        const chunk_ai_count = chunk.target_segments.length;
        manual_count += chunk_manual_count;
        ai_count += chunk_ai_count;
    });

    return {
        manual: manual_count,
        ai: ai_count
    };
}

// Import text processing functions
const { formatText, highlightSegments } = require('./textProcessor');

module.exports = {
    readData,
    processData,
    calculateCounts
};