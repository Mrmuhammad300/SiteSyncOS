'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Progress } from './progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import {
  Upload,
  File,
  FileText,
  Image,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Paperclip,
  FolderUp,
} from 'lucide-react';
import { toast } from 'sonner';

export interface UploadedFile {
  id?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  cloud_storage_path: string;
  url?: string;
  category?: string;
  description?: string;
  uploadedAt?: Date;
}

export interface DocumentUploadProps {
  entityType: 'project' | 'rfi' | 'submittal' | 'change_order' | 'daily_report' | 'property' | 'design_request' | 'punch_item' | 'draw_request' | 'user';
  entityId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
  categories?: string[];
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonText?: string;
  showIcon?: boolean;
  compact?: boolean;
}

const FILE_ICONS: Record<string, typeof File> = {
  'application/pdf': FileText,
  'image/': Image,
  'default': File,
};

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  project: ['Contract', 'Specification', 'Drawing', 'Photo', 'Report', 'Correspondence', 'Other'],
  rfi: ['Question Document', 'Reference Drawing', 'Photo', 'Specification', 'Response', 'Other'],
  submittal: ['Shop Drawing', 'Product Data', 'Sample', 'Certificate', 'Manual', 'Other'],
  change_order: ['Proposal', 'Estimate', 'Drawing', 'Photo', 'Approval', 'Other'],
  daily_report: ['Site Photo', 'Weather Record', 'Safety Report', 'Inspection', 'Other'],
  property: ['Survey', 'Title', 'Appraisal', 'Environmental', 'Legal', 'Photo', 'Other'],
  design_request: ['Reference Image', 'Sketch', 'CAD File', 'Rendering', 'Revision', 'Other'],
  punch_item: ['Photo', 'Inspection Report', 'Completion Evidence', 'Other'],
  draw_request: ['Invoice', 'Lien Waiver', 'Inspection Report', 'Photo', 'Backup Documentation', 'Other'],
  user: ['Profile Photo', 'Certificate', 'License', 'Resume', 'Other'],
};

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  cloud_storage_path?: string;
  category?: string;
  description?: string;
}

export function DocumentUpload({
  entityType,
  entityId,
  onUploadComplete,
  maxFiles = 10,
  maxSizeMB = 50,
  allowedTypes,
  categories,
  buttonVariant = 'outline',
  buttonSize = 'default',
  buttonText = 'Upload Documents',
  showIcon = true,
  compact = false,
}: DocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveCategories = categories || DEFAULT_CATEGORIES[entityType] || ['Other'];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | undefined => {
    if (file.size > maxSizeBytes) {
      return `File too large (max ${maxSizeMB}MB)`;
    }
    if (allowedTypes && !allowedTypes.some(t => file.type.startsWith(t))) {
      return 'File type not allowed';
    }
    return undefined;
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const remainingSlots = maxFiles - files.length;
    
    if (fileArray.length > remainingSlots) {
      toast.error(`Can only upload ${remainingSlots} more file(s)`);
      return;
    }

    const validatedFiles: FileWithProgress[] = fileArray.map(file => {
      const error = validateFile(file);
      return {
        file,
        progress: 0,
        status: error ? 'error' as const : 'pending' as const,
        error,
        category: effectiveCategories[0],
      };
    });

    setFiles(prev => [...prev, ...validatedFiles]);
  }, [files.length, maxFiles, maxSizeBytes, allowedTypes, effectiveCategories]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileCategory = (index: number, category: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, category } : f));
  };

  const updateFileDescription = (index: number, description: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, description } : f));
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      if (fileData.status !== 'pending') continue;

      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      try {
        // Get presigned URL
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileData.file.name,
            contentType: fileData.file.type,
            isPublic: false,
          }),
        });

        if (!presignedRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, cloud_storage_path } = await presignedRes.json();

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, progress: 30 } : f
        ));

        // Upload to S3
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': fileData.file.type },
          body: fileData.file,
        });

        if (!uploadRes.ok) throw new Error('Failed to upload file');

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, progress: 70 } : f
        ));

        // Save to database
        const docRes = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileData.file.name,
            fileType: fileData.file.type,
            fileSize: fileData.file.size,
            cloud_storage_path,
            category: fileData.category,
            description: fileData.description,
            entityType,
            entityId,
          }),
        });

        if (!docRes.ok) throw new Error('Failed to save document record');
        const savedDoc = await docRes.json();

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'complete', progress: 100, cloud_storage_path } : f
        ));

        uploadedFiles.push({
          id: savedDoc.id,
          fileName: fileData.file.name,
          fileSize: fileData.file.size,
          fileType: fileData.file.type,
          cloud_storage_path,
          category: fileData.category,
          description: fileData.description,
          uploadedAt: new Date(),
        });

      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: 'Upload failed' } : f
        ));
      }
    }

    setUploading(false);
    
    if (uploadedFiles.length > 0) {
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
      onUploadComplete?.(uploadedFiles);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setOpen(false);
      // Clear completed files after closing
      setTimeout(() => {
        setFiles(prev => prev.filter(f => f.status !== 'complete'));
      }, 300);
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'complete').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          {showIcon && (compact ? <Paperclip className="w-4 h-4" /> : <Upload className="w-4 h-4 mr-2" />)}
          {!compact && buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderUp className="w-5 h-5" />
            Upload Documents
          </DialogTitle>
          <DialogDescription>
            Upload files for this {entityType.replace('_', ' ')}. Max {maxFiles} files, {maxSizeMB}MB each.
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            accept={allowedTypes?.join(',')}
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            {files.length}/{maxFiles} files selected
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3 mt-4">
            {files.map((fileData, index) => {
              const FileIcon = getFileIcon(fileData.file.type);
              return (
                <Card key={index} className={fileData.status === 'error' ? 'border-red-300' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded">
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{fileData.file.name}</p>
                          <div className="flex items-center gap-2">
                            {fileData.status === 'complete' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {fileData.status === 'error' && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            {fileData.status === 'uploading' && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {fileData.status !== 'uploading' && fileData.status !== 'complete' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeFile(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileData.file.size)}
                          {fileData.error && (
                            <span className="text-red-500 ml-2">{fileData.error}</span>
                          )}
                        </p>
                        
                        {fileData.status === 'uploading' && (
                          <Progress value={fileData.progress} className="h-1 mt-2" />
                        )}

                        {fileData.status === 'pending' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">Category</Label>
                              <Select
                                value={fileData.category}
                                onValueChange={(v) => updateFileCategory(index, v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {effectiveCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Description (optional)</Label>
                              <Input
                                className="h-8 text-xs"
                                placeholder="Brief description"
                                value={fileData.description || ''}
                                onChange={(e) => updateFileDescription(index, e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {completedCount > 0 && `${completedCount} uploaded`}
            {completedCount > 0 && pendingCount > 0 && ', '}
            {pendingCount > 0 && `${pendingCount} pending`}
          </div>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            {completedCount > 0 && pendingCount === 0 ? 'Done' : 'Cancel'}
          </Button>
          {pendingCount > 0 && (
            <Button onClick={uploadFiles} disabled={uploading}>
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <>Upload {pendingCount} File{pendingCount > 1 ? 's' : ''}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentUpload;
