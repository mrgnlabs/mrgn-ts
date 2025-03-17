const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Updates all page components to use the Sanity components
 */
function updatePageComponents() {
  try {
    // Get all page.tsx files in the (site) directory
    const pageFiles = glob.sync('src/app/(site)/**/page.tsx', { cwd: path.resolve(process.cwd()) });
    
    console.log(`Found ${pageFiles.length} page components to update`);
    
    for (const pageFile of pageFiles) {
      console.log(`\nProcessing ${pageFile}...`);
      
      // Read the file
      const content = fs.readFileSync(path.resolve(process.cwd(), pageFile), 'utf8');
      
      // Skip if it's already using the Sanity components
      if (content.includes('import { DocPage') && content.includes('import { createMetadata }')) {
        console.log(`File ${pageFile} is already using Sanity components, skipping...`);
        continue;
      }
      
      // Extract the page name from the file path
      const pathMatch = pageFile.match(/src\/app\/\(site\)\/([^\/]+)/);
      if (!pathMatch) {
        console.log(`Could not extract path from ${pageFile}, skipping...`);
        continue;
      }
      
      const pagePath = pathMatch[1];
      const pageNameParts = pagePath.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1));
      const pageName = pageNameParts.join('');
      
      // Create the updated content
      const updatedContent = `import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage, createMetadata } from '~/components/sanity'
import { Metadata } from 'next'

async function get${pageName}Data() {
  return client.fetch(
    getDocPageBySlug,
    { slug: '${pagePath}' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await get${pageName}Data()
  return createMetadata(page)
}

export default async function ${pageName}Page() {
  const page = await get${pageName}Data()
  return <DocPage page={page} />
}`;
      
      // Write the updated content to the file
      fs.writeFileSync(path.resolve(process.cwd(), pageFile), updatedContent);
      
      console.log(`Updated ${pageFile}`);
    }
    
    console.log('\nDone updating page components');
  } catch (error) {
    console.error('Error updating page components:', error);
  }
}

// Run the function
updatePageComponents(); 