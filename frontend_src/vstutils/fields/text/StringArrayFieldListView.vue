<template>
    <ul class="table_ul">
        <li v-for="(item, idx) in value" :key="idx">
            <span :class="classes" :style="styles">{{ item }}</span>
        </li>
    </ul>
</template>

<script lang="ts">
    import { BaseFieldListView } from '#vstutils/fields/base';

    export default {
        mixins: [BaseFieldListView],
    };
</script>
