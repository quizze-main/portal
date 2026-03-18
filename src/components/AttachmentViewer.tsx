import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, File } from "lucide-react";

interface AttachmentViewerProps {
  attachmentId: string;
  fileName?: string;
}

export const AttachmentViewer = ({ attachmentId, fileName }: AttachmentViewerProps) => {
  const url = `${import.meta.env.VITE_API_BASE_URL}/api/outline/attachments/redirect?id=${attachmentId}`;
  
  // Убираем определение типа файла - показываем все как файлы для скачивания

  return (
    <>
      <Card className="border-gray-200 bg-gray-50 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <File size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {fileName || "Вложение"}
                </h4>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className="h-8 px-2"
              >
                <ExternalLink size={16} />
              </Button>
              <a href={url} download={fileName}>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Download size={16} />
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}; 