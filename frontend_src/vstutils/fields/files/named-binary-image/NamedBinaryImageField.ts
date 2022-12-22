import type { FieldOptions } from '../../base';
import type { FileFieldXOptions, IFileField } from '../file';
import type { NamedFile } from '../named-binary-file';
import { NamedBinaryFileField } from '../named-binary-file';
import NamedBinaryImageFieldMixin from './NamedBinaryImageFieldMixin';
import ResolutionValidatorConfig from './ResolutionValidatorConfig';

export interface IImageField extends IFileField {
    resolutionConfig: ResolutionValidatorConfig | null;
}

export class NamedBinaryImageField extends NamedBinaryFileField implements IImageField {
    static fkLinkable = false;
    resolutionConfig: ResolutionValidatorConfig | null;

    constructor(options: FieldOptions<FileFieldXOptions | undefined, NamedFile>) {
        super(options);
        this.resolutionConfig = ResolutionValidatorConfig.createIfNeeded(options);
    }

    static get mixins() {
        return [NamedBinaryImageFieldMixin];
    }
}

export default NamedBinaryImageField;
