/**
 * Input validation. Every rule is a pure function so it can be unit tested
 * and reused by forms without duplicating logic in components.
 */
import { toDate } from "./duration";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export const NAME_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 140;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export type CategoryInput = {
  name: string;
  color: string;
};

export type TimeEntryInput = {
  description: string;
  categoryId: string;
  start: string;
  end: string;
};

/** Validates a category name, returning an error message or null. */
export function validateCategoryName(name: unknown): string | null {
  if (typeof name !== "string") return "Name is required.";
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Name is required.";
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validateColor(color: unknown): string | null {
  if (typeof color !== "string" || !HEX_COLOR.test(color.trim())) {
    return "Color must be a hex value like #4f46e5.";
  }
  return null;
}

export function validateCategoryInput(
  input: CategoryInput,
): ValidationResult<CategoryInput> {
  const errors: string[] = [];
  const nameError = validateCategoryName(input?.name);
  if (nameError) errors.push(nameError);
  const colorError = validateColor(input?.color);
  if (colorError) errors.push(colorError);
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name: input.name.trim(), color: input.color.trim() },
  };
}

/**
 * Validates a time entry form value. Rejects missing descriptions, an
 * unknown category, invalid timestamps, and an end that precedes the start.
 */
export function validateTimeEntryInput(
  input: TimeEntryInput,
): ValidationResult<TimeEntryInput> {
  const errors: string[] = [];

  if (typeof input?.description !== "string" || input.description.trim().length === 0) {
    errors.push("Description is required.");
  } else if (input.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.push(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`);
  }

  if (typeof input?.categoryId !== "string" || input.categoryId.trim().length === 0) {
    errors.push("Category is required.");
  }

  const start = toDate(input?.start ?? "");
  const end = toDate(input?.end ?? "");
  if (!start) errors.push("Start must be a valid date and time.");
  if (!end) errors.push("End must be a valid date and time.");
  if (start && end && end.getTime() < start.getTime()) {
    errors.push("End must not be before start.");
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      description: input.description.trim(),
      categoryId: input.categoryId,
      start: start!.toISOString(),
      end: end!.toISOString(),
    },
  };
}
