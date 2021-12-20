<template>
    <nav>
        <ul v-if="pagesAmount > 1" class="pagination" :class="paginationClasses">
            <li class="page-item" :class="{ disabled: pageNumber === 1 }">
                <a class="page-link" @click.stop.prevent="$emit('open-page', 1)">
                    <i class="fas fa-angle-double-left" />
                </a>
            </li>
            <li class="page-item" :class="{ disabled: page === 1 }">
                <a class="page-link" @click.stop.prevent="browseBack">
                    <i class="fas fa-angle-left" />
                </a>
            </li>
            <template v-if="!smallScreen && showCurrent < 0">
                <li v-if="pageNumber != 1" class="page-item disabled">
                    <span class="page-link item-dots">…</span>
                </li>
                <li class="page-item">
                    <a
                        class="page-link"
                        style="color: #6c757d"
                        @click.stop.prevent="page = pageNumber"
                        v-text="pageNumber"
                    />
                </li>
                <li class="page-item disabled">
                    <span class="page-link item-dots">…</span>
                </li>
            </template>
            <li
                v-for="(item, idx) in items"
                :key="idx"
                class="page-item"
                :class="{ disabled: item.number === pageNumber }"
            >
                <a
                    class="page-link"
                    @click.stop.prevent="$emit('open-page', item.number)"
                    v-text="item.text"
                />
            </li>
            <template v-if="!smallScreen && showCurrent > 0">
                <li class="page-item disabled">
                    <span class="page-link item-dots">…</span>
                </li>
                <li class="page-item">
                    <a
                        class="page-link"
                        style="color: #6c757d"
                        @click.stop.prevent="page = pageNumber"
                        v-text="pageNumber"
                    />
                </li>
                <li v-if="pageNumber != pagesAmount" class="page-item disabled">
                    <span class="page-link item-dots">…</span>
                </li>
            </template>
            <li class="page-item" :class="{ disabled: page === pagesAmount }">
                <a class="page-link" @click.stop.prevent="browseNext">
                    <i class="fas fa-angle-right" />
                </a>
            </li>
            <li class="page-item" :class="{ disabled: pageNumber === pagesAmount }">
                <a class="page-link" @click.stop.prevent="$emit('open-page', pagesAmount)">
                    <i class="fas fa-angle-double-right" />
                </a>
            </li>
        </ul>
    </nav>
</template>

<script>
    export default {
        name: 'Pagination',
        props: {
            count: { type: Number, required: true },
            pageSize: { type: Number, required: true },
            pageNumber: { type: Number, required: true },
            sidesButtonsAmount: {
                type: Number,
                default: 3,
                validator: function (value) {
                    return value > 0;
                },
            },
            classes: { type: [Array, String], default: null },
        },
        data() {
            return {
                page: this.pageNumber,
                showCurrent: 0,
                buttonsAmount: this.sidesButtonsAmount,
                smallScreen: false,
            };
        },
        computed: {
            paginationClasses() {
                const classes = [];
                if (this.classes) {
                    typeof this.classes === 'string'
                        ? classes.push(this.classes)
                        : classes.push(...this.classes);
                }
                if (this.smallScreen) {
                    classes.push('pagination-sm');
                }
                return classes;
            },
            pagesAmount() {
                const amount = Math.ceil(this.count / this.pageSize);
                return Number.isFinite(amount) ? amount : 1;
            },
            items() {
                const totalAmount = this.buttonsAmount * 2;
                const arr = [];
                let start, end;
                if (this.pagesAmount <= totalAmount) {
                    start = 1;
                    end = this.pagesAmount;
                } else {
                    start = Math.max(1, this.page - this.buttonsAmount);
                    end = Math.min(this.page + (totalAmount - this.buttonsAmount), this.pagesAmount);

                    // TODO: make the number of buttons shown the same on both sides
                    // startReal = start - (this.sidesButtonsAmount - (end - this.pageNumber));
                    // endReal = end + (totalAmount - this.sidesButtonsAmount - (this.pageNumber - start));
                }
                for (let number = start; number <= end; number++) {
                    arr.push({ number: number, text: number });
                }
                return arr;
            },
        },
        watch: {
            items(val) {
                if (val.find((item) => item.number === this.pageNumber)) {
                    this.showCurrent = 0;
                    return;
                }
                this.showCurrent = this.pageNumber - this.page;
            },
        },
        mounted() {
            if (window.innerWidth < 600) {
                this.buttonsAmount = 2;
                this.smallScreen = true;
            }
        },
        methods: {
            browseBack() {
                this.page - this.sidesButtonsAmount * 2 < 1
                    ? (this.page = 1)
                    : (this.page -= this.sidesButtonsAmount * 2);
            },
            browseNext() {
                this.page + this.sidesButtonsAmount * 2 > this.pagesAmount
                    ? (this.page = this.pagesAmount)
                    : (this.page += this.sidesButtonsAmount * 2);
            },
        },
    };
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
</style>
