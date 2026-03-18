import React from 'react';

interface AdminSectionPlaceholderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const AdminSectionPlaceholder: React.FC<AdminSectionPlaceholderProps> = ({ icon, title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-muted-foreground/40 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
};
