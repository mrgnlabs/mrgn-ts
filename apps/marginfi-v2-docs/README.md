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

- Migrated components from `doc` folder to `sanity` folder
- Added new content types for method documentation
- Improved rendering of complex content blocks
- Fixed content structure issues with maintenance scripts