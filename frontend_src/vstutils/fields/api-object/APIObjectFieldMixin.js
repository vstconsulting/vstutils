import APIObjectFieldContent from './APIObjectFieldContent.vue';

const APIObjectFieldMixin = {
    components: {
        field_content_edit: APIObjectFieldContent,
        field_content_readonly: APIObjectFieldContent,
    },
};

export default APIObjectFieldMixin;
