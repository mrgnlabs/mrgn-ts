# Sanity Components

This directory contains components for working with Sanity CMS content in the marginfi documentation site.

## Core Components

- `SanityDocPage`: The main component for rendering a Sanity document page (exported as `DocPage`).
- `SanityMetadata`: Helper for creating metadata from Sanity document pages.
- `SanitySchemaTypes`: TypeScript interfaces for Sanity schema types.

## Input Components

These components are used in the Sanity Studio for custom input fields and are located in the `input/` directory:

- `BlockEditor`: A simple editor for Portable Text blocks.
- `BulkMethodInput`: Input for bulk adding methods.
- `BulkPropertiesInput`: Input for bulk adding properties.
- `DetailedMethodInput`: Input for detailed method documentation.
- `DocListInput`: Input for documentation lists.
- `LatexInput`: Input for LaTeX formulas.
- `MethodDocumentationInput`: Input for method documentation.

## Usage

### Rendering a Document Page

```tsx
import { DocPage } from '~/components/sanity'

export default function Page({ page }) {
  return <DocPage page={page} />
}
```

### Creating Metadata

```tsx
import { createMetadata } from '~/components/sanity'

export function generateMetadata({ params }) {
  const page = // fetch page data
  return createMetadata(page)
}
```

### Using Schema Types

```tsx
import { DocPage, ContentBlock } from '~/components/sanity'

function MyComponent({ page }: { page: DocPage }) {
  // Use the page data
}
```

## File Structure

The components are organized in the following structure:

```
apps/marginfi-v2-docs/src/components/sanity/
├── SanityDocPage.tsx       # Main document page renderer (exported as DocPage)
├── SanityMetadata.tsx      # Metadata helper
├── SanitySchemaTypes.ts    # TypeScript interfaces
├── index.ts                # Exports all components
└── input/                  # Input components for Sanity Studio
    ├── BlockEditor.tsx     # Simple editor for Portable Text blocks
    ├── BulkMethodInput.tsx # Input for bulk adding methods
    ├── BulkPropertiesInput.tsx # Input for bulk adding properties
    ├── DetailedMethodInput.tsx # Input for detailed method documentation
    ├── DocListInput.tsx    # Input for documentation lists
    ├── LatexInput.tsx      # Input for LaTeX formulas
    ├── MethodDocumentationInput.tsx # Input for method documentation
    └── index.ts            # Exports all input components
```

## Related Files

- Schema definitions: `apps/marginfi-v2-docs/src/sanity/schemaTypes/`
- Sanity client: `apps/marginfi-v2-docs/src/sanity/client.ts`
- Maintenance scripts: `apps/marginfi-v2-docs/scripts/` 