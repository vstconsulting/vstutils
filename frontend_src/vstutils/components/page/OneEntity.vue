<template>
    <div class="row">
        <component :is="beforeFieldsGroups" v-if="beforeFieldsGroups" :page="self" />
        <div :class="view.wrapperClasses">
            <ModelFields
                v-if="response"
                :data="sandbox"
                :model="model"
                :editable="!readOnly"
                :fields-errors="fieldsErrors"
                :hide-read-only="hideReadOnly"
                :require-value-on-clear="requireValueOnClear"
                @set-value="store.setFieldValue"
            />
        </div>
        <component :is="afterFieldsGroups" v-if="afterFieldsGroups" :page="self" />
    </div>
</template>

<script setup lang="ts">
    import { computed, getCurrentInstance } from 'vue';
    import { storeToRefs } from 'pinia';
    import { ViewTypes } from '@/vstutils/utils';
    import { useViewStore } from '@/vstutils/store';
    import { ViewPropsDef } from '@/vstutils/views/props';
    import ModelFields from '@/vstutils/components/page/ModelFields.vue';

    import type { ViewPropsDefType, DetailView } from '@/vstutils/views';

    const props = defineProps(ViewPropsDef as ViewPropsDefType<DetailView>);

    const store = useViewStore(props.view, { watchQuery: true });

    const readOnly = computed(() => props.view.type === ViewTypes.PAGE);
    const hideReadOnly = computed(() => props.view.hideReadonlyFields);
    const requireValueOnClear = computed(() => props.view.isEditPage() && props.view.isPartial);

    const beforeFieldsGroups = computed(() =>
        props.view.beforeFieldsGroups ? props.view.beforeFieldsGroups() : null,
    );
    const afterFieldsGroups = computed(() =>
        props.view.afterFieldsGroups ? props.view.afterFieldsGroups() : null,
    );

    const self = getCurrentInstance()!.proxy;

    const { response, sandbox, model, fieldsErrors } = storeToRefs(store);
</script>
