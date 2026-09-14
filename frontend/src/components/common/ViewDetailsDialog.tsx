"use client";

import { ReactNode } from "react";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DetailItem = { label: string; value: ReactNode };

interface ViewDetailsDialogProps {
  title: string;
  description?: string;
  trigger?: ReactNode;
  items: DetailItem[];
}

export function ViewDetailsDialog({
  title,
  description,
  trigger,
  items,
}: ViewDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="ghost" aria-label="View details">
            <Eye className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {item.label}
              </span>
              <span className="text-sm text-foreground break-words">
                {item.value ?? "—"}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
