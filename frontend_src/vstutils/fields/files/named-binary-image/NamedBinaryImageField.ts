import type { FieldOptions } from '../../base';
import type { FileFieldXOptions, IFileField } from '../file';
import type { NamedFile } from '../named-binary-file';
import { NamedBinaryFileField } from '../named-binary-file';
import NamedBinaryImageFieldMixin from './NamedBinaryImageFieldMixin';
import ResolutionValidatorConfig from './ResolutionValidatorConfig';

export interface IImageField extends IFileField {
    resolutionConfig: ResolutionValidatorConfig | null;
    backgroundFillColor: string;
}

export interface NamedBinaryImageFieldXOptions extends FileFieldXOptions {
    backgroundFillColor?: string;
}

export class NamedBinaryImageField
    extends NamedBinaryFileField<NamedBinaryImageFieldXOptions>
    implements IImageField
{
    static fkLinkable = false;
    resolutionConfig: ResolutionValidatorConfig | null;
    backgroundFillColor: string;

    constructor(options: FieldOptions<NamedBinaryImageFieldXOptions, NamedFile>) {
        super(options);
        this.resolutionConfig = ResolutionValidatorConfig.createIfNeeded(options);
        this.backgroundFillColor = this.props.backgroundFillColor ?? 'transparent';
    }

    static get mixins() {
        return [NamedBinaryImageFieldMixin];
    }
}

export default NamedBinaryImageField;
