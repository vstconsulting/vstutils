<template>
    <ol class="breadcrumb float-sm-right">
        <li
            v-for="(breadcrumb, idx) in breadcrumbs"
            :key="idx"
            class="breadcrumb-item"
            :class="{ active: !breadcrumb.link }"
        >
            <template v-if="breadcrumb.link">
                <router-link :to="breadcrumb.link">
                    <!-- FIXME index not defined
                    <template v-if="index">
                        {{ $t(breadcrumb.name.toLowerCase()) }}
                    </template>
                    <template v-else>
                        {{ $t(breadcrumb.name.toLowerCase()) | capitalize }}
                    </template> -->
                    <template>
                        {{ $t(breadcrumb.name.toLowerCase()) | capitalize }}
                    </template>
                </router-link>
            </template>
            <template v-else>
                {{ $t(breadcrumb.name.toLowerCase()) }}
            </template>
        </li>
    </ol>
</template>

<script>
    export default {
        name: 'breadcrumbs',
        props: ['breadcrumbs'],
    };
</script>

<style scoped></style>
