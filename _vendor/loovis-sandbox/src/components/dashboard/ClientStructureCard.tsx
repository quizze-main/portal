import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Globe, Smartphone } from 'lucide-react';
import { FilterPeriod } from './FilterBar';
import { ClientSegmentsCompact } from './ClientSegmentsCompact';
import { TrafficSourcesCompact } from './TrafficSourcesCompact';
import { LcaInstallationCompact } from './LcaInstallationCompact';

interface ClientStructureCardProps {
  period?: FilterPeriod;
}

export const ClientStructureCard: React.FC<ClientStructureCardProps> = ({ 
  period = 'month' 
}) => {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <Tabs defaultValue="segments" className="w-full">
        <div className="px-3 py-2 border-b bg-muted/40">
          <TabsList className="h-8 w-full bg-muted/60 p-0.5">
            <TabsTrigger 
              value="segments" 
              className="flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сегменты</span>
              <span className="sm:hidden">Сегм.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sources" 
              className="flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Источники</span>
              <span className="sm:hidden">Источ.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="lca" 
              className="flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>ЛКА</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="segments" className="m-0">
          <ClientSegmentsCompact period={period} />
        </TabsContent>
        
        <TabsContent value="sources" className="m-0">
          <TrafficSourcesCompact period={period} />
        </TabsContent>
        
        <TabsContent value="lca" className="m-0">
          <LcaInstallationCompact period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
