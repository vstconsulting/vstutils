import type { Editor as VueEditor } from '@toast-ui/vue-editor';
import type { Editor, EditorOptions } from '@toast-ui/editor';
import { i18n } from '@/vstutils/translation';
import { computed, defineAsyncComponent, defineComponent, h } from 'vue';
import { getApp } from '@/vstutils/utils';

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
            getApp().darkModeEnabled
                ? // @ts-expect-error Styles are not typed
                  import('@toast-ui/editor/dist/theme/toastui-editor-dark.css')
                : Promise.resolve(),
        ]);
        if (lang) {
            await lang.load(ToastUIEditor.default);
        }
        return readOnly ? ToastUIEditorVue.Viewer : ToastUIEditorVue.Editor;
    });

type ToastUIPlugin = Exclude<EditorOptions['plugins'], undefined>[number];

const selectFilePlugin: ToastUIPlugin = (ctx) => {
    ctx.eventEmitter.addEventType('select-file');
    return {
        toolbarItems: [
            {
                groupIndex: 0,
                itemIndex: 0,
                item: {
                    name: 'select-file',
                    tooltip: i18n.ts('Select file'),
                    command: 'select-file',
                    className: 'btn fas fa-file-alt',
                },
            },
        ],
        wysiwygCommands: {
            'select-file': () => {
                ctx.eventEmitter.emit('select-file');
                return true;
            },
        },
    };
};

function selectMarkdownFile() {
    return new Promise<string>((resolve, reject) => {
        const input = document.createElement('input');
        input.accept = '.md,text/markdown';
        input.type = 'file';

        input.addEventListener('change', () => {
            const file = input.files?.[0];

            if (file) {
                file.text()
                    .then((result) => resolve(result))
                    .catch((err) => reject(err));
            }
        });

        input.click();
    });
}

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

        const options: Omit<EditorOptions, 'el'> = {
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
            theme: getApp().darkModeEnabled ? 'dark' : 'light',
            plugins: [selectFilePlugin],
            hooks: {
                // @ts-expect-error Custom hook
                'select-file': async () => {
                    const content = await selectMarkdownFile();
                    emit('change', content);
                    editor?.invoke('setMarkdown', content);
                },
            },
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
