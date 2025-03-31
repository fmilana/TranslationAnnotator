const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    // icon: path.join(__dirname, "build", "icon.ico"),
    width: 1600,
    height: 900,
    resizable: true,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile("index.html");

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

// When Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("open-dialog", async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: options.title || "Select Folder",
    buttonLabel: options.buttonLabel || "Select"
  });
  return result;
});

ipcMain.handle("save-files", async (event, destPath) => {
  const files = [];

  // Get the list of files in the cache directory
  const txtCacheDir = path.join(__dirname, "data", "cache", "extracted", "txt");
  const xmlCacheDir = path.join(__dirname, "data", "cache", "extracted", "xml");

  const txtFiles = fs.readdirSync(txtCacheDir).map(file => path.join(txtCacheDir, file));
  const xmlFiles = fs.readdirSync(xmlCacheDir).map(file => path.join(xmlCacheDir, file));

  files.push(...txtFiles, ...xmlFiles);

  saveFiles(files, destPath);
  return { success: true };
});

ipcMain.handle("read-data", async (event, translator, tag) => {
  return readData(translator, tag);
});

// ipcMain.handle("update-save-button", async (event, translators, tags) => {
//   updateSaveButton(translators, tags);
// });


// function updateSaveButton(translators, tags) {
//   // Check if all files are present in the cache
//   const cacheDir = path.join(__dirname, "data", "cache");
//   let allFilesPresent = true;
//   for (const translator of translators) {
//       for (const tag of tags) {
//           const filePath = path.join(cacheDir, `${translator}_${tag}.json`);
//           if (!fs.existsSync(filePath)) {
//               allFilesPresent = false;
//               break;
//           }
//       }
//   }

//   if (allFilesPresent) {
//       document.getElementById("saveButton").disabled = false;
//   } else {
//       document.getElementById("saveButton").disabled = true;
//   }
// }


function readData(translator, tag) {
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
          const cacheData = JSON.parse(fs.readFileSync(cachePath, "utf8"));
          return cacheData;
      }
      
      // No cache exists, load and process the original data
      const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      
      // Process the data
      const processedData = processData(rawData, tag);
      
      // Save the processed data to cache for future use
      fs.writeFileSync(cachePath, JSON.stringify(processedData));
      
      // now extract xmls and txts to cache/extracted
      extractFiles(translator, tag);

      return processedData;
  } catch (error) {
      console.error("Error loading data:", error);
      throw error;
  }
}

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


function formatText(text, tag) {
  // Store the original text
  let result = text;

  // Unescape quotation marks \\"
  result = result.replace(/\\"/g, '"');
  
  // Replace paragraph tags with HTML paragraph tags
  result = result.replace(/<(P\d+)>(.*?)<\/\1>/gs, function(match, p1, p2) {
      return `<p>${p1}: ${p2}</p>`;
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


function highlightSegments(chunkSegments, text, highlightType, tag) {
  // unescape XML entities and p tags
  text = text.replace(/&amp;/g, '&').replace(/<\/?p>/g, '');

  // Apply highlights
  chunkSegments.forEach((segment, index) => {
    segment = segment.replace(/<[^>]*>/g, ''); // Remove XML tags
    const matchResult = findSegmentInText(segment, text);
    if (matchResult.matchType !== "notFound") {
      const matchedSegment = matchResult.segment;
      const highlightHtml = `<span class="highlight-text-container"><span class="${highlightType} ${tag}" data-index="${index}">${matchedSegment}</span></span>`;
      text = text.replace(matchedSegment, highlightHtml);
    }
  });

  // Re-add paragraph tags at P00X markers
  text = text.replace(/\b(P\d{3})/g, '<p>$1');
  const sections = text.split('<p>');
  text = sections[0];
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    // Check if there's another P00x in this section
    const nextPIndex = section.substring(4).search(/\bP\d{3}\b/);
    if (nextPIndex !== -1) {
      // Add </p> before the next P00x 
      text += '<p>' + section.substring(0, nextPIndex + 4) + '</p>' + section.substring(nextPIndex + 4);
    } else {
      // Add </p> at the end of this section
      text += '<p>' + section + '</p>';
    }
  }

  // Restore & to &amp;
  return text.replace(/&/g, "&amp;");
}


function extractFiles(translator, tag) {
  // check if files have already been extracted (at least one file in the folder)
  const extractedDir = path.join(__dirname, "data", "cache", "extracted");
  const txtDir = path.join(extractedDir, "txt");
  fs.readdir(txtDir, (err, files) => {
    let xml = "";
    
    if (!files.includes(`${translator}_${tag}.xml`) && !files.includes(`${translator}_${tag}.txt`)) {
      const cachePath = path.join(__dirname, "data", "cache", `${translator}_${tag}.json`);
      const cacheData = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      const chunks = cacheData.chunks;
      let xmlContent = "";

      // Extract XML from each chunk
      for (const chunk of chunks) {
        const aiChunk = htmlToXml(chunk.aiHtml);
        xmlContent += aiChunk + '\n';
      }

      xml = `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${xmlContent}</root>`;      

      // Save the XML and TXT files
      // Save XML to 'xml' folder
      const xmlPath = path.join(__dirname, "data", "cache", "extracted", "xml", `${translator}_${tag}.xml`);
      fs.writeFileSync(xmlPath, xml);

      // Save TXT to 'txt' folder
      const txtContent = xmlContent.replace(/&amp;/g, '&');  // Unescape XML entities if needed
      const txtPath = path.join(__dirname, "data", "cache", "extracted", "txt", `${translator}_${tag}.txt`);
      fs.writeFileSync(txtPath, txtContent);
    }

    if (!files.includes("fontenelle.txt")) {
      try {
        extractSource();
      } catch (error) {
        console.error("Error extracting source:", error);
      }
    } 
  });
}

function htmlToXml(htmlString) {
  let result = '';
  // Updated regex to be more flexible with potential spacing or tag variations
  const paragraphRegex = /<p>(P\d+):\s*(.*?)\s*<\/p>/g;
  const tagRegex = /<span class=\"(?:semi-highlight-text|highlight-text) (\w+)\" data-index=\"\d+\">(.*?)<\/span>/g;
  

  let match;
  while ((match = paragraphRegex.exec(htmlString)) !== null) {
    const pTag = match[1]; // E.g., P001, P002, etc.
    let content = match[2]; // Content inside the paragraph
    
    // Store tag replacements
    let tagReplacements = [];
    
    // Process the special span tags first - collect information and replace with placeholders
    content = content.replace(tagRegex, function(match, tagName, tagContent) {
      const placeholderIndex = tagReplacements.length;
      tagReplacements.push({ tagName, tagContent });
      return `$PLACEHOLDER_START_${placeholderIndex}$${tagContent}$PLACEHOLDER_END_${placeholderIndex}$`;
    });
    
    // After processing special spans, remove all remaining HTML tags while preserving text
    content = content.replace(/<[^>]*>/g, ' ');
    
    // Handle extra spaces by trimming and collapsing multiple spaces
    content = content.replace(/\s+/g, ' ').trim();
    
    // Manually escape '&amp ;' to '&amp;' where necessary
    content = content.replace(/&amp ;/g, '&amp;');
    
    // replace &am p; with &amp;
    content = content.replace(/&am p;/g, '&amp;');
    
    // Replace placeholders with XML tags
    tagReplacements.forEach((replacement, index) => {
      content = content.replace(
        `$PLACEHOLDER_START_${index}$`, 
        `<${replacement.tagName}>`
      );
      content = content.replace(
        `$PLACEHOLDER_END_${index}$`, 
        `</${replacement.tagName}>`
      );
    });
    
    // Construct the XML format line
    result += `<${pTag}>${content}</${pTag}>\n`;
  }
  return result.trim(); // Return the final result, trimmed
}

function findSegmentInText(segment, fullText) {
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


function normalizeForMatching(text) {
  return text
  .replace(/\s+/g, ' ')           // Normalize multiple spaces
  .replace(/['']/g, "'")          // Normalize single quotes
  .replace(/[""]/g, '"')          // Normalize double quotes
  .replace(/[\u2014\u2013]/g, '-') // Normalize em/en dashes
  .toLowerCase();             
}


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
  
  // Only return matches above threshold
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


function extractSource() {
  // Load cached data
  const cachePath = path.join(__dirname, "data", "cache", "knight_IIM.json");
  const cacheData = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  const chunks = cacheData.chunks;
  let xmlContent = '';  // Accumulate the content inside <root>

  // Extract XML from each chunk
  for (const chunk of chunks) {
    // remove all xml tags except P00X tags
    let sourceChunk = chunk.sourceHtml.replace(/<(?!\/?p>)(?!P\d{3})[^>]*>/g, '');
    sourceChunk = htmlToXml(sourceChunk);
    xmlContent += sourceChunk + '\n';
  }

  // Wrap the accumulated XML content with a root element and add XML declaration
  const wrappedXml = `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${xmlContent}</root>`;

  // Save XML to file
  const xmlPath = path.join(__dirname, "data", "cache", "extracted", "xml", "fontenelle.xml");
  fs.writeFileSync(xmlPath, wrappedXml);

  // Save as TXT (same content, different extension)
  const txtPath = path.join(__dirname, "data", "cache", "extracted", "txt", "fontenelle.txt");
  xmlContent = xmlContent.replace(/&amp;/g, '&');
  fs.writeFileSync(txtPath, xmlContent);  // TXT file contains just the inner content without XML declaration
}


function saveFiles(files, destinationPath) {
  if (!fs.existsSync(path.join(destinationPath, "Translation Annotator Results"))) {
    fs.mkdirSync(path.join(destinationPath, "Translation Annotator Results"), { recursive: true });
  }

  destinationPath = path.join(destinationPath, "Translation Annotator Results");

  // Define subdirectories for XML and TXT files
  const xmlFolder = path.join(destinationPath, 'xml');
  const txtFolder = path.join(destinationPath, 'txt');

  // Ensure both subdirectories exist
  if (!fs.existsSync(xmlFolder)) {
      fs.mkdirSync(xmlFolder, { recursive: true });
  }
  if (!fs.existsSync(txtFolder)) {
      fs.mkdirSync(txtFolder, { recursive: true });
  }

  // Loop through each file and save it in the appropriate folder based on its extension
  for (const file of files) {
      const fileName = path.basename(file);
      const fileExtension = path.extname(file).toLowerCase(); // Handle case-insensitive extensions

      let destinationFolder;
      if (fileExtension === '.xml') {
          destinationFolder = xmlFolder;
      } else if (fileExtension === '.txt') {
          destinationFolder = txtFolder;
      } else {
          console.warn(`Skipping unsupported file type: ${file}`);
          continue;
      }

      const destinationFilePath = path.join(destinationFolder, fileName);
      fs.copyFileSync(file, destinationFilePath);
  }
}

