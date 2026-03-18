interface OutlineDocument {
  id: string;
  title: string;
  urlId: string;
  url: string;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  teamId: string;
  collectionId?: string;
  parentDocumentId?: string;
  createdBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  updatedBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  collaboratorIds: string[];
  revision: number;
  fullWidth: boolean;
  template: boolean;
  templateId?: string;
  lastViewedAt?: string;
  pinned: boolean;
  collection?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
}

interface OutlineSearchResult {
  document: OutlineDocument;
  context: string;
  ranking: number;
}

interface OutlineSearchResponse {
  results: OutlineSearchResult[];
  totalCount: number;
}

interface OutlineAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  url?: string;
}

class OutlineClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    this.apiKey = import.meta.env.VITE_API_SECRET_KEY || '';
  }

  private getAuthHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getDocuments(): Promise<OutlineDocument[]> {
    try {
      const url = `${this.baseUrl}/api/outline/documents`;
      console.log('🔗 Запрос документов:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Outline API error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Получены документы из Outline:', {
        count: result.data?.length || 0,
        url: url
      });
      return result.data;
    } catch (error) {
      console.error('❌ Ошибка получения документов:', {
        message: error instanceof Error ? error.message : String(error),
        url: `${this.baseUrl}/api/outline/documents`
      });
      throw error;
    }
  }

  async getDocument(documentId: string): Promise<OutlineDocument> {
    try {
      const url = `${this.baseUrl}/api/outline/documents/${documentId}`;
      console.log('🔗 Запрос документа:', url, { documentId });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Outline API error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          documentId: documentId,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Получен документ из Outline:', {
        documentId: documentId,
        title: result.data?.title,
        url: url
      });
      return result.data;
    } catch (error) {
      console.error('❌ Ошибка получения документа:', {
        message: error instanceof Error ? error.message : String(error),
        documentId: documentId,
        url: `${this.baseUrl}/api/outline/documents/${documentId}`
      });
      throw error;
    }
  }

  async searchDocuments(query: string): Promise<OutlineSearchResponse> {
    try {
      const url = `${this.baseUrl}/api/outline/search`;
      const body = JSON.stringify({
        query,
        includeArchived: false,
        includeDrafts: false,
      });
      console.log('🔗 Поиск документов:', url, { query });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Outline API error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          query: query,
          body: body,
          headers: Object.fromEntries(response.headers.entries()),
          responseBody: errorText
        });
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Результаты поиска в Outline:', {
        query: query,
        totalCount: result.data?.totalCount || 0,
        resultsCount: result.data?.results?.length || 0,
        url: url
      });
      return result.data;
    } catch (error) {
      console.error('❌ Ошибка поиска документов:', {
        message: error instanceof Error ? error.message : String(error),
        query: query,
        url: `${this.baseUrl}/api/outline/search`
      });
      throw error;
    }
  }

  async getDocumentContent(documentId: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/api/outline/documents/${documentId}/content`;
      console.log('🔗 Запрос содержимого документа:', url, { documentId });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Outline API error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          documentId: documentId,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      // Проверяем тип контента
      const contentType = response.headers.get('content-type') || '';
      let content: string;
      
      if (contentType.includes('application/json')) {
        // Если JSON, извлекаем из data
        const jsonData = await response.json();
        content = jsonData.data || jsonData;
      } else {
        // Если текст, просто читаем
        content = await response.text();
      }
      
      // Если контент начинается с {"data": то это неправильно обработанный JSON
      if (typeof content === 'string' && content.trim().startsWith('{"data":')) {
        try {
          const parsed = JSON.parse(content);
          content = parsed.data || content;
        } catch (e) {
          // Если не удалось распарсить, оставляем как есть
          console.warn('⚠️ Не удалось распарсить JSON контент:', e);
        }
      }
      
      console.log('✅ Получено содержимое документа из Outline:', {
        documentId: documentId,
        contentLength: content.length,
        contentType: contentType,
        url: url
      });
      return content;
    } catch (error) {
      console.error('❌ Ошибка получения содержимого документа:', {
        message: error instanceof Error ? error.message : String(error),
        documentId: documentId,
        url: `${this.baseUrl}/api/outline/documents/${documentId}/content`
      });
      throw error;
    }
  }

  async getAttachment(attachmentId: string): Promise<OutlineAttachment> {
    try {
      const url = `${this.baseUrl}/api/outline/attachments/redirect`;
      const body = JSON.stringify({ id: attachmentId });
      console.log('🔗 Запрос вложения:', url, { attachmentId });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Outline API error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          attachmentId: attachmentId,
          requestBody: body,
          headers: Object.fromEntries(response.headers.entries()),
          responseBody: errorText
        });
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Получено вложение из Outline:', {
        attachmentId: attachmentId,
        name: result.data?.name,
        url: url
      });
      return result.data;
    } catch (error) {
      console.error('❌ Ошибка получения вложения:', {
        message: error instanceof Error ? error.message : String(error),
        attachmentId: attachmentId,
        url: `${this.baseUrl}/api/outline/attachments/redirect`
      });
      throw error;
    }
  }

  // Список коллекций Outline
  async listCollections(): Promise<{ id: string; name: string; color?: string; icon?: string; }[]> {
    const url = `${this.baseUrl}/api/outline/collections`;
    try {
      console.log('🔗 Запрос списка коллекций (internal API):', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Internal API error (collections):', {
          status: response.status,
          statusText: response.statusText,
          url,
          body: errorText,
        });
        throw new Error(`Internal API error: ${response.status}`);
      }
      const json = await response.json();
      console.log('✅ Получены коллекции (internal API):', { count: json.data?.length || 0 });
      return json.data || [];
    } catch (error) {
      console.error('❌ Ошибка получения коллекций через internal API:', error);
      throw error;
    }
  }

  // Список документов по коллекции
  async listDocuments(collectionId: string): Promise<OutlineDocument[]> {
    const url = `${this.baseUrl}/api/outline/documents`;
    const body = JSON.stringify(collectionId ? { collectionId } : {});
    try {
      console.log('🔗 Запрос документов коллекции (internal API):', { collectionId, url });
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body,
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Internal API error (documents):', {
          status: response.status,
          statusText: response.statusText,
          url,
          collectionId,
          body: errorText,
        });
        throw new Error(`Internal API error: ${response.status}`);
      }
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('❌ Ошибка получения документов через internal API:', error);
      throw error;
    }
  }

  // Построение дерева документов (коллекции -> документы с иерархией)
  async getDocumentTree(): Promise<{ label: string; path?: string; id?: string; children?: any[]; }[]> {
    try {
      const collections = await this.listCollections();
      const tree: any[] = [];

      for (const collection of collections) {
        const docs = await this.listDocuments(collection.id);
        // Фильтруем скрытые документы (начинающиеся с дефиса)
        const filteredDocs = docs.filter((doc) => {
          const cleanTitle = doc.title.trim();
          return !cleanTitle.match(/^[([{\s]*-/);
        });
        // Создаём карту id -> node
        const idToNode: Record<string, any> = {};
        filteredDocs.forEach((doc) => {
          idToNode[doc.id] = {
            label: doc.title,
            id: doc.id,
            path: `/knowledge/${encodeURIComponent(doc.id)}`,
            children: [],
          };
        });
        const roots: any[] = [];
        filteredDocs.forEach((doc) => {
          const node = idToNode[doc.id];
          if (doc.parentDocumentId && idToNode[doc.parentDocumentId]) {
            idToNode[doc.parentDocumentId].children.push(node);
          } else {
            roots.push(node);
          }
        });
        // Добавляем id и path коллекции, чтобы WikiNavigation могла корректно идентифицировать корневой узел
        tree.push({ label: collection.name, id: collection.id, path: `/knowledge/collection/${encodeURIComponent(collection.id)}`, children: roots });
      }

      console.log('📂 Outline document tree построено:', { collections: tree.length });
      return tree;
    } catch (error) {
      console.error('❌ Ошибка построения дерева документов Outline:', error);
      return [];
    }
  }

  async getCollection(collectionId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/api/outline/collection/${collectionId}`;
      console.log('🔗 Запрос коллекции:', url, { collectionId });

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Outline API error (collection):', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          collectionId: collectionId,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Получена коллекция из Outline:', {
        collectionId: collectionId,
        name: result.data?.name,
        url: url
      });
      return result.data;
    } catch (error) {
      console.error('❌ Ошибка получения коллекции:', {
        message: error instanceof Error ? error.message : String(error),
        collectionId: collectionId,
        url: `${this.baseUrl}/api/outline/collection/${collectionId}`
      });
      throw error;
    }
  }
}

export const outlineClient = new OutlineClient();
export type { OutlineDocument, OutlineSearchResult, OutlineSearchResponse, OutlineAttachment }; 