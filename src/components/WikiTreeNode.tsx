import React from "react";

interface WikiTreeNodeProps {
  label: string;
  level?: number;
  active?: boolean;
  onClick?: () => void;
  hasChildren?: boolean;
  isOpen?: boolean;
  children?: React.ReactNode;
}

export const WikiTreeNode: React.FC<WikiTreeNodeProps> = ({
  label,
  level = 1,
  active = false,
  onClick,
  hasChildren = false,
  isOpen = false,
  children,
}) => {
  return (
    <div
      className={`
        kb-nav-item flex items-center rounded-[var(--radius)] cursor-pointer select-none
        transition-all duration-200 focus:outline-none focus:ring-0 active:bg-[hsl(var(--wiki-node-hover))]
        pr-3 py-2
        text-sm
        ${active ? "bg-[hsl(var(--wiki-active))] font-semibold" : ""}
      `}
      style={{
        paddingLeft: `${level === 1 ? 0 : (level - 1) * 12 + 8}px`,
        borderLeft: active ? "3px solid hsl(var(--primary))" : "3px solid transparent",
      }}
      onClick={onClick}
    >
      {/* Arrow indicator */}
      {hasChildren && (
        <span className="mr-1 w-4 h-4 flex items-center justify-center text-[hsl(var(--foreground))]/60">
          {isOpen ? (
            <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 6l5 5 5-5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 5l5 5-5 5" />
            </svg>
          )}
        </span>
      )}
      <span className="truncate flex-1">{label}</span>
      {children}
    </div>
  );
}; 