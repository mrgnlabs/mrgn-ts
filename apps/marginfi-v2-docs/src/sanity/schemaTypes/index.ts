import { type SchemaTypeDefinition } from 'sanity'
import { docPage } from './docPage'
import { section } from './section'
import { note } from './note'
import { mathBlock } from './mathBlock'
import { imageWithCaption } from './imageWithCaption'
import { properties } from './properties'
import { faq } from './faq'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    docPage,
    section,
    note,
    mathBlock,
    imageWithCaption,
    properties,
    faq,
  ],
}

export const schemaTypes = [docPage, section, note, mathBlock, imageWithCaption, properties, faq]
