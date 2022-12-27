import type { Editor as VueEditor } from '@toast-ui/vue-editor';
import type { Editor } from '@toast-ui/editor';
import { i18n } from '@/vstutils/translation';
import { computed, defineAsyncComponent, defineComponent, h } from 'vue';

interface LangInfo {
    code: string;
    load: (ToastUIEditor: typeof Editor) => Promise<void>;
}

const langs = new Map<string, LangInfo>([
    // @ts-expect-error Translations are not typed
    ['ru', { code: 'ru-RU', load: () => import('@toast-ui/editor/dist/i18n/ru-ru') }],
    // @ts-expect-error Translations are not typed
    ['cn', { code: 'zh-CN', load: () => import('@toast-ui/editor/dist/i18n/zh-cn') }],
    ['en', { code: 'en-US', load: () => Promise.resolve() }],
    [
        'vi',
        {
            code: 'vi',
            load: (ToastUIEditor) => import('./vi').then((vi) => vi.default(ToastUIEditor)),
        },
    ],
]);

const realComponent = (readOnly: boolean, lang?: LangInfo) =>
    defineAsyncComponent(async () => {
        const [ToastUIEditor, ToastUIEditorVue] = await Promise.all([
            import('@toast-ui/editor'),
            import('@toast-ui/vue-editor'),
            // @ts-expect-error Styles are not typed
            import('@toast-ui/editor/dist/toastui-editor.css'),
        ]);
        if (lang) {
            await lang.load(ToastUIEditor.default);
        }
        return readOnly ? ToastUIEditorVue.Viewer : ToastUIEditorVue.Editor;
    });

export const WYSIWYGEditor = defineComponent({
    name: 'WYSIWYGEditor',
    props: {
        readOnly: { type: Boolean, default: false },
        initialValue: { type: String, default: null },
    },
    emits: {
        change: (value: string) => true,
    },
    setup(props, { emit }) {
        let editor: VueEditor | null = null;

        const options = {
            minHeight: '200px',
            language: langs.get(i18n.locale)?.code,
            useCommandShortcut: true,
            usageStatistics: false,
            hideModeSwitch: true,
            toolbarItems: [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task', 'indent', 'outdent'],
                ['table', 'link'],
            ],
        };

        const component = computed(() => realComponent(props.readOnly, langs.get(i18n.locale)));

        function blurHandler() {
            emit('change', editor!.invoke('getMarkdown'));
        }

        return () =>
            h(component.value, {
                ref: (ref) => (editor = ref as VueEditor),
                props: {
                    initialValue: props.initialValue,
                    initialEditType: 'wysiwyg',
                    options,
                },
                on: {
                    blur: blurHandler,
                },
            });
    },
});
