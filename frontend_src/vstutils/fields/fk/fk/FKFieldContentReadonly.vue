<template>
    <div>
        <template v-if="!representField.constructor.fkLinkable">
            <component
                :is="representField.component"
                :field="representField"
                :data="{ [representField.name]: field.getViewFieldValue(value) }"
                :type="$parent.type"
                :hideable="$parent.hideable"
                hide-title
            />
            <div v-if="withLink" class="object-link">
                <router-link :to="href">
                    {{ $t('Link') }}
                </router-link>
            </div>
        </template>
        <template v-else>
            <router-link v-if="withLink" :to="href">
                {{ text }}
            </router-link>
            <span v-else>{{ text }}</span>
        </template>
    </div>
</template>

<script setup lang="ts">
    import { computed, toRef } from 'vue';
    import type { Model } from '@/vstutils/models';
    import type { FKField, TRepresent } from './FKField';
    import { ensureValueFetched, useQuerySets } from './composables';

    const props = defineProps<{
        field: FKField;
        value: TRepresent | null | undefined;
        data: Record<string, unknown>;
    }>();

    const { queryset } = useQuerySets(props.field, props.data);

    const representField = props.field.fkModel!.fields.get(props.field.viewField);

    const withLink = computed<boolean>(
        () => props.field.makeLink && (!props.value || !(props.value as Model).__notFound),
    );
    const fk = computed(() => {
        return props.field.getValueFieldValue(props.value);
    });
    const href = computed<string>(() => {
        if (fk.value && queryset.value) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-plus-operands
            return queryset.value.url + fk.value;
        }
        return '';
    });
    const text = computed(() => {
        if (props.value) {
            return props.field.translateValue(props.value);
        }
        return '';
    });

    ensureValueFetched(props.field, queryset.value!, toRef(props, 'value'));
</script>

<style scoped>
    .object-link {
        margin-top: 5px;
        text-align: center;
    }
</style>
