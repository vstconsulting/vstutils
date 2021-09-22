<template>
    <nav>
        <ul v-if="pagesAmount > 1" class="pagination" :class="classes">
            <li class="page-item" :class="{ disabled: pageNumber === 1 }">
                <a class="page-link" @click.stop.prevent="$emit('open-page', 1)">
                    <i class="fas fa-angle-double-left" />
                </a>
            </li>
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
        computed: {
            pagesAmount() {
                const amount = Math.ceil(this.count / this.pageSize);
                return Number.isFinite(amount) ? amount : 1;
            },
            items() {
                const totalAmount = this.sidesButtonsAmount * 2;
                const arr = [];
                let start, end;
                if (this.pagesAmount <= totalAmount) {
                    start = 1;
                    end = this.pagesAmount;
                } else {
                    start = Math.max(1, this.pageNumber - this.sidesButtonsAmount);
                    end = Math.min(
                        this.pageNumber + (totalAmount - this.sidesButtonsAmount),
                        this.pagesAmount,
                    );

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
    };
</script>

<style scoped>
    .page-item {
        cursor: pointer;
    }
</style>
