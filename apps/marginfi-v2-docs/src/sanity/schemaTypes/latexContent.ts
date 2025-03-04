import { defineType, defineField } from 'sanity'
import { LatexInput } from '~/components/sanity/LatexInput'

export const latexContent = defineType({
  name: 'latexContent',
  title: 'LaTeX Content',
  type: 'object',
  fields: [
    defineField({
      name: 'content',
      title: 'Content',
      type: 'text',
      components: {
        input: LatexInput
      }
    })
  ],
  preview: {
    select: {
      content: 'content'
    },
    prepare({ content }) {
      return {
        title: content ? content.substring(0, 50) + '...' : 'LaTeX Content'
      }
    }
  }
}) 