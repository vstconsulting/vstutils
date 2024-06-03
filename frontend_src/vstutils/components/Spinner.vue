<template>
    <span class="loader" />
</template>

<style scoped>
    .loader {
        --color: 0 0 0;

        font-size: 10px;
        width: 1em;
        height: 1em;
        border-radius: 50%;
        position: relative;
        text-indent: -9999em;
        animation: spinner 1.1s infinite ease;
        transform: translateZ(0);
    }
    @keyframes spinner {
        0%,
        100% {
            box-shadow: 0 -2.6em 0 0 #fff, 1.8em -1.8em 0 0 rgb(var(--color) / 20%),
                2.5em 0 0 0 rgb(var(--color) / 20%), 1.75em 1.75em 0 0 rgb(var(--color) / 20%),
                0 2.5em 0 0 rgb(var(--color) / 20%), -1.8em 1.8em 0 0 rgb(var(--color) / 20%),
                -2.6em 0 0 0 rgb(var(--color) / 50%), -1.8em -1.8em 0 0 rgb(var(--color) / 70%);
        }

        12.5% {
            box-shadow: 0 -2.6em 0 0 rgb(var(--color) / 70%), 1.8em -1.8em 0 0 #fff,
                2.5em 0 0 0 rgb(var(--color) / 20%), 1.75em 1.75em 0 0 rgb(var(--color) / 20%),
                0 2.5em 0 0 rgb(var(--color) / 20%), -1.8em 1.8em 0 0 rgb(var(--color) / 20%),
                -2.6em 0 0 0 rgb(var(--color) / 20%), -1.8em -1.8em 0 0 rgb(var(--color) / 50%);
        }

        25% {
            box-shadow: 0 -2.6em 0 0 rgb(var(--color) / 50%), 1.8em -1.8em 0 0 rgb(var(--color) / 70%),
                2.5em 0 0 0 #fff, 1.75em 1.75em 0 0 rgb(var(--color) / 20%),
                0 2.5em 0 0 rgb(var(--color) / 20%), -1.8em 1.8em 0 0 rgb(var(--color) / 20%),
                -2.6em 0 0 0 rgb(var(--color) / 20%), -1.8em -1.8em 0 0 rgb(var(--color) / 20%);
        }

        37.5% {
            box-shadow: 0 -2.6em 0 0 rgb(var(--color) / 20%), 1.8em -1.8em 0 0 rgb(var(--color) / 50%),
                2.5em 0 0 0 rgb(var(--color) / 70%), 1.75em 1.75em 0 0 #fff,
                0 2.5em 0 0 rgb(var(--color) / 20%), -1.8em 1.8em 0 0 rgb(var(--color) / 20%),
                -2.6em 0 0 0 rgb(var(--color) / 20%), -1.8em -1.8em 0 0 rgb(var(--color) / 20%);
        }

        50% {
            box-shadow: 0 -2.6em 0 0 rgb(var(--color) / 20%), 1.8em -1.8em 0 0 rgb(var(--color) / 20%),
                2.5em 0 0 0 rgb(var(--color) / 50%), 1.75em 1.75em 0 0 rgb(var(--color) / 70%),
                0 2.5em 0 0 #fff, -1.8em 1.8em 0 0 rgb(var(--color) / 20%),
                -2.6em 0 0 0 rgb(var(--color) / 20%), -1.8em -1.8em 0 0 rgb(var(--color) / 20%);
        }

        62.5% {
            box-shadow: 0 -2.6em 0 0 rgb(var(--color) / 20%), 1.8em -1.8em 0 0 rgb(var(--color) / 20%),
                2.5em 0 0 0 rgb(var(--color) / 20%), 1.75em 1.75em 0 0 rgb(var(--color) / 50%),
                0 2.5em 0 0 rgb(var(--color) / 70%), -1.8em 1.8em 0 0 #fff,
                -2.6em 0 0 0 rgb(var(--color) / 20%), -1.8em -1.8em 0 0 rgb(var(--color) / 20%);
        }

        75% {
            box-shadow: 0 -2.6em 0 0 rgb(var(--color) / 20%), 1.8em -1.8em 0 0 rgb(var(--color) / 20%),
                2.5em 0 0 0 rgb(var(--color) / 20%), 1.75em 1.75em 0 0 rgb(var(--color) / 20%),
                0 2.5em 0 0 rgb(var(--color) / 50%), -1.8em 1.8em 0 0 rgb(var(--color) / 70%),
                -2.6em 0 0 0 #fff, -1.8em -1.8em 0 0 rgb(var(--color) / 20%);
        }

        87.5% {
            box-shadow: 0 -2.6em 0 0 rgb(var(--color) / 20%), 1.8em -1.8em 0 0 rgb(var(--color) / 20%),
                2.5em 0 0 0 rgb(var(--color) / 20%), 1.75em 1.75em 0 0 rgb(var(--color) / 20%),
                0 2.5em 0 0 rgb(var(--color) / 20%), -1.8em 1.8em 0 0 rgb(var(--color) / 50%),
                -2.6em 0 0 0 rgb(var(--color) / 70%), -1.8em -1.8em 0 0 #fff;
        }
    }
</style>
