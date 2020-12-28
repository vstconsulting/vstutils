<template>
    <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
            <li
                v-for="(item, idx) in items"
                :key="idx"
                class="breadcrumb-item"
                :class="{ active: !item.link }"
            >
                <template v-if="item.link">
                    <router-link :to="item.link">
                        {{ $t(item.name.toLowerCase()) | capitalize }}
                    </router-link>
                </template>
                <template v-else>
                    {{ $t(item.name.toLowerCase()) | capitalize }}
                </template>
            </li>
        </ol>
    </nav>
</template>

<script>
    export default {
        name: 'Breadcrumbs',
        props: {
            items: { type: Array, required: true },
        },
    };
</script>

<style scoped>
    .breadcrumb {
        background-color: transparent;
    }
    .breadcrumb-item,
    .breadcrumb-item a {
        text-decoration: none;
    }
</style>
