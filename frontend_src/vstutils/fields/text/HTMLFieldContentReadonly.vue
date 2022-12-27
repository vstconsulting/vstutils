<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="scroll html_content" v-html="value" />
</template>

<script lang="ts">
    import { FieldReadonlyPropsDef, type FieldReadonlyPropsDefType } from '@/vstutils/fields/base';
    import type { HTMLField } from './HTMLField';

    export default {
        props: FieldReadonlyPropsDef as FieldReadonlyPropsDefType<HTMLField>,
    };
</script>

<style scoped lang="scss">
    .scroll {
        overflow-x: auto;
    }

    .html_content::v-deep {
        img {
            max-width: 60%;
            vertical-align: baseline;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
            padding-bottom: 0.3em;
            border-bottom: 1px solid #eaecef;
            font-weight: bold;
        }

        h1 {
            font-size: 1.75em;
        }

        h2 {
            font-size: 1.5em;
        }

        h3 {
            font-size: 1.25em;
        }

        h4 {
            font-size: 1em;
        }

        h5 {
            font-size: 0.75em;
        }

        h6 {
            font-size: 0.5em;
        }

        code {
            padding: 5px;
            overflow: auto;
            line-height: 1.45;
            background-color: #f6f8fa;
            border-radius: 3px;
            color: #032f62;
        }

        tt {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            background-color: rgba(27, 31, 35, 0.05);
            border-radius: 3px;
        }

        dt {
            padding: 0;
            margin-top: 16px;
            font-size: 1em;
            font-style: italic;
            font-weight: 600;
            display: block;
        }

        dd {
            padding: 0 16px;
            margin-bottom: 16px;
            margin-left: 0;
            display: block;
            margin-inline-start: 30px;
            box-sizing: border-box;
        }

        table {
            overflow: auto;
            margin-top: 0;
            margin-bottom: 16px;
            border-spacing: 2px;
        }

        table.field-list,
        table.option-list {
            display: block;
            width: 100%;
        }

        table th,
        table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
            display: table-cell;
            vertical-align: inherit;
        }

        table th {
            font-weight: 600;
        }

        table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }

        kbd {
            display: inline-block;
            padding: 3px 5px;
            font-size: 11px;
            line-height: 10px;
            color: #000000;
            vertical-align: middle;
            background-color: #fafbfc;
            border: solid 1px #c6cbd1;
            border-bottom-color: #959da5;
            border-radius: 3px;
            box-shadow: inset 0 -1px 0 #959da5;
        }

        blockquote {
            padding: 10px 20px;
            margin: 0 0 20px;
            font-size: 17.5px;
            border-left: 5px solid #eee;
            color: #6a737d;
        }

        table.footnote,
        table.citation {
            border: 1px solid #dfe2e5;
        }

        table.footnote th.label,
        table.footnote td.label,
        table.citation th.label,
        table.citation td.label {
            display: table-cell;
            padding: 0.2em 0.6em 0.3em;
            font-size: 90%;
            font-weight: 600;
            line-height: inherit;
            color: #333;
            text-align: center;
            white-space: nowrap;
            vertical-align: middle;
        }

        @media (max-width: 1220px) {
            img {
                max-width: 70%;
            }
        }

        @media (max-width: 920px) {
            img {
                max-width: 100%;
            }
        }
    }
</style>
