
import React, { useMemo } from 'react';
import { marked } from 'marked';

export default function MarkdownRenderer({ markdownText, className = '' }) {
    const html = useMemo(() => marked.parse(markdownText || ''), [markdownText]);
    // Note: prose-invert is a Tailwind typography className that sets dark-mode styles
    // We can't use CSS variables directly in here easily, so we rely on prose-invert's defaults which are good enough.
    // For more control, we would need a more complex setup.
    return React.createElement('div', {
        className: `prose prose-invert prose-sm max-w-none prose-p:text-text-primary prose-ul:text-text-primary prose-ol:text-text-primary prose-blockquote:text-text-primary prose-blockquote:border-accent-primary prose-strong:text-text-primary prose-a:text-accent-primary prose-headings:text-text-primary ${className}`,
        dangerouslySetInnerHTML: { __html: html }
    });
};