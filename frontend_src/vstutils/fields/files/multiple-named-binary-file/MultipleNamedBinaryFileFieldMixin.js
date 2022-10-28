import MultipleNamedBinaryFileFieldContentReadonly from './MultipleNamedBinaryFileFieldContentReadonly.vue';
import MultipleNamedBinaryFileFieldContentEdit from './MultipleNamedBinaryFileFieldContentEdit.vue';
import MultipleNamedBinaryFileFieldContentList from './MultipleNamedBinaryFileFieldContentList';
import { readFileAsObject } from '../../../utils';

const MultipleNamedBinaryFileFieldMixin = {
    computed: {
        val() {
            return this.value || [];
        },
    },
    methods: {
        handleValue(data = {}) {
            return data[this.field.options.name];
        },
        async readFile(files) {
            const filesObj = [];

            for (let index = 0; index < files.length; index++) {
                filesObj.push(await readFileAsObject(files[index]));
            }

            this.$emit('set-value', {
                field: this.field.name,
                value: [...this.val, ...filesObj],
            });
        },
    },
    components: {
        field_content_readonly: MultipleNamedBinaryFileFieldContentReadonly,
        field_content_edit: MultipleNamedBinaryFileFieldContentEdit,
        field_list_view: MultipleNamedBinaryFileFieldContentList,
    },
};

export default MultipleNamedBinaryFileFieldMixin;
