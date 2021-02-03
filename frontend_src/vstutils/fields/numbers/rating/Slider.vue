<template>
    <div>
        <template v-if="edit">
            <input
                type="range"
                style="margin-right: 10px"
                :value="value"
                :min="field.min"
                :max="field.max"
                :step="field.step"
                :title="value"
                :disabled="!edit"
                @change="$emit('change', $event.target.valueAsNumber)"
            />
        </template>
        <template v-else>
            <div class="progress progress-xs">
                <div
                    class="progress-bar"
                    :style="`width: ${(value / field.max) * 100}%; background-color: ${field.color};`"
                />
            </div>
        </template>
        <span v-if="value !== null" class="badge" :style="{ backgroundColor: field.color }">
            {{ value }} / {{ field.max }}
        </span>
    </div>
</template>

<script>
    import BaseRatingMixin from './BaseRatingMixin.js';

    export default {
        name: 'Slider',
        mixins: [BaseRatingMixin],
    };
</script>
