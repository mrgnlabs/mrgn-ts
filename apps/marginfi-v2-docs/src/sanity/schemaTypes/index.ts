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
import { docTable } from './docTable'
import { docList } from './docList'
import { methodProperties } from './methodProperties'
import { simpleProperties } from './simpleProperties'
import { objectProperties } from './objectProperties'
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
    docTable,
    docList,
    methodProperties,
    simpleProperties,
    objectProperties,
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
  docTable,
  docList,
  methodProperties,
  simpleProperties,
  objectProperties,
  blockContentType
]
