import { defineType, defineField } from 'sanity'

export const codeBlock = defineType({
  name: 'codeBlock',
  title: 'Code Block',
  type: 'object',
  fields: [
    defineField({
      name: 'code',
      title: 'Code',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      options: {
        list: [
          { title: 'JavaScript', value: 'javascript' },
          { title: 'TypeScript', value: 'typescript' },
          { title: 'Python', value: 'python' },
          { title: 'Rust', value: 'rust' },
          { title: 'Shell', value: 'shell' },
          { title: 'Bash', value: 'bash' },
          { title: 'NPM', value: 'npm' },
          { title: 'Yarn', value: 'yarn' },
          { title: 'JSON', value: 'json' },
          { title: 'Text', value: 'text' },
        ],
      },
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Optional title for the code block (e.g., "Using NPM", "Example")',
    }),
  ],
}) 