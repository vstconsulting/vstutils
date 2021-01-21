/**
 * @vue/component
 */
import ListView from './ListView.vue';
import TableView from './TableView.vue';

export default {
    computed: {
        isEmpty() {
            return this.value && this.value.length;
        },
        fieldComponent() {
            switch (this.field.viewType) {
                case 'list':
                    return ListView;
                case 'table':
                    return TableView;
            }
        },
    },
};
