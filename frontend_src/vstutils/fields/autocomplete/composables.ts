import type { Ref } from 'vue';
import { onMounted } from 'vue';
// @ts-expect-error JavaScript-autoComplete has no types
import autoComplete from 'JavaScript-autoComplete/auto-complete';

interface AutocompleteDropdownParams<T> {
    element: Ref<HTMLInputElement | null>;
    renderItem: (item: T) => string;
    selectItem: (item: HTMLElement) => void;
    filterItems: (search: string, response: (data: T[]) => void) => void;
}

export function useAutocompleteDropdown<T>({
    element,
    renderItem,
    selectItem,
    filterItems,
}: AutocompleteDropdownParams<T>) {
    onMounted(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return new autoComplete({
            selector: element.value,
            minChars: 0,
            delay: 350,
            cache: false,
            showByClick: true,
            renderItem: (item: T, search: string) => {
                return renderItem(item);
            },
            onSelect: (event: unknown, term: unknown, item: HTMLElement) => {
                selectItem(item);
            },
            source: (search: string, response: (data: T[]) => void) => {
                filterItems(search, response);
            },
        });
    });
}
