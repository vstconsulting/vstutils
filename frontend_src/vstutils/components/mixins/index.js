import SidebarLinkMixin from './SidebarLinkMixin.js';
import BaseButtonMixin from './BaseButtonMixin.vue';
import { LIST_STORE_MODULE, PAGE_STORE_MODULE } from '../../store/components_state/commonStoreModules.js';
import { ComponentWithAutoUpdate } from '../../autoupdate';
import { StoreModuleComponent } from './StoreModuleComponent.js';

export { BaseButtonMixin, SidebarLinkMixin, StoreModuleComponent };

export const InstanceComponent = {
    mixins: [StoreModuleComponent, ComponentWithAutoUpdate],
    data: () => ({ startAutoupdateAfterFetch: true }),
    computed: {
        instance() {
            return this.datastore?.data?.instance;
        },
        sandbox() {
            return this.datastore?.data?.sandbox;
        },
    },
    async created() {
        await this.fetchData();
        if (this.startAutoupdateAfterFetch) {
            this.startAutoUpdate();
        }
    },
    methods: {
        getStoreModule() {
            return PAGE_STORE_MODULE;
        },
        getInstancePk() {},
        async fetchData() {
            await this.dispatchAction('fetchData', this.getInstancePk());
        },
    },
};

export const InstancesComponent = {
    mixins: [StoreModuleComponent, ComponentWithAutoUpdate],
    data: () => ({ startAutoupdateAfterFetch: true }),
    computed: {
        autoupdateSubscriptionLabels() {
            return this.queryset.listSubscriptionLabels;
        },
        instances() {
            return this.$store.getters[this.storeName + '/instances'];
        },
    },
    async created() {
        await this.fetchData();
        if (this.startAutoupdateAfterFetch) {
            this.startAutoUpdate();
        }
    },
    methods: {
        getStoreModule() {
            return LIST_STORE_MODULE;
        },
        getFilters() {},
        async fetchData() {
            await this.dispatchAction('fetchData', { filters: this.getFilters() });
        },
    },
};
