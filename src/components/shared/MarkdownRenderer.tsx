'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Simple markdown-like rendering for basic formatting
  const renderContent = () => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Handle headers
      if (line.startsWith('# ')) {
        return (
          <h1 key={index} className="text-2xl font-bold mb-2">
            {line.substring(2)}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-xl font-semibold mb-2">
            {line.substring(3)}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={index} className="text-lg font-medium mb-1">
            {line.substring(4)}
          </h3>
        );
      }
      // Handle bold
      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Handle italic
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Handle line breaks
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: processedLine }} />;
    });
  };

  return <div>{renderContent()}</div>;
}
