const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Determine proper data directory path based on environment
function getDataPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    // In development: data directory is a sibling to app directory
    return path.join(__dirname, '..', 'data');
  } else {
    // In production: data directory is included as a resource
    return process.platform === 'darwin'
      ? path.join(process.resourcesPath, 'data')
      : path.join(process.resourcesPath, 'data');
  }
}

// Set up IPC handler for loading JSON files
ipcMain.handle('load-json-file', async (event, relativePath) => {
  try {
    const dataPath = getDataPath();
    const filePath = path.join(dataPath, relativePath);
    console.log('Attempting to load file from:', filePath);
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading JSON file:', error);
    throw error;
  }
});

// Example of how to use this in your existing code:
// You can call this during startup to verify paths are working
function testFileAccess() {
  const dataPath = getDataPath();
  console.log('Data directory path:', dataPath);
  
  // Example: Check if a specific file exists
  const testFile = path.join(dataPath, 'results', 'behn_IJM.json');
  fs.access(testFile, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File ${testFile} does not exist or is not accessible`);
    } else {
      console.log(`File ${testFile} exists and is accessible`);
    }
  });
}

// Call this when your app is ready
app.whenReady().then(() => {
  // Your existing createWindow code...
  
  // Test file access
  testFileAccess();
});