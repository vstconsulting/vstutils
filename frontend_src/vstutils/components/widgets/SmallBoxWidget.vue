<template functional>
    <div class="small-box" :class="props.boxVariantClass">
        <div class="inner">
            <h3>{{ props.value }}</h3>
            <p>{{ parent.$tc(props.label, props.value) }}</p>
        </div>
        <div v-if="props.iconClass" class="icon">
            <i :class="props.iconClass" />
        </div>
        <a
            :href="props.href"
            class="small-box-footer"
            :style="listeners.click ? { cursor: 'pointer' } : {}"
            v-on="listeners.click ? { click: listeners.click } : {}"
        >
            <template v-if="props.href || listeners.click">
                {{ parent.$t('More info') }}
                <i class="fas fa-arrow-circle-right" />
            </template>
        </a>
    </div>
</template>

<script>
    export default {
        name: 'SmallBoxWidget',
        props: {
            value: { type: [Number, String], default: 0 },
            label: { type: String, required: true },
            boxVariantClass: { type: [String, Array, Object], default: 'bg-info' },
            iconClass: { type: [String, Array, Object], default: null },
            href: { type: String, default: null },
        },
    };
</script>
