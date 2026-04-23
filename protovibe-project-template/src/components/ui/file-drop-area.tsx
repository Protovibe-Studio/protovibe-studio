import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { TextParagraph } from '@/components/ui/text-paragraph';

export interface FileDropAreaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  heading?: string;
  secondaryText?: string;
  primaryActionLabel?: string;
  uploadMoreLabel?: string;
  icon?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Mock state for visual builder to preview the filled state */
  previewMode?: 'empty' | 'filled';
  files?: File[];
  onFilesChange?: (files: File[]) => void;
}

export function FileDropArea({
  heading = 'Upload a file',
  secondaryText = 'Choose and upload a file or drag and drop it here.',
  primaryActionLabel = 'Choose file from disk',
  uploadMoreLabel = 'Upload more files',
  icon = 'mdi:cloud-upload-outline',
  multiple = true,
  disabled = false,
  previewMode = 'empty',
  onFilesChange,
  files: externalFiles,
  className,
  ...props
}: FileDropAreaProps) {
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const files = externalFiles !== undefined ? externalFiles : internalFiles;
  const setFiles = (newFiles: File[]) => {
    if (externalFiles === undefined) {
      setInternalFiles(newFiles);
    }
    onFilesChange?.(newFiles);
  };
  const [isDragging, setIsDragging] = useState(false);

  // Mock files for the visual builder's preview mode
  const mockFiles = [
    new File([''], 'company-guidelines-final-v2.pdf', { type: 'application/pdf' }),
    new File([''], 'Q3-financial-report.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  ];

  const displayFiles = previewMode === 'filled' ? (multiple ? mockFiles : [mockFiles[0]]) : files;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      const updatedFiles = multiple ? [...files, ...newFiles] : [newFiles[0]];
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const updatedFiles = multiple ? [...files, ...newFiles] : [newFiles[0]];
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
    }
    // Reset input so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    if (previewMode === 'filled') return; // Cannot modify mock files
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  return (
    <div
      className={cn("flex flex-col gap-4 w-full", className)}
      {...props}
      data-pv-component-id="FileDropArea"
    >
      {displayFiles.length === 0 ? (
        <div
          data-dragging={isDragging}
          data-disabled={disabled}
          className="relative flex flex-col items-center justify-center p-8 gap-2 border-2 border-dashed border-border-default transition-colors data-[dragging=true]:border-border-primary data-[dragging=true]:bg-background-primary-subtle data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed hover:border-border-primary group bg-background-subtle rounded"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            multiple={multiple}
            disabled={disabled}
            onChange={handleFileSelect}
            aria-label="Upload file"
          />
          <Icon iconSymbol={icon} size="2xl" className="text-foreground-secondary mb-2 group-hover:text-foreground-primary transition-colors" />
          <TextParagraph typography="bold-primary" className="text-center">{heading}</TextParagraph>
          <TextParagraph typography="secondary" className="text-center">{secondaryText}</TextParagraph>
          <Button
            leftIcon="mdi:upload"
            label={primaryActionLabel}
            variant="solid"
            color="primary"
            className="mt-2 pointer-events-none"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full">
          {displayFiles.map((file, i) => (
            <div key={i} className="flex flex-row items-center gap-3 p-3 min-h-0 bg-background-default border border-border-default rounded">
              <Icon iconSymbol="mdi:file-document-outline" size="md" className="text-foreground-secondary shrink-0" />
              <TextParagraph typography="regular" className="flex-1 truncate">{file.name}</TextParagraph>
              <Button
                leftIcon="mdi:close"
                iconOnly
                label="Remove"
                variant="ghost"
                color="neutral"
                size="sm"
                className="shrink-0 z-10 relative"
                onClick={() => removeFile(i)}
              />
            </div>
          ))}
          {multiple && (
            <div className="relative self-start mt-1">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                multiple
                disabled={disabled}
                onChange={handleFileSelect}
                aria-label="Upload more files"
              />
              <Button
                leftIcon="mdi:upload"
                label={uploadMoreLabel}
                variant="outline"
                color="neutral"
                size="sm"
                className="pointer-events-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PvDefaultContent() {
  return <></>;
}

export const pvConfig = {
  name: 'FileDropArea',
  componentId: 'FileDropArea',
  displayName: 'File Drop Area',
  description: 'A drag-and-drop file upload zone that displays a list of selected files.',
  importPath: '@/components/ui/file-drop-area',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  allowTextInChildren: false,
  props: {
    heading: { type: 'string', exampleValue: 'Upload a file' },
    secondaryText: { type: 'string', exampleValue: 'Choose and upload a file or drag and drop it here.' },
    primaryActionLabel: { type: 'string', exampleValue: 'Choose file from disk' },
    uploadMoreLabel: { type: 'string', exampleValue: 'Upload more files' },
    icon: { type: 'iconSearch', exampleValue: 'mdi:cloud-upload-outline' },
    multiple: { type: 'boolean' },
    disabled: { type: 'boolean' },
    previewMode: { type: 'select', options: ['empty', 'filled'] },
  },
  invalidCombinations: [
    (props: Record<string, any>) => !props.heading,
  ],
};
