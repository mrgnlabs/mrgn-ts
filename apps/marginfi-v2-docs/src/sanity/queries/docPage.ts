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
      title,
      tag,
      label,
      content[] {
        ...,
        _type == "image" => {
          "url": asset->url,
          "dimensions": asset->metadata.dimensions
        }
      },
      formula,
      image {
        asset->{
          url,
          metadata {
            dimensions
          }
        },
      },
      alt,
      caption,
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
    }
  }
` 