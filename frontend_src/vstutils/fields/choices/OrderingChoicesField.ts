import { i18n } from '@/vstutils/translation';
import { ChoicesField } from './';

class OrderingChoicesField extends ChoicesField {
    translateValue(value: string): string {
        const translated = i18n.t(value) as string;
        if (translated === value) {
            return translated.replace('_', ' ');
        }
        return translated;
    }

    prepareEnumItem(item: unknown) {
        const preparedItem = super.prepareEnumItem(item) as { id: unknown; text: string } | undefined;
        if (preparedItem) {
            const hasMinus = preparedItem.text.startsWith('-');
            const text = hasMinus ? preparedItem.text.slice(1) : preparedItem.text;
            const translatedText = this.translateValue(text);
            preparedItem.text = hasMinus ? `⬇ ${translatedText}` : `⬆ ${translatedText}`;
        }
        return preparedItem;
    }
}

export default OrderingChoicesField;
