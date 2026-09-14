import { cn } from "@/lib/utils";

export type ProgressStep = {
    label: string;
    description?: string;
};

interface ProgressBarProps {
    steps: ProgressStep[];
    currentStep: number;
    className?: string;
}

export function ProgressBar({ steps, currentStep, className }: ProgressBarProps) {
    return (
        <div className={cn("w-full", className)}>
            <ol className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                        <li
                            key={step.label}
                            className={cn(
                                "relative flex flex-1",
                                !isLast && "pb-0"
                            )}
                        >
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                                        isComplete
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : isActive
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border text-muted-foreground"
                                    )}
                                >
                                    {isComplete ? (
                                        <CheckIcon className="h-5 w-5" />
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </div>
                                <div className="mt-2 text-center">
                                    <span
                                        className={cn(
                                            "text-xs font-medium",
                                            isComplete || isActive
                                                ? "text-primary"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {step.label}
                                    </span>
                                    {step.description && (
                                        <p className="mt-0.5 text-xs text-muted-foreground/70">
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {!isLast && (
                                <div
                                    className={cn(
                                        "absolute top-5 left-1/2 -right-1/2 h-0.5 flex-1",
                                        isComplete
                                            ? "bg-primary"
                                            : "bg-border",
                                        "hidden sm:block"
                                    )}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
    );
}
