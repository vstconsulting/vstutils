import { defineComponent, provide, PropType } from 'vue';
import type { View } from '../views';
import { mapStoreActions, mapStoreState } from '../utils';
import { useViewStore } from '../store/helpers';

export const BaseViewMixin = defineComponent({
    inject: ['requestConfirmation'],
    props: {
        view: { type: Object as PropType<View>, required: true },
        query: { type: Object, default: () => ({}) },
        params: { type: Object, default: () => ({}) },
    },
    setup(props) {
        // eslint-disable-next-line vue/no-setup-props-destructure
        const view = props.view;
        const store = useViewStore(view);

        provide('view', view);

        return { store };
    },
    computed: {
        ...mapStoreState(['loading', 'error', 'response', 'actions', 'sublinks', 'breadcrumbs', 'title']),
    },
    watch: {
        '$route.query': 'fetchData',
    },
    methods: {
        ...mapStoreActions(['initLoading', 'setLoadingError', 'setLoadingSuccessful', 'fetchData']),
    },
});
