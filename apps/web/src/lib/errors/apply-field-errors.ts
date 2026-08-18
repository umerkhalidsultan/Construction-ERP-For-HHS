import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export function applyApiFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: { fields?: Record<string, string> },
): boolean {
  const entries = Object.entries(error.fields ?? {});
  if (!entries.length) {
    return false;
  }
  entries.forEach(([name, message], index) => {
    setError(
      name as Path<T>,
      { type: "server", message },
      { shouldFocus: index === 0 },
    );
  });
  return true;
}
