<template>
    <div class="input-group mb-3">
        <div class="input-group-prepend hidden-360">
            <span class="input-group-text">{{ $t(title) }}</span>
        </div>
        <input
            ref="input"
            type="text"
            class="form-control rounded-360 modal-list-search-input"
            :placeholder="`${$t('search by')} ${$t(title)}` | capitalize"
            @keypress.enter="applyFilter"
        />
        <div class="input-group-append modal-list-search-apply cursor-pointer" @click="applyFilter">
            <span class="input-group-text">
                <i class="fa fa-search" aria-hidden="true" />
            </span>
        </div>
        <div class="input-group-append cursor-pointer" @click="cleanFilterValue">
            <span class="input-group-text">
                <i class="fas fa-times" aria-hidden="true" />
            </span>
        </div>
    </div>
</template>

<script>
    export default {
        props: {
            title: { type: String, required: true },
        },
        methods: {
            applyFilter() {
                this.$emit('filter', this.$refs.input.value);
            },
            cleanFilterValue() {
                this.$refs.input.value = '';
                this.applyFilter();
            },
        },
    };
</script>
