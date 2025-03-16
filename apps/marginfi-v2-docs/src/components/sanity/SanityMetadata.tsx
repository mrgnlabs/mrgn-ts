import { Metadata } from 'next'

export interface SanityPageMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
}

export function createMetadata(page: { metadata?: SanityPageMetadata, title?: string }): Metadata {
  return {
    title: page?.metadata?.title || page?.title || '',
    description: page?.metadata?.description || '',
    keywords: page?.metadata?.keywords || [],
  }
} 