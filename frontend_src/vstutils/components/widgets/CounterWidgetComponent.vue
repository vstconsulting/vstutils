<template>
    <div v-if="item.active" class="col-lg-2 col-6 dnd-block">
        <div class="small-box bg-info cursor-move1">
            <div class="inner">
                <transition name="slide-fade" mode="out-in">
                    <div :key="value">
                        <h3>{{ value }}&nbsp;</h3>
                    </div>
                </transition>
                <p>
                    {{ $tc((item.title || item.name).toLowerCase(), value) | capitalize }}
                </p>
            </div>
            <div class="icon hidden-xs" style="top: 0;">
                <i class="fa fa-cog" />
            </div>
            <template v-if="item.url">
                <router-link :to="item.url" class="small-box-footer">
                    {{ $t('more info') | capitalize }}
                    <i class="fa fa-arrow-circle-right" />
                </router-link>
            </template>
            <template v-else>
                <i class="small-box-footer">&nbsp;</i>
            </template>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'CounterWidgetComponent',
        props: {
            item: Object,
            value: {
                type: Number,
                default: 0,
            },
        },
    };
</script>

<style scoped></style>
