import { type SchemaTypeDefinition } from 'sanity'
import { docPage } from './docPage'
import { section } from './section'
import { note } from './note'
import { mathBlock } from './mathBlock'
import { mathInline } from './mathInline'
import { imageWithCaption } from './imageWithCaption'
import { properties } from './properties'
import { faq } from './faq'
import { codeBlock } from './codeBlock'
import { methodList } from './methodList'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    docPage,
    section,
    note,
    mathBlock,
    mathInline,
    imageWithCaption,
    properties,
    methodList,
    faq,
    codeBlock,
  ],
}

export const schemaTypes = [
  docPage,
  section,
  note,
  mathBlock,
  mathInline,
  imageWithCaption,
  properties,
  methodList,
  faq,
  codeBlock
]
