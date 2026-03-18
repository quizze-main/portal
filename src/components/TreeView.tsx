import React, { useState, useCallback } from "react";

export interface TreeNode {
  id: string;
  label: string;
  path?: string[];
  children?: TreeNode[];
}

interface TreeViewProps {
  data: TreeNode[];
  onSelect?: (node: TreeNode) => void;
}

/**
 * Рекурсивное дерево навигации.
 *  – Все узлы по умолчанию закрыты.
 *  – click по узлу-родителю раскрывает / сворачивает только его ветку,
 *    не влияя на остальные.
 *  – click по листу вызывает onSelect (если передан).
 */
export const TreeView: React.FC<TreeViewProps> = ({ data, onSelect }) => {
  // Храним открытые id в Set
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const renderNodes = (nodes: TreeNode[], level = 0) => {
    return nodes.map(node => {
      const hasChildren = !!(node.children && node.children.length);
      const isOpen = openIds.has(node.id);
      return (
        <div key={node.id}>
          <div
            style={{
              paddingLeft: level === 0 ? 0 : 20 + (level - 1) * 20,
              display: "flex",
              alignItems: "center",
              cursor: hasChildren ? "pointer" : "default",
              userSelect: "none",
            }}
            onClick={() => {
              if (hasChildren) {
                toggle(node.id);
              } else {
                onSelect?.(node);
              }
            }}
          >
            {hasChildren && (
              <span style={{ width: 12, display: "inline-block", textAlign: "center" }}>
                {isOpen ? "▼" : "▶"}
              </span>
            )}
            <span>{node.label}</span>
          </div>
          {hasChildren && isOpen && (
            <div>{renderNodes(node.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return <div>{renderNodes(data)}</div>;
}; 