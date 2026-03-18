import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AdminKbConnector } from '@/components/admin/kb/AdminKbConnector';
import { AdminKbImport } from '@/components/admin/kb/AdminKbImport';
import { AdminKbArticles } from '@/components/admin/kb/AdminKbArticles';

export const AdminKnowledge: React.FC = () => {
  return (
    <Tabs defaultValue="connector" className="w-full">
      <TabsList className="w-full bg-muted">
        <TabsTrigger value="connector" className="flex-1 text-xs sm:text-sm">
          API-подключение
        </TabsTrigger>
        <TabsTrigger value="import" className="flex-1 text-xs sm:text-sm">
          Импорт
        </TabsTrigger>
        <TabsTrigger value="articles" className="flex-1 text-xs sm:text-sm">
          Статьи
        </TabsTrigger>
      </TabsList>

      <TabsContent value="connector">
        <AdminKbConnector />
      </TabsContent>

      <TabsContent value="import">
        <AdminKbImport />
      </TabsContent>

      <TabsContent value="articles">
        <AdminKbArticles />
      </TabsContent>
    </Tabs>
  );
};
