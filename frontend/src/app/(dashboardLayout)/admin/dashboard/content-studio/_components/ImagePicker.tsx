import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "../_types";

/**
 * Image picker with previews. Object URLs are created on selection and revoked
 * when the file list changes or the component unmounts, so repeated picks do not
 * leak blobs. Validation mirrors the backend multer filter and size limit.
 */
export function ImagePicker({
  files,
  onChange,
  multiple = false,
  className,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const pick = (incoming: File[]) => {
    const accepted: File[] = [];

    for (const file of incoming) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPG, PNG or WebP is allowed`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name}: larger than 5MB`);
        continue;
      }
      accepted.push(file);
    }

    if (!accepted.length) return;

    onChange(multiple ? [...files, ...accepted] : accepted.slice(0, 1));
  };

  const removeAt = (index: number) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          pick(Array.from(event.dataTransfer.files));
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-input/40 px-4 py-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
      >
        <ImagePlus className="size-5 text-primary" />
        <p className="mt-2 text-xs font-medium">Tap to browse or drop images</p>
        <p className="mt-0.5 text-2xs text-muted-foreground">
          JPG, PNG, WebP · max 5MB each{multiple ? " · up to 20" : ""}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          pick(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {files.length > 0 && (
        <div className={cn("grid gap-2", multiple ? "grid-cols-4" : "grid-cols-1")}>
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}`}
              className={cn(
                "group relative overflow-hidden rounded-lg border border-border bg-muted",
                multiple ? "aspect-square" : "h-28 w-full",
              )}
            >
              <img
                src={previews[index]}
                alt={file.name}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${file.name}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-2xs text-muted-foreground transition-colors hover:text-destructive"
        >
          Clear {files.length} selected
        </button>
      )}
    </div>
  );
}