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
            <div v-if="with_link" class="object-link">
                <router-link :to="href">
                    {{ $t('Link') }}
                </router-link>
            </div>
        </template>
        <template v-else>
            <router-link v-if="with_link" :to="href">
                {{ text }}
            </router-link>
            <span v-else>{{ text }}</span>
        </template>
    </div>
</template>

<script>
    import FKFieldContentReadonly from './FKFieldContentReadonly.js';
    import { BaseFieldContentReadonlyMixin } from '../../base';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, FKFieldContentReadonly],
        data() {
            return {
                class_list: ['form-control', 'revers-color'],
                styles_dict: { height: '38px' },
            };
        },
        computed: {
            representField() {
                return this.field.fkModel.fields.get(this.field.viewField);
            },
        },
    };
</script>

<style scoped>
    .object-link {
        margin-top: 5px;
        text-align: center;
    }
</style>
