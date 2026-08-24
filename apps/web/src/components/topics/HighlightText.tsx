import React from 'react';

export interface HighlightTextProps {
  text: string;
  searchQuery?: string;
  style?: React.CSSProperties;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  searchQuery,
  style,
}) => {
  if (!searchQuery || !searchQuery.trim()) {
    return <span style={style}>{text}</span>;
  }

  const query = searchQuery.trim();
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span style={style}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        if (isMatch) {
          return (
            <mark
              key={index}
              style={{
                backgroundColor: '#F5DD77',
                color: '#0F172A',
                padding: '0 2px',
                borderRadius: 2,
                fontStyle: 'inherit',
                fontWeight: 'inherit',
              }}
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
