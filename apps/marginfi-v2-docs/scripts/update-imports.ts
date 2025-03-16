/**
 * This script updates all page components to use the new imports from the sanity folder.
 * 
 * Run with: npx ts-node apps/marginfi-v2-docs/scripts/update-imports.ts
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get the root directory of the project
const rootDir = path.resolve(__dirname, '../..');
const appDir = path.resolve(__dirname, '..');

// Find all page components
const pageFiles: string[] = glob.sync('src/app/**/*.tsx', { cwd: appDir });

// Update imports in each file
pageFiles.forEach((file: string) => {
  const filePath = path.resolve(appDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Update DocPage import
  content = content.replace(
    "import { DocPage } from '~/components/doc/DocPage'",
    "import { DocPage } from '~/components/sanity'"
  );

  // Update Metadata import
  content = content.replace(
    "import { createMetadata } from '~/components/doc/Metadata'",
    "import { createMetadata } from '~/components/sanity'"
  );

  // Write the updated content back to the file
  fs.writeFileSync(filePath, content);
  console.log(`Updated imports in ${file}`);
});

console.log('All imports updated successfully!'); 