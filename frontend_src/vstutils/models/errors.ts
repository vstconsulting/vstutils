import type { Field } from '#vstutils/fields/base/BaseField';
import { i18n } from '#vstutils/translation';
import { escapeHtml } from '#vstutils/utils';

export interface FieldValidationErrorInfo {
    field: Field;
    message: string | Record<string, unknown>;
}

function* objToErrorsLines(obj: Record<string, unknown>, indent = 1): Generator<string, void, undefined> {
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            yield `${'&nbsp;'.repeat(indent * 3)}<b>${i18n.ts(escapeHtml(key))}</b>: ${i18n.ts(
                escapeHtml(value),
            )}`;
        } else {
            const nestedLines = [...objToErrorsLines(value as Record<string, unknown>, indent + 1)];
            if (nestedLines.length > 0) {
                yield `${'&nbsp;'.repeat(indent * 3)}<b>${i18n.ts(escapeHtml(key))}</b>:`;
                yield* nestedLines;
            }
        }
    }
}

/**
 * Class that stores errors related to model's fields
 */
export class ModelValidationError extends Error {
    errors: FieldValidationErrorInfo[];

    constructor(errors: FieldValidationErrorInfo[] = []) {
        super();
        this.errors = errors;
    }

    toFieldsErrors(): Record<string, unknown> {
        const fieldsErrors = {} as Record<string, unknown>;
        for (const { field, message } of this.errors) {
            if (!message) {
                continue;
            }
            if (typeof message === 'object') {
                fieldsErrors[field.name] = message;
            } else {
                fieldsErrors[field.name] = i18n.t(message);
            }
        }
        return fieldsErrors;
    }

    toHtmlString(): string {
        const lines = [];
        for (const { field, message } of this.errors) {
            const title = i18n.ts(escapeHtml(field.title));
            if (typeof message === 'string') {
                lines.push(`<b>${title}</b>: ${i18n.ts(escapeHtml(message))}`);
            } else {
                const newLines = [...objToErrorsLines(message)];
                if (newLines.length > 0) {
                    lines.push(`<b>${title}</b>:`, ...newLines);
                }
            }
        }
        return lines.join('<br />');
    }
}
