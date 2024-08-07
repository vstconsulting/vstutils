<template>
    <div v-if="field.showLoader && loading" class="loader">
        <i class="fa-spin fas fa-sync-alt" />
    </div>
    <div v-else>
        <template v-if="!linkable && representField">
            <component
                :is="representField.getComponent()"
                :field="representField"
                :data="{ [representField.name]: field.getViewFieldValue(value) }"
                type="readonly"
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
    import { ensureValueFetched, useQuerySets } from './composables';
    import { FieldReadonlyPropsDef } from '#vstutils/fields/base';
    import { getApp } from '#vstutils/utils';

    import type { Model } from '#vstutils/models';
    import type { FieldReadonlyPropsDefType } from '#vstutils/fields/base';
    import type { FKField } from './FKField';

    const props = defineProps(FieldReadonlyPropsDef as FieldReadonlyPropsDefType<FKField>);
    const app = getApp();

    const { queryset } = useQuerySets(props.field, props.data);

    const representField = props.field.fkModel!.fields.get(props.field.viewField);

    const linkable = computed(() => {
        return representField?.fkLinkable;
    });

    const fk = computed(() => {
        return props.field.getValueFieldValue(props.value);
    });
    const href = computed<string>(() => {
        if (fk.value) {
            if (props.field.props.linkGenerator) {
                return props.field.props.linkGenerator({ ...props, value: props.value }) ?? '';
            }
            if (queryset.value) {
                return queryset.value.url + fk.value;
            }
        }
        return '';
    });
    const withLink = computed<boolean>(() => {
        if (!props.field.makeLink) {
            return false;
        }
        if (!props.value || (props.value as Model).__notFound) {
            return false;
        }

        const pattern = queryset.value?.pattern;
        if (pattern) {
            const view = app.views.get(pattern);
            if (!view || view.hidden) {
                return false;
            }
        }

        return true;
    });
    const text = computed(() => {
        if (props.value) {
            return props.field.translateValue(props.value);
        }
        return '';
    });

    const { loading } = ensureValueFetched(props.field, toRef(props, 'value'));
</script>

<style scoped>
    .object-link {
        margin-top: 5px;
        text-align: center;
    }

    .field-component.type-list .loader::v-deep {
        text-align: center;
    }
</style>
