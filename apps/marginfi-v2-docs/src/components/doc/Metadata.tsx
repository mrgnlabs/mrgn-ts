import { Metadata } from 'next'

export function createMetadata(page: any): Metadata {
  return {
    title: page?.metadata?.title,
    description: page?.metadata?.description,
  }
} 