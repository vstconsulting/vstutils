import { i18n } from '@/vstutils/translation';
import { type RawEnumItem, ChoicesField } from './ChoicesField';

class OrderingChoicesField extends ChoicesField {
    translateValue(value: string): string {
        const translated = i18n.t(value) as string;
        if (translated === value) {
            return translated.replace('_', ' ');
        }
        return translated;
    }

    prepareEnumItem(item?: RawEnumItem) {
        const preparedItem = super.prepareEnumItem(item);
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
