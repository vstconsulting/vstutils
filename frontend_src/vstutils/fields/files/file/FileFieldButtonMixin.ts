import { BaseFieldButton } from '@/vstutils/fields/buttons';

const FileFieldButtonMixin = {
    extends: BaseFieldButton,
    data() {
        return {
            wrapperClasses: [],
            wrapperStyles: {},
            spanClasses: ['btn', 'btn-default', 'btn-right', 'textfile'],
            spanStyles: { float: 'right' as const, margin: '0 0 10px 10px' },
            iconStyles: {},
        };
    },
};

export default FileFieldButtonMixin;
