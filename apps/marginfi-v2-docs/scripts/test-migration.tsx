/**
 * This is a simple test component to verify the migration works correctly.
 * 
 * It imports all the components from the sanity folder and renders them.
 * 
 * This is not meant to be run, just to verify that the imports work correctly.
 * Path: apps/marginfi-v2-docs/scripts/test-migration.tsx
 */

import React from 'react';
import { 
  DocPage, 
  SanityDocPage, 
  createMetadata,
  BlockEditor,
  BulkMethodInput,
  BulkPropertiesInput,
  DetailedMethodInput,
  DocListInput,
  LatexInput,
  MethodDocumentationInput
} from '~/components/sanity';

// Sample data
const samplePage = {
  title: 'Test Page',
  leadText: [{ _type: 'block', children: [{ _type: 'span', text: 'This is a test page' }] }],
  content: []
};

// Test component
export function TestComponent() {
  return (
    <div>
      <h1>Test Component</h1>
      <DocPage page={samplePage} />
    </div>
  );
}

// Test metadata
export function testMetadata() {
  return createMetadata(samplePage);
}

// This is just to verify that all imports work correctly
// Note: This component is not meant to be run, just to verify that the imports work correctly
// The props are simplified for demonstration purposes
export function TestAllComponents() {
  // Mock props for Sanity input components
  const mockProps = {
    onChange: () => {},
    value: {},
  };

  return (
    <div>
      <SanityDocPage page={samplePage} />
      <BlockEditor value={[]} onChange={() => {}} />
      {/* 
        The following components are commented out because they require specific props
        that are only available in the Sanity Studio context.
        
        <BulkMethodInput {...mockProps} />
        <BulkPropertiesInput {...mockProps} />
        <DetailedMethodInput {...mockProps} />
        <DocListInput {...mockProps} schemaType={{}} />
        <LatexInput value="" onChange={() => {}} />
        <MethodDocumentationInput {...mockProps} type={{}} />
      */}
    </div>
  );
} 