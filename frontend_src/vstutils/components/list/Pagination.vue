<template>
    <nav>
        <ul v-if="items && items.length > 1" class="pagination">
            <li
                v-for="(item, idx) in items"
                :key="`${idx}-${item.page}`"
                class="page-item"
                :class="{ disabled: item.disabled }"
            >
                <router-link v-if="item.page" class="page-link" :to="location(item.page)">
                    <span v-if="item.icon"><i :class="item.icon" /></span>
                    {{ item.text }}
                </router-link>
                <a v-else class="page-link" href="#" @click.prevent="item.onClick">
                    <span v-if="item.icon"><i :class="item.icon" /></span>
                    {{ item.text }}
                </a>
            </li>
        </ul>
    </nav>
</template>

<script setup lang="ts">
    import type { Location } from 'vue-router';
    import { useRoute } from 'vue-router/composables';

    const route = useRoute();

    defineProps<{
        items?: {
            page?: number;
            text?: string;
            disabled?: boolean;
            icon?: string | string[];
            onClick?: () => void;
        }[];
    }>();

    function location(page: number): Location {
        return {
            ...route,
            name: route.name || undefined,
            query: { ...route.query, page: page.toString() },
        };
    }
</script>

<style scoped>
    .page-item {
        cursor: pointer;
    }
    .item-dots {
        width: 22px;
        padding-left: 2px;
        padding-right: 2px;
    }
    @media (max-width: 600px) {
        .page-link {
            font-size: 0.875rem;
            padding: 0.25rem 0.5rem;
            line-height: 1.5;
        }
    }
</style>
