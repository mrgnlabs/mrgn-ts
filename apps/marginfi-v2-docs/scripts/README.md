# Sanity Content Scripts

This directory contains scripts for managing and fixing Sanity content in the marginfi-v2-docs project.

## Scripts Directory

This directory contains utility scripts for the marginfi-v2-docs project.

### Main Scripts

#### `sanity-content-manager.js`

A comprehensive script for managing Sanity content. This script consolidates multiple previous scripts into one tool with various commands:

```bash
# Fix section blocks in all documents
node scripts/sanity-content-manager.js --fix-section-blocks

# Convert MDX files to Sanity documents
node scripts/sanity-content-manager.js --convert-mdx

# Fix Use Cases page specifically
node scripts/sanity-content-manager.js --fix-use-cases

# Run all fixes
node scripts/sanity-content-manager.js --fix-all

# Remove a problematic block from a document
node scripts/sanity-content-manager.js --remove-block <docId> <blockKey>
```

This script handles:
- Converting MDX to Sanity blocks with proper structure
- Fixing section blocks and other content issues
- Cleaning up problematic blocks

#### `cleanup-scripts.js`

Utility script to clean up duplicate and now-consolidated scripts:

```bash
node scripts/cleanup-scripts.js
```

#### `fix-and-restart.js`

Utility script to fix content issues and restart the development server:

```bash
node scripts/fix-and-restart.js
```

### Other Utility Scripts

#### `kill-port.js`

Utility to kill a process running on a specific port:

```bash
node scripts/kill-port.js 3007
```

#### `list-doc-pages.js`

Lists all document pages in the Sanity dataset:

```bash
node scripts/list-doc-pages.js
```

### Migration Scripts

The following scripts are used for migrating content:

- `migrate.ts` - Main migration script
- `migrate-content.ts` - Migrates content
- `migrate-faq.ts` - Migrates FAQ content
- `migrate-metadata.ts` - Migrates metadata
- `update-imports.ts` - Updates imports
- `update-page-components.js` - Updates page components

### Development Process

1. Make changes to the content structure in Sanity Studio
2. If needed, run the appropriate script to fix content issues:
   ```bash
   node scripts/sanity-content-manager.js --fix-all
   ```
3. Restart the development server:
   ```bash
   pnpm dev
   ```

### Troubleshooting

If you encounter issues with content rendering:

1. Check the Sanity Studio to see if the content structure is correct
2. Run the fix script:
   ```bash
   node scripts/sanity-content-manager.js --fix-section-blocks
   ```
3. If specific pages have issues, you can target them:
   ```bash
   node scripts/sanity-content-manager.js --fix-use-cases
   ```
4. Restart the development server

## Best Practices

1. Always make a backup of your Sanity content before running scripts that modify data.
2. Test scripts on a development dataset before running on production.
3. Use the unified `fix-sanity-content.js` script for most content fixing needs.
4. After running content fixing scripts, restart your development server to see the changes. 