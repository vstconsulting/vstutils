import { MultipleNamedBinaryFileFieldContent } from '../multiple-named-binary-file';
import { NamedBinaryImageFieldContent } from '../named-binary-image';

/**
 * Mixin for readonly and editable multiplenamedbinimage field.
 */
const MultipleNamedBinaryImageFieldContent = {
    mixins: [MultipleNamedBinaryFileFieldContent, NamedBinaryImageFieldContent],
};

export default MultipleNamedBinaryImageFieldContent;
