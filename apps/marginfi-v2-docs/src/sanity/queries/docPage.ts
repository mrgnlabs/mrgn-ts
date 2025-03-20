export const getDocPageBySlug = /* groq */ `
  *[_type == "docPage" && slug.current == $slug][0]{
    title,
    description,
    leadText,
    metadata {
      title,
      description
    },
    content[] {
      _type,
      _key,
      _type == "code" => {
        title,
        tag,
        label,
        code,
        language,
        filename,
        highlightedLines
      },
      _type == "note" => {
        content[] {
          ...,
          _type == "image" => {
            "url": asset->url,
            "dimensions": asset->metadata.dimensions
          }
        }
      },
      _type == "section" => {
        title,
        tag,
        label,
        content[] {
          ...,
          _type == "image" => {
            "url": asset->url,
            "dimensions": asset->metadata.dimensions
          }
        }
      },
      _type == "contentBlock" => {
        title,
        tag,
        label,
        content[] {
          ...,
          _type == "image" => {
            "url": asset->url,
            "dimensions": asset->metadata.dimensions
          }
        }
      },
      _type == "block" => {
        style,
        children,
        listItem,
        markDefs
      },
      _type == "math" => {
        formula
      },
      _type == "image" => {
        asset->{
          url,
          metadata {
            dimensions
          }
        },
        alt,
        caption
      },
      _type == "docTable" => {
        title,
        items[] {
          name,
          type,
          parametersString,
          resultType,
          description[] {
            ...,
            _type == "image" => {
              "url": asset->url,
              "dimensions": asset->metadata.dimensions
            }
          }
        }
      },
      _type == "properties" => {
        title,
        items[] {
          name,
          type,
          description[] {
            ...,
            _type == "image" => {
              "url": asset->url,
              "dimensions": asset->metadata.dimensions
            }
          }
        }
      },
      _type == "propertyList" => {
        title,
        properties[] {
          _key,
          name,
          type,
          description
        }
      },
      _type == "table" => {
        title,
        items[] {
          _key,
          name,
          parametersString,
          resultType,
          description
        },
        rows,
        headerRow
      },
      _type == "method" => {
        title,
        format,
        items[] {
          name,
          parametersString,
          resultType,
          description[] {
            ...,
            _type == "image" => {
              "url": asset->url,
              "dimensions": asset->metadata.dimensions
            }
          },
          parameters[] {
            name,
            type,
            description[] {
              ...,
              _type == "image" => {
                "url": asset->url,
                "dimensions": asset->metadata.dimensions
              }
            },
            optional
          }
        }
      }
    }
  }
` 