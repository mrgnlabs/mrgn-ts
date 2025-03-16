# marginfi Documentation Maintenance Scripts

This directory contains scripts for maintaining and migrating content in the marginfi documentation site.

## Prerequisites

Before running any scripts, make sure you have the following environment variables set in your `.env.local` file:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=your-dataset
SANITY_API_WRITE_TOKEN=your-write-token
```

## Available Scripts

### Content Structure Fixing

- **fix-all-pages.ts**: Fixes the content structure for all documentation pages
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/fix-all-pages.ts
  ```

- **fix-faq.ts**: Fixes the content structure specifically for the FAQ page
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/fix-faq.ts
  ```

- **fix-use-cases.ts**: Fixes the content structure specifically for the Use Cases page
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/fix-use-cases.ts
  ```

### Content Migration

- **migrate-content.ts**: Migrates content from old schema to new schema
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/migrate-content.ts
  ```

- **migrate-faq.ts**: Migrates FAQ content from old schema to new schema
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/migrate-faq.ts
  ```

- **migrate.ts**: Migrates method-related content to the new method format
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/migrate.ts
  ```

- **migrate-metadata.ts**: Migrates metadata fields
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/migrate-metadata.ts
  ```

### Content Cleanup

- **clean-duplicates.ts**: Removes duplicate content
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/clean-duplicates.ts
  ```

- **flatten-content.ts**: Flattens nested content structures
  ```
  cd mrgn-ts
  npx ts-node apps/marginfi-v2-docs/scripts/flatten-content.ts
  ```

## Common Issues and Solutions

### Content Not Rendering

If content is not rendering properly on the site but appears correctly in Sanity Studio, run the fix-all-pages script:

```
cd mrgn-ts
npx ts-node apps/marginfi-v2-docs/scripts/fix-all-pages.ts
```

This script ensures that all content blocks have the proper structure required by the PortableText renderer.

### "Unknown block type" Errors

If you see "Unknown block type 'block'" errors in the console, it means the PortableText renderer doesn't know how to handle basic block types. This has been fixed in the DocPage component by:

1. Manually rendering block content instead of relying on the PortableText renderer for basic blocks
2. Using PortableText only for complex block types

If you still encounter these errors, check that:
1. The DocPage component is correctly handling all block types
2. The content structure is valid (run fix-all-pages.ts)
3. All block types have corresponding renderers in the components object

### Schema Errors

If you encounter schema errors in Sanity Studio, check that:

1. All referenced types are properly defined in the schema
2. All content blocks have the required fields and proper structure
3. The schema types are properly exported in `apps/marginfi-v2-docs/src/sanity/schemaTypes/index.ts`

## Adding New Content Types

When adding new content types:

1. Create a new schema file in `apps/marginfi-v2-docs/src/sanity/schemaTypes/`
2. Add the type to `apps/marginfi-v2-docs/src/sanity/schemaTypes/index.ts`
3. Add a renderer for the type in `apps/marginfi-v2-docs/src/components/sanity/SanityDocPage.tsx`
4. Update the `DocPage` interface to include the new type
5. Update the rendering logic in the SanityDocPage component to handle the new type 