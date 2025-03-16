import { defineType } from 'sanity'

export const code = defineType({
  name: 'code',
  title: 'Code',
  type: 'object',
  fields: [
    {
      name: 'code',
      title: 'Code',
      type: 'text',
      validation: Rule => Rule.required()
    },
    {
      name: 'language',
      title: 'Language',
      type: 'string',
      options: {
        list: [
          { title: 'JavaScript', value: 'javascript' },
          { title: 'TypeScript', value: 'typescript' },
          { title: 'Python', value: 'python' },
          { title: 'Rust', value: 'rust' },
          { title: 'JSON', value: 'json' },
          { title: 'Bash', value: 'bash' },
          { title: 'Shell', value: 'shell' },
          { title: 'Plain Text', value: 'text' }
        ]
      }
    },
    {
      name: 'filename',
      title: 'Filename',
      type: 'string'
    },
    {
      name: 'highlightedLines',
      title: 'Highlighted Lines',
      type: 'string',
      description: 'Comma-separated line numbers to highlight (e.g., "1,3-5,7")'
    }
  ],
  preview: {
    select: {
      language: 'language',
      code: 'code',
      filename: 'filename'
    },
    prepare({ language, code, filename }) {
      return {
        title: filename || language || 'Code Block',
        subtitle: code ? code.slice(0, 50) + '...' : 'Empty code block'
      }
    }
  }
}) 