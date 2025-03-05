const fs = require('fs')
const path = require('path')

interface Property {
  name: string
  type?: string
  parameters?: string
  resultType?: string
  description: string
}

function extractPropertiesFromMDX(mdxContent: string): Property[] {
  const properties: Property[] = []
  const propertyRegex = /<Property\s+name="([^"]+)"(?:\s+type="([^"]+)")?>([\s\S]*?)<\/Property>/g

  let match
  while ((match = propertyRegex.exec(mdxContent)) !== null) {
    const [_, name, type, description] = match
    const cleanDescription = description.trim()
    
    // Split type into parameters and resultType if it contains a pipe
    let parameters = type
    let resultType = type
    if (type && type.includes('|')) {
      const [params, result] = type.split('|').map(t => t.trim())
      parameters = params
      resultType = result
    }

    properties.push({
      name,
      parameters,
      resultType,
      description: cleanDescription
    })
  }

  return properties
}

function formatForSanity(properties: Property[]): string {
  return properties.map(prop => {
    const nameAndType = `${prop.name}    ${prop.parameters || ''}`
    const description = prop.description
    return `${nameAndType}\n${description}\n`
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
  const properties = extractPropertiesFromMDX(content)
  const formattedOutput = formatForSanity(properties)
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(docsDir, 'converted-properties')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  // Save the formatted output
  const outputPath = path.join(outputDir, `${path.basename(filePath, '.mdx')}-properties.txt`)
  fs.writeFileSync(outputPath, formattedOutput)
  
  console.log(`Converted properties saved to: ${outputPath}`)
  console.log('\nYou can now copy the contents of this file and paste it into the Sanity Studio.')
}

// Example usage
const mdxFile = process.argv[2]
if (!mdxFile) {
  console.error('Please provide an MDX file path as an argument')
  console.error('Example: pnpm convert-properties src/app/\(site\)/ts-sdk/_dep/page.mdx')
  process.exit(1)
}

convertMDXFile(mdxFile) 