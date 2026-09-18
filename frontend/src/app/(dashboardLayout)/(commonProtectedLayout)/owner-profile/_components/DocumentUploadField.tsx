"use client";

import {
  CheckCircle,
  FileText,
  Upload,
  X,
  CreditCard,
  Briefcase,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentFile, DocumentType } from "../_types";
import { isPdfFile } from "@/lib/utils";


interface DocumentUploadFieldProps {
  docType: DocumentType;
  document: DocumentFile;
  label: string;
  description: string;
  icon: "nid" | "registration" | "license" | "tax" | "logo" | "default";
  status: string | null | undefined;
  onFileSelect: (docType: DocumentType, file: File, preview: string) => void;
  onRemove: (docType: DocumentType) => void;
}

const iconMap = {
  nid: CreditCard,
  registration: Briefcase,
  license: FileText,
  tax: FileText,
  logo: MapPin,
  default: FileText,
};

export default function DocumentUploadField({
  docType,
  document,
  label,
  description,
  icon = "default",
  status,
  onFileSelect,
  onRemove,
}: DocumentUploadFieldProps) {
  const Icon = iconMap[icon];
  const isApproved = status === "APPROVED";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        onFileSelect(docType, file, preview);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {label}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {document.uploaded && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          {status !== "APPROVED" &&
            document.preview &&
            !document.uploaded && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-700 h-8 w-8"
                onClick={() => onRemove(docType)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
        </div>
      </div>

      {document.preview ? (
        <div className="space-y-3">
          <div className="relative inline-block">
            {isPdfFile(document.fileType) ? (
              <div className="h-56 w-full rounded-lg border border-border bg-background flex items-center justify-center p-4">
                <FileText className="h-16 w-16 text-red-500" />
                <span className="absolute bottom-4 text-sm text-muted-foreground">
                  PDF Document
                </span>
              </div>
            ) : (
              <img
                src={document.preview}
                alt={label}
                className="h-56 w-full rounded-lg border border-border object-contain bg-background p-2"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
            id={`${docType}-upload`}
            disabled={isApproved}
          />
          <label
            htmlFor={`${docType}-upload`}
            className={`cursor-pointer block ${isApproved ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG up to 10MB
            </p>
          </label>
        </div>
      )}
    </div>
  );
}
