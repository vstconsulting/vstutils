import type { FieldOptions, FieldXOptions } from '@/vstutils/fields/base';
import { BaseField } from '@/vstutils/fields/base';

import FileFieldMixin from './FileFieldMixin';

import type { ComponentOptions } from 'vue';
import type { IFileField } from './utils';

export function parseAllowedMediaTypes(options: FieldOptions<FileFieldXOptions | undefined, unknown>) {
    if (options['x-options']?.media_types) {
        return options['x-options'].media_types;
    }
    if (options['x-validators']?.extensions) {
        return options['x-validators'].extensions;
    }
    return undefined;
}

export interface FileFieldXOptions extends FieldXOptions {
    media_types?: string[];
}

export class FileField
    extends BaseField<string, string, FileFieldXOptions | undefined>
    implements IFileField
{
    static fkLinkable = false;

    allowedMediaTypes: string[] | undefined;

    constructor(options: FieldOptions<FileFieldXOptions, string>) {
        super(options);
        this.allowedMediaTypes = parseAllowedMediaTypes(options);
    }

    getEmptyValue() {
        return null;
    }

    static get mixins() {
        return [FileFieldMixin as ComponentOptions<Vue>];
    }
}

export default FileField;
