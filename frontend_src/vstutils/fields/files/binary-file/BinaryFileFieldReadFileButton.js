import FileFieldReadFileButton from '../file/FileFieldReadFileButton';

export default {
    mixins: [FileFieldReadFileButton],
    data() {
        return {
            wrapperClasses: ['input-group-append'],
            wrapperStyles: { margin: '0' },
            spanClasses: ['btn', 'input-group-text', 'textfile'],
            spanStyles: { margin: '0', borderLeft: 'none' },
            iconClasses: ['far', 'fa-file-alt'],
            iconStyles: {},
            helpText: 'Open file',
            accept: '*',
            multiple: false,
        };
    },
    methods: {
        onChange(event) {
            this.$emit('read-file', event.target.files);
        },
    },
};
