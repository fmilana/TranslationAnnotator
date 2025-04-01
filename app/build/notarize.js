/* Based on https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/ */
exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  // Only continue if we're building for macOS
  if (electronPlatformName !== "darwin") {
    console.log('Skipping notarization for platform:', electronPlatformName);
    return;
  }
  
  // Dynamically require electron-notarize only when needed
  try {
    const { notarize } = require("electron-notarize");
    // Load environment variables
    require('dotenv').config({ path: './.env.mac' });
    
    const appName = context.packager.appInfo.productFilename;
    
    return await notarize({
      tool: 'notarytool',
      appBundleId: "com.translatorannotator.app",
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS,
      teamId: process.env.APPLETEAMID
    });
  } catch (error) {
    console.error('Notarization failed:', error);
    // Don't fail the build if notarization fails on non-macOS platforms
    if (electronPlatformName === "darwin") {
      throw error;
    }
  }
};