import React from "react";

interface WikiPageProps {
  children: React.ReactNode;
}

export const WikiPage: React.FC<WikiPageProps> = ({ children }) => {
  return (
    <div
      className="max-w-5xl w-full mx-auto py-8 px-4 md:px-8 prose prose-lg bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded-[var(--radius)] shadow overflow-x-hidden"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}
    >
      {children}
    </div>
  );
}; 