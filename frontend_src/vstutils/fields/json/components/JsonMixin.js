const JsonMixin = {
    props: ['levels', 'title', 'value'],
    computed: {
        id() {
            return 'json-element-' + this.levels.join('-');
        },
    },
};

export default JsonMixin;
