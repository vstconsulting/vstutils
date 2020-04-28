import $ from 'jquery';
import BinaryFileFieldContentEdit from './BinaryFileFieldContentEdit.vue';

const BinaryFileFieldMixin = {
    data() {
        return {
            file_reader_method: 'readAsArrayBuffer',
        };
    },
    watch: {
        file_obj: function (file) {
            let el = $(this.$el).find('#file_path_input');

            if (file && file.name) {
                $(el).text(file.name);
            } else {
                $(el).text(this.$options.filters.capitalize(this.$t('no file selected')));
            }
        },
    },
    methods: {
        handleValue(data = {}) {
            return this.field.toBase64(data);
        },
    },
    components: {
        field_content_edit: {
            mixins: [BinaryFileFieldContentEdit],
        },
    },
};

export default BinaryFileFieldMixin;
