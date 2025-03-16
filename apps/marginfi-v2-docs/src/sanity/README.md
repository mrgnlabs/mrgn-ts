# marginfi Documentation - Sanity Setup

This directory contains the Sanity.io configuration and schema definitions for the marginfi documentation site. The setup enables a structured content management system for API documentation, method references, and technical guides.

## Directory Structure

```
apps/marginfi-v2-docs/src/sanity/
├── lib/           # Utility functions and Sanity client configuration
├── schemaTypes/   # Content type definitions
└── schemas.ts     # Schema registration
```

## Content Types

### Main Components

1. **DocPage**
   - Main container for documentation pages
   - Contains sections, notes, code blocks, and various documentation components
   - Properties:
     - `title`: Page title
     - `leadText`: Introduction text
     - `content`: Array of content blocks

2. **Section**
   - Represents a major section in the documentation
   - Properties:
     - `title`: Section heading
     - `label`: Optional subheading/tag
     - `content`: Rich text content

### Documentation Components

1. **DocTable**
   - Used for displaying method, constant, or error tables
   - Automatically adjusts columns based on content type
   - Types:
     - Methods: name, parameters, result type, description
     - Constants: name, description
     - Errors: name, description, suggestion

2. **MethodProperties**
   - Detailed method documentation
   - Properties:
     - `name`: Method name
     - `description`: Method description
     - `parameters`: Array of parameter objects
     - `returns`: Return type and description

3. **SimpleProperties**
   - For documenting simple key-value properties
   - Properties:
     - `name`: Property name
     - `type`: Data type
     - `description`: Property description
     - `optional`: Boolean flag

4. **ObjectProperties**
   - For documenting complex object structures
   - Properties:
     - `name`: Object name
     - `description`: Object description
     - `properties`: Array of property objects

### Special Components

1. **Note**
   - For important callouts or additional information
   - Styled with a distinctive background and icon

2. **CodeBlock**
   - For code examples and snippets
   - Supports syntax highlighting
   - Properties:
     - `code`: The code content
     - `language`: Programming language
     - `title`: Optional title

3. **MathBlock**
   - For mathematical formulas
   - Supports both inline and block math

## Component Usage

### Method Documentation Example

```javascript
{
  _type: 'methodProperties',
  title: 'API Methods',
  items: [
    {
      name: 'makeSetupIx',
      description: [...],
      parameters: [
        {
          name: 'encoded',
          type: 'Buffer',
          description: [...],
          optional: false
        }
      ],
      returns: {
        type: 'TransactionInstruction',
        description: [...]
      }
    }
  ]
}
```

### Error Table Example

```javascript
{
  _type: 'docTable',
  title: 'Error Codes',
  items: [
    {
      name: 'InvalidAccount',
      description: [...],
      suggestion: [...]
    }
  ]
}
```

## Styling

- Components use Tailwind CSS for styling
- Dark mode optimized with custom color scheme
- Consistent typography using custom font stack
- Special styling for code blocks and technical content

## Best Practices

1. **Content Organization**
   - Use sections to break down complex topics
   - Include descriptive titles and labels
   - Maintain consistent heading hierarchy

2. **Code Documentation**
   - Always include parameter types
   - Provide clear return type information
   - Add examples for complex methods

3. **Error Documentation**
   - Include clear error descriptions
   - Provide actionable suggestions
   - Use consistent error naming

4. **Component Selection**
   - Use `DocTable` for method/constant/error lists
   - Use `MethodProperties` for detailed API documentation
   - Use `ObjectProperties` for complex data structures
   - Use `SimpleProperties` for configuration options

## Development Workflow

1. **Adding New Content Types**
   - Create schema in `apps/marginfi-v2-docs/src/sanity/schemaTypes/`
   - Register in `apps/marginfi-v2-docs/src/sanity/schemas.ts`
   - Add corresponding React component in `apps/marginfi-v2-docs/src/components/sanity/`

2. **Modifying Existing Types**
   - Update schema definition
   - Check for component dependencies
   - Test with existing content

3. **Content Migration**
   - Use Sanity's migration tools for schema changes
   - Test migrations in development first
   - Back up content before major changes

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

3. Access the Sanity Studio:
   ```
   http://localhost:3333
   ```

## Additional Resources

- [Sanity Documentation](https://www.sanity.io/docs)
- [GROQ Query Language](https://www.sanity.io/docs/groq)
- [Portable Text](https://www.portabletext.org/) 