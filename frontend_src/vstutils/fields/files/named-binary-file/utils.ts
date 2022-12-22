import { i18n } from '@/vstutils/translation';
import type { Ref } from 'vue';
import { computed } from 'vue';

export interface NamedFile {
    name?: string | null;
    mediaType?: string | null;
    content: string;
}

export function useNamedFileText(file: Ref<NamedFile | undefined | null>) {
    return computed(() => {
        if (file.value?.content) {
            return file.value.name || i18n.tc('file n selected', 1);
        }
        return '';
    });
}

export function ensureMediaTypeExists<T = NamedFile | null | undefined>(value: T): T {
    if (value && typeof value === 'object' && !('mediaType' in value)) {
        value = { ...value, mediaType: null };
    }
    return value;
}
