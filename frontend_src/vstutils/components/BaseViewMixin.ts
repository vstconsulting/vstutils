import { defineComponent } from 'vue';
import { mapStoreActions, mapStoreState } from '../utils';
import { useViewStore } from '../store/helpers';
import { ViewPropsDef } from '../views/props';

export const BaseViewMixin = defineComponent({
    props: ViewPropsDef,
    setup(props) {
        const store = useViewStore(props.view, { watchQuery: true });
        return { store };
    },
    computed: {
        ...mapStoreState(['loading', 'error', 'response', 'actions', 'sublinks', 'breadcrumbs', 'title']),
    },
    methods: {
        ...mapStoreActions(['initLoading', 'setLoadingError', 'setLoadingSuccessful', 'fetchData']),
    },
});
