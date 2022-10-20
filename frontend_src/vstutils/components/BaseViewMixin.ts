import { defineComponent, provide } from 'vue';
import type { View } from '../views';
import { mapStoreActions, mapStoreState } from '../utils';
import { useAutoUpdate } from '../autoupdate';
import { useViewStore } from '../store/helpers';

export const BaseViewMixin = defineComponent({
    inject: ['requestConfirmation'],
    props: {
        view: { type: Object, required: true } as unknown as { type: typeof View; required: true },
        query: { type: Object, default: () => ({}) },
        params: { type: Object, default: () => ({}) },
    },
    setup(props) {
        // eslint-disable-next-line vue/no-setup-props-destructure
        const view = props.view;
        const store = useViewStore(view);
        if (view.autoupdate && store.updateData) {
            useAutoUpdate({
                callback: store.updateData,
                pk: store.getAutoUpdatePk ? store.getAutoUpdatePk() : null,
                labels: view.subscriptionLabels || undefined,
            });
        }

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
