# Sanity Components

This directory contains components for rendering Sanity content in the marginfi-v2-docs project.

## Key Components

### `SanityPortableTextComponents.tsx`

This is the main component for rendering Sanity content using the PortableText renderer. It maps Sanity block types to React components for consistent styling with the rest of the site.

**Features:**
- Renders all standard block types (h1, h2, h3, p, blockquote, etc.)
- Handles custom block types (section, contentBlock, note, math, image, code, etc.)
- Provides fallbacks for unknown block types
- Generates unique IDs for headings for anchor links

**Usage:**
```tsx
import { PortableText } from '@portabletext/react';
import components from '~/components/sanity/SanityPortableTextComponents';

// In your component
<PortableText value={content} components={components} />
```

### `SanitySchemaTypes.ts`

Contains TypeScript interfaces for Sanity schema types used in the components.

### `SanityDocPage.tsx`

A wrapper component for rendering a complete doc page from Sanity.

**Usage:**
```tsx
import { SanityDocPage } from '~/components/sanity';

// In your page component
<SanityDocPage slug="your-page-slug" />
```

### `SanityToMdx.tsx`

Utility component for converting Sanity content to MDX-compatible format.

## Rendering Process

1. Content is fetched from Sanity using the Sanity client
2. The content is passed to the PortableText renderer with our custom components
3. The PortableText renderer maps each block to the appropriate component
4. The components render the content with consistent styling

## Block Types

The following block types are supported:

### Standard Blocks
- `h1`, `h2`, `h3`, `h4`, `h5`, `h6`: Headings
- `normal`: Regular paragraphs
- `lead`: Lead paragraphs (larger text)
- `blockquote`: Blockquotes

### Custom Blocks
- `section`: A section with a title and content
- `contentBlock`: A content block with a title and content
- `note`: A note block with highlighted content
- `math`: A math formula rendered with KaTeX
- `image`: An image with optional caption
- `code`: A code block with syntax highlighting
- `docTable`: A table for API documentation
- `properties`: A properties list
- `method`: A method documentation block

## Troubleshooting

### Raw JSON Appearing in Content

If you see raw JSON in your content instead of properly formatted content, it could be due to:

1. **Missing _key properties**: Run the `fix-sanity-content.js` script to ensure all blocks have proper _key properties.
2. **Unknown block types**: Check if the block type is supported in SanityPortableTextComponents.tsx.
3. **Incorrect content structure**: Ensure the content structure matches what the components expect.

### "Unknown block type" Errors

If you see "Unknown block type" errors in the console:

1. Check the console to see which block type is unknown
2. Add a handler for that block type in SanityPortableTextComponents.tsx
3. If it's a standard block with incorrect structure, run the `fix-sanity-content.js` script

## Adding New Block Types

To add support for a new block type:

1. Add the type definition to SanitySchemaTypes.ts
2. Add a handler in the `types` object in SanityPortableTextComponents.tsx
3. Test the rendering with content that uses the new block type 