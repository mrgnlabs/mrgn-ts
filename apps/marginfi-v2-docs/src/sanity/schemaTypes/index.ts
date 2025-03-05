import { type SchemaTypeDefinition } from 'sanity'
import { docPage } from './docPage'
import { section } from './section'
import { note } from './note'
import { mathBlock } from './mathBlock'
import { mathInline } from './mathInline'
import { imageWithCaption } from './imageWithCaption'
import { faq } from './faq'
import { codeBlock } from './codeBlock'
import { methodList } from './methodList'
import { detailedMethod } from './detailedMethod'
import { methodTable } from './methodTable'
import { blockContentType } from './blockContentType'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    docPage,
    section,
    note,
    mathBlock,
    mathInline,
    imageWithCaption,
    methodList,
    faq,
    codeBlock,
    detailedMethod,
    methodTable,
    blockContentType
  ],
}

export const schemaTypes = [
  docPage,
  section,
  note,
  mathBlock,
  mathInline,
  imageWithCaption,
  methodList,
  faq,
  codeBlock,
  detailedMethod,
  methodTable,
  blockContentType
]
