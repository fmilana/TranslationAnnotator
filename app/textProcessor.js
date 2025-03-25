const { findSegmentInText } = require('./stringMatcher');

/**
 * Format text with appropriate highlighting and cleanup
 * @param {string} text - Text to format
 * @param {string} tag - Optional tag for highlighting
 * @returns {string} Formatted text
 */
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
        .replace(/<(?!\/?(p|span)\b)[^>]*>/g, "") // Remove all XML tags (except our HTML p and span)
        .replace(/\s{2,}/g, " ") // Remove extra spaces
        .replace(/(\s+)([.,;!?])/g, "$2") // Remove spaces before punctuation
        .replace(/&/g, "&amp;") // Escape special characters for HTML entity handling
        
    return result;
}

/**
 * Highlight segments in text
 * @param {Array} chunkSegments - Segments to highlight
 * @param {string} text - Text to process
 * @param {string} highlightType - CSS class for highlighting
 * @param {string} tag - Tag name
 * @returns {string} Text with highlighted segments
 */
function highlightSegments(chunkSegments, text, highlightType, tag) {
    chunkSegments.forEach((segment, index) => {
        const matchResult = findSegmentInText(segment, text);

        if (matchResult.matchType !== "notFound") {
            const matchedSegment = matchResult.segment;

            // Create the highlight HTML with dynamic class and index
            const highlightHtml = `<span class="highlight-text-container"><span class="${highlightType} ${tag}" data-index="${index}">${matchedSegment}</span></span>`;

            // Replace the matched segment in the text with the highlighted version
            if (text.includes(matchedSegment)) {
                text = text.replace(matchedSegment, highlightHtml);
            } else {
                // Handle case where exact match is not found and escape special characters
                const escapedSegment = matchedSegment
                    .replace(/<[^>]*>/g, "")   // Remove any XML tags
                    .replace(/\s{2,}/g, " ")   // Normalize whitespace
                    .replace(/&/g, "&amp;")    // Escape special character for HTML entity handling
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape regex special characters

                const regex = new RegExp(escapedSegment, "gi"); 
                text = text.replace(regex, highlightHtml);
            }
        }
    });
    return text;
}

module.exports = {
    formatText,
    highlightSegments
};