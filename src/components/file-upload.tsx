"use client";

import React, { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileText, Film, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  bucket?: string;
  folder?: string;
  label?: string;
  helperText?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function FileUpload({
  value,
  onChange,
  accept = "image/jpeg,image/png,image/webp",
  bucket = "course-assets",
  folder = "uploads",
  label = "Upload File",
  helperText = "PNG, JPG, or WebP up to 25MB",
  maxSizeMB = 25,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update internal preview if value changes externally
  React.useEffect(() => {
    setPreviewUrl(value || null);
  }, [value]);

  const handleUpload = async (file: File) => {
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    // Local preview for image
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      setPreviewUrl(data.url);
      onChange(data.url);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setError(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isImage = previewUrl && (
    previewUrl.startsWith("data:image/") ||
    previewUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i) ||
    previewUrl.includes("supabase.co/storage")
  );

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !isUploading) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer select-none outline-none focus:ring-2 focus:ring-slate-900/10 ${
          isDragging
            ? "border-slate-900 bg-slate-100"
            : "border-slate-300 hover:border-slate-400 bg-slate-50/70"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
          aria-label={label}
        />

        {isUploading ? (
          <div className="flex flex-col items-center py-4 text-slate-600">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900 mb-2" />
            <p className="text-xs font-medium">Uploading file securely...</p>
          </div>
        ) : previewUrl ? (
          <div className="flex items-center justify-between w-full gap-3 py-1">
            <div className="flex items-center gap-3 min-w-0">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview"
                  decoding="async"
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0"
                />
              ) : previewUrl.endsWith(".pdf") ? (
                <div className="w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              ) : previewUrl.endsWith(".mp4") ? (
                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Film className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  File Uploaded
                </p>
                <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                  {previewUrl.startsWith("data:") ? "Local media attached" : previewUrl}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title="Remove file"
              aria-label="Remove uploaded file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2 text-center">
            <div className="p-2.5 bg-slate-200/70 rounded-full text-slate-600 mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-800">
              <span className="font-semibold text-slate-900 underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
