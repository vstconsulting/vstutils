import { type Ref, onBeforeUnmount } from 'vue';

export type CustomMatcher = (params: { term?: string }, data: { text?: string }) => string;
export type TemplateResult = (data: { id: string | number; text?: string }) => JQuery | null;
export type TemplateSelection = (data: { id: string | number; text?: string }) => string | JQuery;
export interface SelectedData {
    id: string;
    text: string;
    disabled: boolean;
    element: HTMLOptionElement;
    selected: boolean;
}

export function useSelect2(
    el: Ref<HTMLSelectElement | null>,
    handleChange: (data: SelectedData[], e: JQuery.ChangeEvent) => void,
) {
    let initialized = false;

    function destroy() {
        if (initialized && el.value) {
            // @ts-expect-error Select2
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            $(el.value).select2('destroy');
            initialized = false;
        }
    }

    function init(options: Record<string, any>) {
        if (initialized) {
            destroy();
        }
        if (el.value) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            $(el.value)
                // @ts-expect-error Select2
                .select2({ theme: window.SELECT2_THEME, ...options })
                .on('change', (e: JQuery.ChangeEvent) => {
                    // @ts-expect-error Select2
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                    const value = $(el.value).select2('data') as SelectedData[];
                    handleChange(value, e);
                });
            initialized = true;
        }
    }

    onBeforeUnmount(() => {
        destroy();
    });

    function setValue(value: unknown) {
        // @ts-expect-error Select2
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        $(el.value!).val(value).trigger('change');
    }

    return { init, setValue };
}
