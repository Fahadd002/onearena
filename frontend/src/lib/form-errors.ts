type ValidationIssue = {
  message?: unknown;
  issues?: ValidationIssue[];
};

/** Converts TanStack Form / Zod validation errors into displayable text. */
export function formatFieldErrors(errors: unknown[]): string {
  return errors
    .flatMap((error) => {
      if (typeof error === "string") return [error];

      if (error && typeof error === "object") {
        const issue = error as ValidationIssue;

        if (typeof issue.message === "string") return [issue.message];
        if (Array.isArray(issue.issues)) return formatFieldErrors(issue.issues);
      }

      return [];
    })
    .join(", ");
}
