'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Upload, FileText, Download, CheckCircle } from 'lucide-react';

export default function HelpPage() {
  const { data: helpFiles } = useQuery({
    queryKey: ['helpFiles'],
    queryFn: () => api.get<any[]>('/master-data/help-files'),
  });

  const documents = helpFiles && helpFiles.length > 0
    ? helpFiles
    : [
        { id: '1', fileName: 'Certification Import&Export.xlsx', usage: 'Template' },
        { id: '2', fileName: 'EA Review.xlsx', usage: 'Template' },
        { id: '3', fileName: 'Application to Business Capability Mapping Operation Manual.pptx', usage: 'Guide' },
      ];

  return (
    <div className="p-6">
      {/* Hero banner */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-red-500 rounded-lg p-8 mb-6 text-white overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block px-3 py-1 text-xs font-medium border border-white/50 rounded mb-2">
            Enterprise Architecture Management
          </span>
          <h1 className="text-2xl font-bold">Support & Help</h1>
        </div>
      </div>

      {/* Guides & Templates section */}
      <div className="bg-white rounded-lg border border-border-light p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Guides & Templates:</h2>
        <p className="text-sm text-text-secondary mb-6">
          Please find document for user guides and import template for EAM Review, Meetings, Certification.
        </p>

        {/* Upload area */}
        <div className="border-2 border-dashed border-border-default rounded-lg p-8 text-center mb-6">
          <Upload className="w-10 h-10 text-text-secondary mx-auto mb-3 opacity-50" />
          <p className="text-sm text-text-secondary">
            Drag the file here, or <span className="text-primary-blue cursor-pointer hover:underline">click upload</span>
          </p>
        </div>

        {/* Document list */}
        <div className="space-y-3 mb-6">
          {documents.map((doc: any) => (
            <div key={doc.id || doc.fileName} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <FileText className="w-5 h-5 text-text-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-primary-blue hover:underline cursor-pointer font-medium">
                  {doc.fileName}
                </span>
                {doc.usage && (
                  <span className="ml-2 text-xs text-text-secondary bg-gray-100 px-2 py-0.5 rounded">
                    {doc.usage}
                  </span>
                )}
              </div>
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <button className="text-text-secondary hover:text-primary-blue">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {documents.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-4">No help files available.</p>
        )}
      </div>
    </div>
  );
}
