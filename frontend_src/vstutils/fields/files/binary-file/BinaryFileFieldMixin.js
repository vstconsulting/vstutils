import $ from 'jquery';
import BinaryFileFieldContentEdit from './BinaryFileFieldContentEdit.vue';
import BinaryFileFieldReadonly from './BinaryFileFieldReadonly.vue';

const BinaryFileFieldMixin = {
    data() {
        return {
            file_reader_method: 'readAsArrayBuffer',
        };
    },
    watch: {
        value: {
            handler: function (file) {
                let el = $(this.$el).find('#file_path_input');

                if (file && file.name) {
                    $(el).text(file.name);
                } else if (file) {
                    $(el).text(this.$u.capitalize(this.$tc('file n selected', 1)));
                } else {
                    $(el).text(this.$u.capitalize(this.$tc('file n selected', 0)));
                }
            },
            immediate: true,
        },
    },
    components: {
        field_content_edit: BinaryFileFieldContentEdit,
        field_content_readonly: BinaryFileFieldReadonly,
    },
};

export default BinaryFileFieldMixin;
