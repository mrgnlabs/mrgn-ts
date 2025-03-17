# marginfi Documentation Maintenance Scripts

This directory contains scripts for maintaining and fixing the marginfi documentation site.

## Available Scripts

### `fix-use-cases.js`

Fixes the content structure of the "Use Cases" page in the Sanity database.

```bash
cd apps/marginfi-v2-docs && node scripts/fix-use-cases.js
```

### `fix-all-pages.js`

Fixes the content structure of all docPage documents in the Sanity database.

```bash
cd apps/marginfi-v2-docs && node scripts/fix-all-pages.js
```

### `list-doc-pages.js`

Lists all docPage documents in the Sanity database, including their IDs, titles, and slugs.

```bash
cd apps/marginfi-v2-docs && node scripts/list-doc-pages.js
```

### `convert-mdx-to-sanity.js`

Converts MDX pages from the `_dep` directories to Sanity documents. This script is useful for migrating content from the old MDX-based documentation to the new Sanity-based system.

```bash
cd apps/marginfi-v2-docs && node scripts/convert-mdx-to-sanity.js
```

### `update-page-components.js`

Updates all page components to use the Sanity components. This script ensures that all page components are using the Sanity client and DocPage component.

```bash
cd apps/marginfi-v2-docs && node scripts/update-page-components.js
```

### `kill-port.js`

Kills any process running on port 3007. This script is useful for resolving the EADDRINUSE error when starting the development server.

```bash
cd apps/marginfi-v2-docs && node scripts/kill-port.js
```

## Common Issues and Solutions

### Missing `_key` Properties

Some Sanity documents may have content blocks with missing `_key` properties, which can cause rendering errors. The `fix-use-cases.js` and `fix-all-pages.js` scripts address this issue by ensuring that all content blocks, children, and content items have valid `_key` properties.

### "Unknown block type" Errors

If you encounter "Unknown block type" errors in the console, it may be due to content blocks with incorrect structure or missing handlers in the rendering components. The `fix-all-pages.js` script helps ensure that all content blocks have the correct structure.

### Content Not Rendering Correctly

If content is not rendering correctly after migration from MDX to Sanity, you can use the `convert-mdx-to-sanity.js` script to re-convert the MDX content to Sanity format. This script handles special cases like the "Use Cases" page and ensures that the content structure matches what the rendering components expect.

### EADDRINUSE Error

If you encounter an EADDRINUSE error when starting the development server, it means that port 3007 is already in use. You can use the `kill-port.js` script to kill any process running on port 3007.

```bash
cd apps/marginfi-v2-docs && node scripts/kill-port.js
```

### Schema Errors

If you encounter schema errors, make sure that:

1. The schema definitions in the Sanity Studio match the expected structure in the rendering components.
2. All required fields are present in the content.
3. The content structure follows the expected format.

## Environment Setup

These scripts require the following environment variables to be set in the `.env.local` file:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_WRITE_TOKEN=your_write_token
```

Make sure these variables are correctly set before running the scripts.

## Adding New Content Types

When adding new content types to the Sanity schema, make sure to:

1. Define the schema in the appropriate schema file.
2. Update the schema index to include the new schema.
3. Add appropriate handlers in the rendering components to handle the new content type.
4. Test the rendering of the new content type to ensure it displays correctly.

## Content Migration Process

When migrating content from MDX to Sanity:

1. Make sure all MDX files are in the correct `_dep` directories.
2. Run the `convert-mdx-to-sanity.js` script to convert the content.
3. Run the `update-page-components.js` script to update all page components to use the Sanity components.
4. Check the rendering of the converted content to ensure it looks correct.
5. If there are any issues, fix the content structure using the `fix-all-pages.js` script.
6. For special cases like the "Use Cases" page, you may need to manually adjust the content structure.

## Troubleshooting

If you encounter issues with the scripts:

1. Check that the environment variables are correctly set.
2. Verify that the Sanity API tokens have the necessary permissions.
3. Check the console output for error messages that may provide more information about the issue.
4. Ensure that the content structure in the Sanity database matches the expected structure in the rendering components.
5. If you encounter an EADDRINUSE error, use the `kill-port.js` script to kill any process running on port 3007. 