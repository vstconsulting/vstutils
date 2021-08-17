<template>
    <div>
        <template v-if="with_link">
            <router-link :to="href">
                {{ text }}
            </router-link>
        </template>
        <template v-else>
            {{ text }}
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
    };
</script>
