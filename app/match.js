function findBestMatch(segment, fullText, similarityThreshold = 0.8) {
    let highestSimilarity = 0;
    let bestMatch = null;
    
    // Calculate the length of what we're searching for
    const segmentLength = segment.length;
    
    // Check all possible starting positions in the text
    for (let i = 0; i <= fullText.length - segmentLength; i++) {
      // Extract a chunk of exactly the same size as our segment
      const chunk = fullText.substr(i, segmentLength);
      const similarity = calculateSimilarity(segment, chunk);
      
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          segment: chunk,
          index: i,
          exact: similarity === 1,
          similarity: similarity
        };
        
        // If we found an exact match, we can stop looking
        if (similarity === 1) break;
      }
    }
    
    // Only return matches above our threshold
    return (bestMatch && bestMatch.similarity >= similarityThreshold) ? bestMatch : null;
}

function calculateSimilarity(str1, str2) {
    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLength);
}

function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1, // deletion
                dp[i][j - 1] + 1, // insertion
                dp[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return dp[m][n];
}

function normalizeForMatching(text) {
    return text
        .replace(/\s+/g, ' ')           // Normalize multiple spaces
        .replace(/['']/g, "'")          // Normalize single quotes
        .replace(/[""]/g, '"')          // Normalize double quotes
        .replace(/[\u2014\u2013]/g, '-') // Normalize em/en dashes
        .toLowerCase(); 
}

function findNormalizedMatch(segment, fullText) {
    const normalizedSegment = normalizeForMatching(segment);
    const normalizedFullText = normalizeForMatching(fullText);

    const index = normalizedFullText.indexOf(normalizedSegment);

    if (index !== -1) {
        const approximatePosition = index;
        const approximateLength = normalizedSegment.length;
        
        const originalTextChunk = fullText.substr(
            Math.max(0, approximatePosition),
            approximateLength
        )

        return {
            segment: originalTextChunk,
            index: approximatePosition,
            normalizedMatch: true,
        }
    }

    return null;
}

export function findSegmentInText(segment, fullText) {
    if (fullText.includes(segment)) {
        return {
            segment,
            index: fullText.indexOf(segment),
            matchType: 'exact'
        };
    }

    const normalizedMatch = findNormalizedMatch(segment, fullText);
    if (normalizedMatch) {
        return {
            ...normalizedMatch,
            matchType: 'normalized'
        };
    }

    const fuzzyMatch = findBestMatch(segment, fullText);
    if (fuzzyMatch) {
        return {
            ...fuzzyMatch,
            matchType: 'fuzzy'
        };
    }

    return {
        segment,
        index: -1,
        matchType: 'notFound',
        error: 'No match found for segment'
    };
}

