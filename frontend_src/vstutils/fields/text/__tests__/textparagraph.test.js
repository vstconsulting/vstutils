import { expect, test, describe } from '@jest/globals';
import TextParagraphField from '../TextParagraphField';

describe('TextParagraphField', () => {
    test('check represent field', () => {
        const textParagraphField = new TextParagraphField({
            name: 'text_paragraph',
            default: 'some text',
        });

        expect(textParagraphField.toRepresent({})).toBe('some text');
        expect(textParagraphField.toRepresent()).toBe('some text');
        expect(textParagraphField.toRepresent({ text_paragraph: ['Some', 'another', 'Text'] })).toBe(
            'Some another Text',
        );
        expect(textParagraphField.toRepresent({ text_paragraph: { test: 1 } })).toBe('{"test":1}');
        expect(textParagraphField.toRepresent({ text_paragraph: 'Text' })).toBe('Text');
    });
});
