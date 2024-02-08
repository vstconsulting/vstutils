<template>
    <div class="row">
        <component :is="beforeFieldsGroups" v-if="beforeFieldsGroups" :page="self" />
        <form :class="view.wrapperClasses" @submit.prevent="store.executeMainAction">
            <ModelFields
                v-if="response"
                :data="sandbox"
                :model="model"
                :editable="!readOnly"
                :fields-errors="fieldsErrors"
                :hide-read-only="hideReadOnly"
                :require-value-on-clear="requireValueOnClear"
                :fields-groups="fieldsGroups"
                @set-value="store.setFieldValue"
            />
            <input type="submit" hidden />
        </form>
        <component :is="afterFieldsGroups" v-if="afterFieldsGroups" :page="self" />
    </div>
</template>

<script setup lang="ts">
    import { computed, getCurrentInstance } from 'vue';
    import { storeToRefs } from 'pinia';
    import { ViewTypes } from '@/vstutils/utils';
    import { useViewStore } from '@/vstutils/store';
    import ModelFields from '@/vstutils/components/page/ModelFields.vue';

    import type { DetailView } from '@/vstutils/views';

    const store = useViewStore<DetailView>();
    const view = computed(() => store.view as DetailView);

    const readOnly = computed(() => view.value.type === ViewTypes.PAGE);
    const hideReadOnly = computed(() => view.value.hideReadonlyFields);
    const requireValueOnClear = computed(() => view.value.isEditPage() && view.value.isPartial);

    const beforeFieldsGroups = computed(() =>
        view.value.beforeFieldsGroups ? view.value.beforeFieldsGroups() : null,
    );
    const afterFieldsGroups = computed(() =>
        view.value.afterFieldsGroups ? view.value.afterFieldsGroups() : null,
    );

    const self = getCurrentInstance()!.proxy;

    const { response, sandbox, model, fieldsErrors, fieldsGroups } = storeToRefs(store);
</script>
