import { MultipleNamedBinaryFileField } from '../multiple-named-binary-file';
import { ResolutionValidatorConfig } from '../named-binary-image';
import MultipleNamedBinaryImageFieldMixin from './MultipleNamedBinaryImageFieldMixin';

import type { ComponentOptions } from 'vue';
import type { FieldOptions } from '@/vstutils/fields/base';
import type { IImageField, NamedBinaryImageFieldXOptions } from '../named-binary-image';
import type { NamedFile } from '../named-binary-file';

export class MultipleNamedBinaryImageField
    extends MultipleNamedBinaryFileField<NamedBinaryImageFieldXOptions>
    implements IImageField
{
    resolutionConfig: ResolutionValidatorConfig | null;
    backgroundFillColor: string;

    constructor(options: FieldOptions<NamedBinaryImageFieldXOptions, NamedFile[]>) {
        super(options);
        this.resolutionConfig = ResolutionValidatorConfig.createIfNeeded(this.options);
        this.backgroundFillColor = this.props.backgroundFillColor ?? 'transparent';
    }

    static get mixins() {
        return [MultipleNamedBinaryImageFieldMixin as ComponentOptions<Vue>];
    }
}

export default MultipleNamedBinaryImageField;
