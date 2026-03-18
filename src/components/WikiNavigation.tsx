import React, { useState, useEffect, useRef } from "react";
import { WikiTreeNode } from "./WikiTreeNode";
import { Input } from "@/components/ui/input";
import { X, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { internalApiClient, type OutlineSearchResponse } from "@/lib/internalApiClient";

interface TreeNode {
  label: string;
  id: string;
  path?: string; // путь/route до документа или массива хлебных крошек
  children?: TreeNode[];
}

interface WikiNavigationProps {
  tree: TreeNode[];
  treeLoading?: boolean;
  activePath?: string;
  onSelect: (path: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// helper to filter hidden documents (title starts with dash)
const hideHiddenDocs = (docs: Array<{document: {id: string; title: string}}>) =>
  docs.filter((d) => !d.document?.title?.trim().match(/^[([{\s]*-/));

export const WikiNavigation: React.FC<WikiNavigationProps> = ({
  tree,
  treeLoading = false,
  activePath,
  onSelect,
  mobileOpen = false,
  onMobileClose,
}) => {
  // Persist sidebar search
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') return '';
    try { return sessionStorage.getItem('kbNavSearch') || ''; } catch { return ''; }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { sessionStorage.setItem('kbNavSearch', search); } catch {}
    }
  }, [search]);
  // Убираем автоматический сброс поиска: теперь очищаем только вручную

  // Restore saved scroll position once tree is ready (or menu reopened)
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (() => { try { return sessionStorage.getItem('kbNavScrollTop'); } catch { return null; } })() : null;
    if (saved && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(saved, 10);
    }
  }, [treeLoading, mobileOpen]);

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  // remote search when 2+ chars
  const {
    data: searchResults,
    isLoading: searchLoading,
  } = useQuery<OutlineSearchResponse>({
    queryKey: ["outline-search-nav", search],
    queryFn: () => internalApiClient.searchOutlineDocuments(search),
    enabled: search.length >= 2,
    staleTime: 60 * 1000,
  });

  const toggleNode = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Фильтрация дерева по поиску
  const filterTree = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .map((node) => {
        if (node.children) {
          const filteredChildren = filterTree(node.children);
          if (
            node.label.toLowerCase().includes(search.toLowerCase()) ||
            filteredChildren.length > 0
          ) {
            return { ...node, children: filteredChildren };
          }
          return null;
        }
        return node.label.toLowerCase().includes(search.toLowerCase()) ? node : null;
      })
      .filter(Boolean) as TreeNode[];
  };

  const renderTree = (nodes: TreeNode[], level = 1) =>
    nodes.map((node) => {
      const hasChildren = !!(node.children && node.children.length > 0);
      const isOpen = openIds.has(node.id);
      const handleClick = () => {
        if (hasChildren) {
          toggleNode(node.id);
        }
        // конечный документ navigation happens via Link
      };
      return (
        <div key={node.id}>
          {hasChildren ? (
            <WikiTreeNode
              label={node.label}
              level={level}
              active={node.id === activePath}
              onClick={handleClick}
              hasChildren={hasChildren}
              isOpen={isOpen}
            >
              {/* Кнопка перехода на страницу узла */}
              <Link
                to={node.path || `/knowledge/${encodeURIComponent(node.id)}`}
                onClick={(e) => {
                  e.stopPropagation(); // чтобы не срабатывал toggle
                  onSelect(node.id);
                  if (onMobileClose) {
                    onMobileClose();
                  }
                }}
                className="ml-2 p-1 rounded kb-nav-icon focus:outline-none focus:ring-0"
                aria-label="Открыть страницу"
              >
                <FileText size={14} className="text-[hsl(var(--foreground))]/60" />
              </Link>
            </WikiTreeNode>
          ) : (
            <Link
              to={`/knowledge/${encodeURIComponent(node.id)}`}
              onClick={() => {
                onSelect(node.id);
                if (onMobileClose) {
                  onMobileClose();
                }
              }}
              className="focus:outline-none focus:ring-0"
            >
              <WikiTreeNode
                label={node.label}
                level={level}
                active={node.id === activePath}
                hasChildren={false}
              />
            </Link>
          )}
          {hasChildren && isOpen && (
            <div>{renderTree(node.children!, level + 1)}</div>
          )}
        </div>
      );
    });

  // Overlay для мобилы
  return (
    <>
      {/* Overlay для мобилы */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[12px] backdrop-saturate-150 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <nav data-kb-nav=""
        className={`
          fixed z-50 top-0 left-0 h-full w-80 max-w-full bg-white/60 dark:bg-gray-900/40 backdrop-blur-[12px] backdrop-saturate-150
          border-r border-white/10 shadow-sm
          transition-transform duration-300
          lg:static lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col
          overflow-y-auto
        `}
        style={{ borderRadius: "var(--radius)" }}
      >
        {/* Мобильный заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--wiki-border))] lg:hidden">
          <h2 className="font-semibold text-base">Разделы</h2>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-2 rounded-md hover:bg-[hsl(var(--wiki-node-hover))] transition-colors"
              aria-label="Закрыть меню"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {/* Поиск */}
        <div className="p-4 border-b border-[hsl(var(--wiki-border))]">
          <div className="relative">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по разделам..."
              className="pl-9 pr-10 text-sm bg-[#ffffff5c] border-white/15 dark:border-white/10 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground))]/70 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearch("")}
                aria-label="Очистить поиск"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        {/* Scrollable area with extra bottom padding to avoid overlap with bottom navigation */}
        <div
          className="flex-1 overflow-y-auto py-2 pb-24 px-1"
          ref={scrollContainerRef}
          onScroll={() => {
            if (scrollContainerRef.current) {
              try { sessionStorage.setItem('kbNavScrollTop', scrollContainerRef.current.scrollTop.toString()); } catch {}
            }
          }}
        >
          {treeLoading && search.length < 2 ? (
            <div className="text-center text-sm text-muted-foreground py-4">Загрузка…</div>
          ) : search.length >= 2 ? (
            searchLoading ? (
              <div className="text-center text-sm text-muted-foreground py-4">Поиск…</div>
            ) : (
              <div className="space-y-1">
                {hideHiddenDocs(searchResults?.results || []).map((item) => (
                  <Link
                    key={item.document.id}
                    to={`/knowledge/${encodeURIComponent(item.document.id)}`}
                    onClick={() => {
                      if (onMobileClose) {
                        onMobileClose();
                      }
                    }}
                  >
                    <WikiTreeNode
                      label={item.document.title.replace(/^#+\s*/, "")}
                      level={1}
                    />
                  </Link>
                ))}
                {(!searchResults || hideHiddenDocs(searchResults.results || []).length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-4">Ничего не найдено</div>
                )}
              </div>
            )
          ) : (
            renderTree(filterTree(tree))
          )}
        </div>
      </nav>
    </>
  );
}; 