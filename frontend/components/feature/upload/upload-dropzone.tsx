"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, UploadCloud, X } from "lucide-react";

export interface UploadedFile {
  name: string;
  size: number;
}

/**
 * 上传组件。后端目前仅支持文件引用字符串（license_docs / discharge_summary），
 * 因此这里在客户端记录文件名与大小，回调给表单。
 */
export function UploadDropzone({
  value,
  onChange,
  accept = "image/*,.pdf",
  hint = "支持图片 / PDF，单文件 ≤ 10MB",
  multiple,
}: {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  hint?: string;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({ name: f.name, size: f.size }));
    onChange(multiple ? [...value, ...files] : files);
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver
            ? "border-primary-500 bg-primary-50"
            : "border-neutral-300 hover:border-primary-500 hover:bg-primary-50/40"
        )}
      >
        <UploadCloud className="h-8 w-8 text-neutral-400" />
        <p className="text-sm text-neutral-600">
          点击或拖拽文件到此处上传
        </p>
        <p className="text-xs text-neutral-400">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-sm border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 text-primary-500" />
              <span className="flex-1 truncate text-neutral-700">{f.name}</span>
              <span className="text-xs text-neutral-400">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label="移除"
                className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-danger-500"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
