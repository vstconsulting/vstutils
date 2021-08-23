/**
 * Mixin for file field buttons (cleanValue, readFile, hideField).
 */
const FileFieldButtonMixin = {
    data() {
        return {
            wrapperClasses: [],
            wrapperStyles: {},
            spanClasses: ['btn', 'btn-default', 'btn-right', 'textfile'],
            spanStyles: { float: 'right', margin: '0 0 10px 10px' },
            iconStyles: {},
        };
    },
};

export default FileFieldButtonMixin;
