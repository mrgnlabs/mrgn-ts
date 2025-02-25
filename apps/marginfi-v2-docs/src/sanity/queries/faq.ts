export const getFaqQuery = /* groq */ `
  *[_type == "faq"][0]{
    title,
    description,
    metadata {
      title,
      description
    },
    questions[]{
      _key,
      question,
      answer,
      tag,
      label
    }
  }
`