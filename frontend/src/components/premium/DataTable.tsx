"use client";

import type { ComponentType } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ColumnDef<T> = {
    key: string;
    header: string;
    sortable?: boolean;
    render?: (row: T) => React.ReactNode;
    className?: string;
};

interface DataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    sortKey?: keyof T | string;
    sortDirection?: "asc" | "desc";
    onSort?: (key: string) => void;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;
    emptyTitle?: string;
    emptyDescription?: string;
    className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    sortKey,
    sortDirection = "asc",
    onSort,
    currentPage = 1,
    totalPages = 1,
    pageSize = 10,
    totalItems,
    onPageChange,
    emptyTitle = "No results",
    emptyDescription = "Try adjusting your search.",
    className,
}: DataTableProps<T>) {
    const getCellValue = (row: T, key: keyof T | string): unknown => {
        const keys = key.toString().split(".");
        let value: unknown = row;
        for (const k of keys) {
            if (value === null || value === undefined) return "";
            value = (value as Record<string, unknown>)[k];
        }
        return value;
    };

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems ?? data.length);

    return (
        <div className={cn("space-y-4", className)}>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-secondary/30">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={cn(
                                        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                                        column.className
                                    )}
                                >
                                    {column.sortable && onSort ? (
                                        <button
                                            onClick={() => onSort(column.key)}
                                            className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                                        >
                                            {column.header}
                                            {sortKey === column.key && (
                                                <ArrowUpDown className="h-3 w-3" />
                                            )}
                                        </button>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr
                                key={i}
                                className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30"
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className="px-4 py-3 text-foreground"
                                    >
                                        {column.render
                                            ? column.render(row)
                                            : String(getCellValue(row, column.key) ?? "—")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="py-12 text-center"
                                >
                                    <div className="flex flex-col items-center justify-center">
                                        <p className="text-title-md font-semibold">
                                            {emptyTitle}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {emptyDescription}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalItems !== undefined && totalItems > 0 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-xs text-muted-foreground">
                        Showing {startItem}–{endItem} of {totalItems}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange?.(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange?.(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
