# marginfi Documentation Site

This is the documentation site for marginfi, built with Next.js and Sanity CMS.

## Project Structure

```
apps/marginfi-v2-docs/
├── public/              # Static assets
├── scripts/             # Maintenance and migration scripts
├── src/
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   │   ├── doc/         # Legacy documentation components
│   │   └── sanity/      # New Sanity-specific components
│   ├── lib/             # Utility functions
│   └── sanity/          # Sanity CMS configuration
│       └── schemaTypes/ # Content type definitions
└── MIGRATION.md         # Documentation for the component migration
```

## Getting Started

1. Install dependencies:
   ```bash
   cd mrgn-ts
   pnpm install
   ```

2. Start the development server:
   ```bash
   cd mrgn-ts
   pnpm dev
   ```

3. Access the site:
   ```
   http://localhost:3000
   ```

4. Access the Sanity Studio:
   ```
   http://localhost:3000/studio
   ```

## Fixing Content Rendering Issues

If you encounter issues with Sanity content rendering (raw JSON appearing instead of formatted content), use the following scripts:

1. Fix all content and restart the server in one step:
   ```bash
   node scripts/fix-and-restart.js
   ```

2. Or fix content only:
   ```bash
   node scripts/fix-sanity-content.js
   ```

These scripts ensure all content blocks have proper structure and _key properties for correct rendering.

## Documentation

- [MIGRATION.md](./MIGRATION.md) - Information about the component migration
- [scripts/README.md](./scripts/README.md) - Documentation for maintenance scripts
- [src/components/sanity/README.md](./src/components/sanity/README.md) - Information about Sanity components
- [src/sanity/README.md](./src/sanity/README.md) - Information about Sanity CMS setup

## Key Features

- **Structured Content**: Well-defined schema for API documentation
- **Interactive Examples**: Code blocks with syntax highlighting
- **Responsive Design**: Mobile-friendly layout
- **Dark Mode**: Optimized for both light and dark themes
- **Search**: Full-text search across all documentation

## Recent Updates

- Consolidated multiple content fixing scripts into a single unified script
- Improved SanityPortableTextComponents for better handling of different block types
- Added better error handling and fallbacks for unknown content types
- Created comprehensive documentation for Sanity components and scripts
- Added helper scripts for fixing content and restarting the development server

## Troubleshooting

If you encounter issues with content rendering:

1. Check the browser console for "Unknown block type" errors
2. Run `node scripts/fix-and-restart.js` to fix content structure and restart the server
3. If issues persist, check the Sanity schema definitions and ensure they match the expected structure in the rendering components

For more detailed troubleshooting, see [src/components/sanity/README.md](./src/components/sanity/README.md).

## Scripts

The `scripts` directory contains utility scripts for managing Sanity content:

### Content Management

- `sanity-content-manager.js` - A comprehensive script for managing Sanity content:
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

- `fix-and-restart.js` - Utility script to fix content issues and restart the development server:
  ```bash
  node scripts/fix-and-restart.js
  ```

See the [scripts README](scripts/README.md) for more details.