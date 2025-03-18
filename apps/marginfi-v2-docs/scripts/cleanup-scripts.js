/**
 * Script to clean up duplicate and now-consolidated scripts
 * 
 * This script will delete scripts that have been consolidated into sanity-content-manager.js
 */

const fs = require('fs');
const path = require('path');

console.log('Starting cleanup script...');
console.log('Current directory:', process.cwd());
console.log('Script directory:', __dirname);

// List of scripts to delete
const scriptsToDelete = [
  'improved-mdx-to-sanity.js',
  'fix-mdx-conversion.js',
  'fix-problematic-blocks.js',
  'fix-use-cases-block.js',
  'fix-sanity-content.js',
  'fix-use-cases.ts',
  'fix-use-cases.js',
  'fix-content-rendering.js',
  'fix-all-pages.js',
  'fix-all-pages.ts',
  'convert-mdx-to-sanity.js'
];

console.log('Scripts to delete:', scriptsToDelete);

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    console.error(`Error checking if file exists: ${filePath}`, err);
    return false;
  }
}

// Function to delete a file
function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error(`Error deleting file: ${filePath}`, err);
    return false;
  }
}

// Main function
function cleanupScripts() {
  console.log('Starting script cleanup...');
  
  let deletedCount = 0;
  let notFoundCount = 0;
  
  for (const script of scriptsToDelete) {
    const scriptPath = path.join(__dirname, script);
    console.log(`Checking: ${scriptPath}`);
    
    if (fileExists(scriptPath)) {
      console.log(`Deleting: ${script}`);
      if (deleteFile(scriptPath)) {
        deletedCount++;
        console.log(`Successfully deleted: ${script}`);
      }
    } else {
      console.log(`Not found: ${script}`);
      notFoundCount++;
    }
  }
  
  console.log('\nCleanup complete!');
  console.log(`- ${deletedCount} scripts deleted`);
  console.log(`- ${notFoundCount} scripts not found`);
}

// Run the cleanup
cleanupScripts(); 