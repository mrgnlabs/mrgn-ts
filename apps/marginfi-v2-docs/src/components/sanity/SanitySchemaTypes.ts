/**
 * This file exports all the Sanity schema types for use in the components.
 */

// Core content type interfaces
export interface SanityImage {
  asset: {
    url: string;
    _ref?: string;
  };
}

export interface ImageWithCaption {
  _type: 'image';
  asset: {
    _ref: string;
  };
  alt?: string;
}

export interface MathBlock {
  _type: 'math';
  formula: string;
}

export interface NoteBlock {
  _type: 'note';
  content: any[];
}

export interface CodeBlock {
  _type: 'code';
  code: string;
  language?: string;
  filename?: string;
  highlightedLines?: string;
}

export interface DocTableBlock {
  _type: 'docTable';
  title?: string;
  tableType?: string;
  items?: Array<{
    name?: string;
    parametersString?: string;
    resultType?: string;
    description?: any[];
    suggestion?: any[];
  }>;
}

export interface Method {
  _type: 'method';
  format: 'detailed' | 'table' | 'list';
  title?: string;
  items: Array<{
    name: string;
    description?: any[];
    parameters?: Array<{
      name: string;
      type: string;
      description: any[];
      optional?: boolean;
    }>;
    parametersString?: string;
    resultType?: string;
    returns?: any[];
    notes?: any[];
  }>;
}

export interface ContentBlock {
  _type: 'contentBlock';
  _key: string;
  title?: string;
  content: any[];
  type?: string;
  tag?: string;
  label?: string;
}

export interface Section {
  _type: 'section';
  _key: string;
  title?: string;
  content: any[];
  tag?: string;
  label?: string;
}

export interface Block {
  _type: 'block';
  _key: string;
  style: string;
  children: Array<{
    _type: string;
    text: string;
    marks?: string[];
  }>;
  markDefs?: any[];
}

export interface SectionInfo {
  id: string;
  title: string;
  tag?: string;
}

export interface DocPage {
  title: string;
  leadText?: any[];
  content?: Array<Block | ContentBlock | Section | NoteBlock | MathBlock | ImageWithCaption | Method | CodeBlock | DocTableBlock>;
} 