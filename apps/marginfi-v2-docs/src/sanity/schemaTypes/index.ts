import { type SchemaTypeDefinition } from 'sanity'
import { docPage } from './docPage'
import { contentBlock } from './contentBlock'
import { note } from './note'
import { docTable } from './docTable'
import { code } from './code'
import { math } from './math'
import { propertyList } from './propertyList'
import { parameterList } from './parameterList'

export const schemaTypes = [
  docPage,
  contentBlock,
  note,
  docTable,
  code,
  math,
  propertyList,
  parameterList
]

export const schema: { types: SchemaTypeDefinition[] } = {
  types: schemaTypes
}
