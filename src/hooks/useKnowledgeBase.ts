import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient, type OutlineDocument, type OutlineSearchResult, type OutlineDocumentStructure } from '@/lib/internalApiClient';

// Функция для фильтрации документов, исключающая те, что начинаются с дефиса
const filterHiddenDocuments = (documents: OutlineDocument[]): OutlineDocument[] => {
  return documents.filter(doc => {
    // Проверяем, содержит ли название дефис в начале (после возможных скобок и пробелов)
    const cleanTitle = doc.title.trim();
    // Ищем дефис в начале названия или после открывающих скобок
    return !cleanTitle.match(/^[([{\s]*-/);
  });
};

export const useKnowledgeBase = () => {
  const queryClient = useQueryClient();
  // Persist search query across page navigations
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return sessionStorage.getItem('kbSearchQuery') || '';
    } catch {
      return '';
    }
  });

  // Save every change to sessionStorage so it can be restored later
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { sessionStorage.setItem('kbSearchQuery', searchQuery); } catch {}
    }
  }, [searchQuery]);

  // Получение документов
  const {
    data: documents = [],
    isLoading: documentsLoading,
    error: documentsError,
  } = useQuery({
    queryKey: ['outline-documents'],
    queryFn: () => internalApiClient.getOutlineDocuments(),
    // Если длина запроса < 2, считаем, что поиска «нет», и показываем общий список
    enabled: !searchQuery || searchQuery.length < 2,
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
  });

  // Логирование ошибок документов
  useEffect(() => {
    if (documentsError) {
      console.error('❌ Ошибка в useKnowledgeBase - документы:', {
        message: documentsError instanceof Error ? documentsError.message : String(documentsError),
        timestamp: new Date().toISOString()
      });
    }
  }, [documentsError]);

  // Логирование успешной загрузки документов
  useEffect(() => {
    if (documents && documents.length > 0) {
      console.log('✅ useKnowledgeBase - документы загружены:', {
        count: documents.length,
        timestamp: new Date().toISOString()
      });
    }
  }, [documents]);

  // Поиск документов
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['outline-search', searchQuery],
    queryFn: () => internalApiClient.searchOutlineDocuments(searchQuery),
    enabled: !!searchQuery && searchQuery.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 минута
    gcTime: 2 * 60 * 1000, // 2 минуты
  });

  // Логирование ошибок поиска
  useEffect(() => {
    if (searchError) {
      console.error('❌ Ошибка в useKnowledgeBase - поиск:', {
        message: searchError instanceof Error ? searchError.message : String(searchError),
        searchQuery,
        timestamp: new Date().toISOString()
      });
    }
  }, [searchError, searchQuery]);

  // Логирование успешного поиска
  useEffect(() => {
    if (searchResults && searchQuery) {
      console.log('✅ useKnowledgeBase - поиск выполнен:', {
        query: searchQuery,
        totalCount: searchResults.totalCount || 0,
        resultsCount: searchResults.results?.length || 0,
        hasResults: !!searchResults.results,
        timestamp: new Date().toISOString()
      });
    }
  }, [searchResults, searchQuery]);

  // Получение конкретного документа
  const getDocument = useQuery({
    queryKey: ['outline-document'],
    queryFn: () => Promise.resolve(null), // Заглушка, будет переопределена
    enabled: false,
  });

  // Мутация для получения документа по ID
  const fetchDocument = useMutation({
    mutationFn: (documentId: string) => internalApiClient.getOutlineDocument(documentId),
    onSuccess: (data) => {
      queryClient.setQueryData(['outline-document', data.id], data);
    },
  });

  // Мутация для получения содержимого документа
  const fetchDocumentContent = useMutation({
    mutationFn: (documentId: string) => internalApiClient.getOutlineDocumentContent(documentId),
  });

  // Получение дерева документов
  const {
    data: documentTree = [],
    isLoading: treeLoading,
    error: treeError,
  } = useQuery({
    queryKey: ['outline-tree'],
    queryFn: async () => {
      // Получаем коллекции для построения дерева
      const collections = await internalApiClient.getOutlineCollections();
      
      interface TreeNode {
        label: string;
        id?: string;
        path?: string;
        children: TreeNode[];
      }
      
      const tree: TreeNode[] = [];

      for (const collection of collections) {
        try {
          // Получаем структуру коллекции через новый API метод
          const collectionStructure = await internalApiClient.getOutlineCollectionStructure(collection.id);
          
          // Функция для рекурсивного преобразования структуры документа в TreeNode
          const transformDocumentToNode = (doc: OutlineDocumentStructure): TreeNode => {
            const node: TreeNode = {
              label: doc.title.replace(/^#+\s*/, ''),
              id: doc.id,
              path: `/knowledge/${encodeURIComponent(doc.id)}`,
              children: doc.children.map(transformDocumentToNode),
            };
            return node;
          };
          
          // Фильтруем скрытые документы (начинающиеся с дефиса) и преобразуем в TreeNode
          const filteredDocs = collectionStructure
            .filter((doc) => {
              const cleanTitle = doc.title.trim();
              return !cleanTitle.match(/^[([{\s]*-/);
            })
            .map(transformDocumentToNode);
          
          // Добавляем коллекцию с её документами в дерево
          tree.push({ 
            label: collection.name, 
            id: collection.id, 
            path: `/knowledge/collection/${encodeURIComponent(collection.id)}`, 
            children: filteredDocs 
          });
        } catch (error) {
          console.error(`❌ Ошибка получения структуры коллекции ${collection.name}:`, error);
          // Добавляем коллекцию без документов в случае ошибки
          tree.push({ 
            label: collection.name, 
            id: collection.id, 
            path: `/knowledge/collection/${encodeURIComponent(collection.id)}`, 
            children: [] 
          });
        }
      }

      console.log('📂 Outline document tree построено через новый API метод:', { collections: tree.length });
      return tree;
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });

  // Логирование ошибок дерева
  useEffect(() => {
    if (treeError) {
      console.error('❌ Ошибка в useKnowledgeBase - дерево документов:', {
        message: treeError instanceof Error ? treeError.message : String(treeError),
        timestamp: new Date().toISOString()
      });
    }
  }, [treeError]);

  // Логирование успешной загрузки дерева
  useEffect(() => {
    if (documentTree && documentTree.length > 0) {
      console.log('✅ useKnowledgeBase - дерево документов загружено:', {
        count: documentTree.length,
        timestamp: new Date().toISOString()
      });
    }
  }, [documentTree]);

  // Получение структуры конкретной коллекции
  const getCollectionStructure = useMutation({
    mutationFn: (collectionId: string) => internalApiClient.getOutlineCollectionStructure(collectionId),
  });

  return {
    documents: filterHiddenDocuments(documents),
    documentsLoading,
    documentsError,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    refetchSearch,
    getDocument,
    fetchDocumentMutation: fetchDocument,
    fetchDocumentContentMutation: fetchDocumentContent,
    documentTree,
    treeLoading,
    treeError,
    getCollectionStructureMutation: getCollectionStructure,
  };
}; 