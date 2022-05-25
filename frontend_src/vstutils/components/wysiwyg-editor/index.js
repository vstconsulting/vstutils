const langs = new Map([
    ['ru', { code: 'ru-RU', load: () => import('@toast-ui/editor/dist/i18n/ru-ru') }],
    ['cn', { code: 'zh-CN', load: () => import('@toast-ui/editor/dist/i18n/zh-cn') }],
    ['en', { code: 'en-US', load: () => Promise.resolve() }],
    [
        'vi',
        { code: 'vi', load: (ToastUIEditor) => import('./vi.js').then((vi) => vi.default(ToastUIEditor)) },
    ],
]);

const realComponent = (readOnly, lang) => async () => {
    const [ToastUIEditor, ToastUIEditorVue] = await Promise.all([
        import('@toast-ui/editor'),
        import('@toast-ui/vue-editor'),
        import('@toast-ui/editor/dist/toastui-editor.css'),
    ]);
    if (lang) {
        await lang.load(ToastUIEditor.default);
    }
    return readOnly ? ToastUIEditorVue.Viewer : ToastUIEditorVue.Editor;
};

/** @vue/component */
export const WYSIWYGEditor = {
    name: 'WYSIWYGEditor',
    props: {
        readOnly: { type: Boolean, default: false },
        initialValue: { type: String, default: null },
    },
    data() {
        return {
            options: {
                minHeight: '200px',
                language: langs.get(this.$i18n.locale)?.code,
                useCommandShortcut: true,
                usageStatistics: false,
                hideModeSwitch: true,
                toolbarItems: [
                    ['heading', 'bold', 'italic', 'strike'],
                    ['hr', 'quote'],
                    ['ul', 'ol', 'task', 'indent', 'outdent'],
                    ['table', 'link'],
                ],
            },
        };
    },
    computed: {
        realComponent() {
            return realComponent(this.readOnly, langs.get(this.$i18n.locale));
        },
    },
    methods: {
        blurHandler() {
            this.$emit('change', this.$refs.editor.invoke('getMarkdown'));
        },
    },
    render(h) {
        return h(this.realComponent, {
            ref: 'editor',
            props: {
                initialValue: this.initialValue,
                initialEditType: 'wysiwyg',
                options: this.options,
            },
            on: {
                blur: this.blurHandler,
            },
        });
    },
};
