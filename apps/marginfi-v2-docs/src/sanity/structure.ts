import { type StructureResolver, type DefaultDocumentNodeResolver } from 'sanity/desk'
import { type StructureBuilder } from 'sanity/desk'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S: StructureBuilder) => {
  return S.list()
    .title('Content')
    .items([
      // Documentation pages
      S.documentTypeListItem('docPage')
        .title('Documentation Pages')
    ])
}
