"use client";

import { format, parse } from "date-fns";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    min?: string;
    className?: string;
    showIcon?: boolean;
    id?: string;
    ariaLabel?: string;
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    min,
    className,
    showIcon = true,
    id,
    ariaLabel,
}: DatePickerProps) {
    const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
    const displayValue = value ? format(selectedDate!, "PP") : "";

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="relative cursor-pointer">
                    {showIcon && (
                        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    )}
                    <input
                        id={id}
                        type="text"
                        readOnly
                        value={displayValue}
                        aria-label={ariaLabel}
                        className={cn(
                            "flex w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-1 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-9 text-sm",
                            showIcon && "pl-9",
                            className,
                        )}
                        placeholder={placeholder}
                    />
                </div>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(selected) => {
                        if (selected) {
                            onChange(format(selected, "yyyy-MM-dd"));
                        }
                    }}
                    disabled={min ? (d) => d < parse(min, "yyyy-MM-dd", new Date()) : undefined}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
