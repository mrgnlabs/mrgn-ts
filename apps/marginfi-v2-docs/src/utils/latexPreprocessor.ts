// Regex patterns for inline and block math
const INLINE_MATH_REGEX = /\$([^\$\n]+?)\$/g;
const BLOCK_MATH_REGEX = /\$\$([^\$]+?)\$\$/g;

export function preprocessLatex(text: string): any[] {
  const blocks: any[] = [];
  let lastIndex = 0;

  // Handle block math first
  text.replace(BLOCK_MATH_REGEX, (match, formula, offset) => {
    // Add text before the math block
    if (offset > lastIndex) {
      blocks.push({
        _type: 'block',
        children: [{ _type: 'span', text: text.slice(lastIndex, offset) }],
        markDefs: [],
        style: 'normal',
      });
    }

    // Add the math block
    blocks.push({
      _type: 'mathBlock',
      formula: formula.trim(),
    });

    lastIndex = offset + match.length;
    return match;
  });

  // Handle remaining text with inline math
  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    const children: any[] = [];
    let lastInlineIndex = 0;

    remainingText.replace(INLINE_MATH_REGEX, (match, formula, offset) => {
      // Add text before the inline math
      if (offset > lastInlineIndex) {
        children.push({
          _type: 'span',
          text: remainingText.slice(lastInlineIndex, offset),
        });
      }

      // Add the inline math
      children.push({
        _type: 'span',
        text: formula.trim(),
        marks: ['mathInline'],
      });

      lastInlineIndex = offset + match.length;
      return match;
    });

    // Add any remaining text
    if (lastInlineIndex < remainingText.length) {
      children.push({
        _type: 'span',
        text: remainingText.slice(lastInlineIndex),
      });
    }

    if (children.length > 0) {
      blocks.push({
        _type: 'block',
        children,
        markDefs: [],
        style: 'normal',
      });
    }
  }

  return blocks;
} 