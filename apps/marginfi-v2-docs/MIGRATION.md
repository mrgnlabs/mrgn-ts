# Migration from doc to sanity components

This document describes the migration of components from the `doc` folder to the `sanity` folder in the marginfi-v2-docs app.

## Overview

The goal of this migration was to reorganize the components and clean up the codebase. The main changes were:

1. Moving Sanity-specific components to the `apps/marginfi-v2-docs/src/components/sanity` folder
2. Creating proper TypeScript interfaces for Sanity schema types
3. Simplifying the component structure by directly exporting `SanityDocPage` as `DocPage`
4. Updating imports in page components

## Components

The following components were created or updated:

- `SanityDocPage.tsx`: The main component for rendering Sanity documents (exported as `DocPage`)
- `SanityMetadata.tsx`: A helper for creating metadata from Sanity documents
- `SanitySchemaTypes.ts`: TypeScript interfaces for Sanity schema types
- `index.ts`: Exports all Sanity components

## Usage

### Page Components

Page components should now import from `~/components/sanity`:

```tsx
import { DocPage, createMetadata } from '~/components/sanity'
import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageData()
  return createMetadata(page)
}

export default async function Page() {
  const page = await getPageData()
  return <DocPage page={page} />
}
```

### Schema Types

You can import the schema types from `~/components/sanity`:

```tsx
import { DocPage, ContentBlock } from '~/components/sanity'

function MyComponent({ page }: { page: DocPage }) {
  // Use the page data
}
```

## Scripts

The following scripts were created to help with the migration:

- `apps/marginfi-v2-docs/scripts/update-imports.ts`: Updates all page components to use the new imports
- `apps/marginfi-v2-docs/scripts/test-migration.tsx`: A simple test component to verify the migration works correctly

To run the update script:

```bash
cd mrgn-ts
npx ts-node apps/marginfi-v2-docs/scripts/update-imports.ts
```

## Benefits

The main benefits of this migration are:

1. **Better organization**: All Sanity-related components are now in the `components/sanity` folder
2. **Improved type safety**: TypeScript interfaces are now in a separate file
3. **Simplified imports**: Components can be imported from `~/components/sanity`
4. **Reduced duplication**: Removed duplicate code and interfaces
5. **Better documentation**: Added a README file with usage examples
6. **Simplified component structure**: Removed unnecessary wrapper components

The code is now more maintainable and easier to understand. The separation of concerns is clearer, with Sanity-specific components in their own folder. 