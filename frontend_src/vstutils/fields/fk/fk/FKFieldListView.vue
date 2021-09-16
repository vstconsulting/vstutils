<template>
    <div :class="classes" :style="styles" style="display: contents">
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
    import { BaseFieldListView } from '../../base';
    import FKFieldContentReadonly from './FKFieldContentReadonly.js';

    export default {
        mixins: [BaseFieldListView, FKFieldContentReadonly],
    };
</script>
