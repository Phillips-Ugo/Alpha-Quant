import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const UploadPortfolioQuickAction = ({ onPortfolioUpdate }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploadedFile(file);
    setLoading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = reader.result.split(',')[1]; // Remove data URL prefix
        
        const response = await fetch('/.netlify/functions/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileContent: base64Content,
            fileName: file.name,
            fileType: file.type
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            toast.success('Portfolio file processed!');
            if (onPortfolioUpdate) {
              onPortfolioUpdate(data.portfolio || []);
            }
          } else {
            throw new Error(data.error || 'Upload failed');
          }
        } else {
          throw new Error('Upload failed');
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload portfolio file');
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
      <input {...getInputProps()} />
      <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      {loading ? (
        <div className="spinner mx-auto mb-4"></div>
      ) : (
        <>
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? 'Drop your file here' : 'Upload Portfolio File'}
          </p>
          <p className="text-gray-600">
            Drag & drop a PDF, TXT, CSV, or Excel file, or click to browse
          </p>
          {uploadedFile && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {uploadedFile.name}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default UploadPortfolioQuickAction;
