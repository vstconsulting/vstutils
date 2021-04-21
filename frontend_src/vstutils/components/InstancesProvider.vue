<template>
    <div style="display: contents">
        <slot :instances="instances" />
    </div>
</template>

<script>
    import { InstancesComponent } from './mixins';

    export default {
        name: 'InstancesProvider',
        mixins: [InstancesComponent],
        props: {
            qs: { type: Object, required: true },
        },
        methods: {
            getQuerySet() {
                return this.qs;
            },
        },
    };
</script>
