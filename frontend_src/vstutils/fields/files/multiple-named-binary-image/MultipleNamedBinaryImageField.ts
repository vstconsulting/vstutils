import { MultipleNamedBinaryFileField } from '../multiple-named-binary-file';
import { ResolutionValidatorConfig } from '../named-binary-image';
import MultipleNamedBinaryImageFieldMixin from './MultipleNamedBinaryImageFieldMixin';

import type { FieldOptions } from '@/vstutils/fields/base';
import type { IImageField } from '../named-binary-image';
import type { FileFieldXOptions } from '../file';
import type { NamedFile } from '../named-binary-file';
import type { ComponentOptions } from 'vue';

export class MultipleNamedBinaryImageField extends MultipleNamedBinaryFileField implements IImageField {
    resolutionConfig: ResolutionValidatorConfig | null;

    constructor(options: FieldOptions<FileFieldXOptions | undefined, NamedFile[]>) {
        super(options);
        this.resolutionConfig = ResolutionValidatorConfig.createIfNeeded(this.options);
    }

    static get mixins() {
        return [MultipleNamedBinaryImageFieldMixin as ComponentOptions<Vue>];
    }
}

export default MultipleNamedBinaryImageField;
