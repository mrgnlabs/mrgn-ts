import * as fs from 'fs'
import * as path from 'path'

interface Property {
  name: string;
  type?: string;
  description: string;
}

function extractProperties(mdxContent: string): Property[] {
  const properties: Property[] = []
  const propertyRegex = /<Property\s+name="([^"]+)"(?:\s+type="([^"]*)")?\s*>([\s\S]*?)<\/Property>/g

  let match
  while ((match = propertyRegex.exec(mdxContent)) !== null) {
    const [_, name, type, content] = match
    properties.push({
      name,
      type: type || undefined,
      description: content.trim()
    })
  }

  return properties
}

function formatForOutput(properties: Property[]): string {
  return properties.map(prop => {
    return `${prop.name}    ${prop.type || ''}\n${prop.description}\n`
  }).join('\n')
}

function convertMDXFile(filePath: string) {
  // Ensure we're working with relative paths from the docs directory
  const docsDir = path.resolve(__dirname, '../../')
  const fullPath = path.resolve(docsDir, filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${filePath}`)
    console.error('Please provide a path relative to the marginfi-v2-docs directory')
    process.exit(1)
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const properties = extractProperties(content)
  
  if (properties.length === 0) {
    console.log('No Properties found in the file.')
    return
  }

  // Create output directory if it doesn't exist
  const outputDir = path.join(docsDir, 'converted-properties')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  // Save all properties to a single file
  const baseName = path.basename(filePath, '.mdx')
  const outputPath = path.join(outputDir, `${baseName}-properties.txt`)
  const formattedOutput = formatForOutput(properties)
  
  fs.writeFileSync(outputPath, formattedOutput)
  console.log(`\nExtracted ${properties.length} properties to: ${outputPath}`)
}

const mdxFilePath = process.argv[2]
if (!mdxFilePath) {
  console.error('Please provide an MDX file path as an argument')
  console.error('Example: pnpm extract-properties src/app/\(site\)/ts-sdk/_dep/page.mdx')
  process.exit(1)
}

convertMDXFile(mdxFilePath) 