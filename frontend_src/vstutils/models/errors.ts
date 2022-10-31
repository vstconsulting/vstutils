import type { Field } from '@/vstutils/fields/base/BaseField';
import { i18n } from '@/vstutils/translation';
import { escapeHtml } from '@/vstutils/utils';

interface FieldValidationErrorInfo {
    field: Field<any, any>;
    message: string | Record<string, unknown>;
}

function* objToErrorsLines(obj: Record<string, unknown>, indent = 1): Generator<string> {
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            yield `${'&nbsp;'.repeat(indent * 3)}<b>${i18n.t(escapeHtml(key)) as string}</b>: ${
                i18n.t(escapeHtml(value)) as string
            }`;
        } else {
            yield `${'&nbsp;'.repeat(indent * 3)}<b>${i18n.t(escapeHtml(key)) as string}</b>:`;
            yield* objToErrorsLines(value as Record<string, unknown>, indent + 1);
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
            const title = i18n.t(escapeHtml(field.title)) as string;
            if (typeof message === 'string') {
                lines.push(`<b>${title}</b>: ${i18n.t(escapeHtml(message)) as string}`);
            } else {
                lines.push(`<b>${title}</b>:`, ...objToErrorsLines(message));
            }
        }
        return lines.join('<br />');
    }
}
