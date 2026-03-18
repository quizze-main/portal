import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface ImportDropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export const ImportDropZone: React.FC<ImportDropZoneProps> = ({ onFiles, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.endsWith('.md') || f.type === 'text/markdown'
      );
      if (files.length) onFiles(files);
    },
    [onFiles, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length) onFiles(files);
    };
    input.click();
  }, [onFiles, disabled]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium">Перетащите .md файлы сюда</p>
      <p className="text-xs text-muted-foreground mt-1">или нажмите для выбора файлов</p>
    </div>
  );
};
