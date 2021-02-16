import { expect, jest, test, describe } from '@jest/globals';
import ErrorHandler from '../ErrorHandler.js';
import { ModelValidationError } from '../../models/Model';
import { StringField } from '../../fields/text';
import { guiPopUp } from '../PopUp';

jest.mock('../PopUp');

describe('Error Handler', () => {
    test('error to string', () => {
        const handler = new ErrorHandler();
        expect(handler.errorToString('string')).toBe('string');

        const error = new Error('error_detail');
        expect(handler.errorToString(error)).toBe('error_detail');

        const modelError = new ModelValidationError([
            {
                field: new StringField({
                    name: 'name',
                    title: 'Name',
                    format: 'string',
                }),
                message: 'model_error',
            },
        ]);
        expect(handler.errorToString(modelError)).toBe('<b>Name</b>: model_error');

        expect(handler.errorToString()).toBe('Unknown error');
        expect(handler.errorToString([''])).toBe('Unknown error');

        const objError = { data: { detail: 'objError' } };
        expect(handler.errorToString(objError)).toBe('objError');

        const detailOjbError = {
            data: { detail: { key: 'invalid', detail: ['invalid string', 'valid required'] } },
        };
        expect(handler.errorToString(detailOjbError)).toBe(
            '<br><b>key</b>: invalid<br><b>detail</b>: invalid string<br>valid required',
        );

        const errorMessageError = { message: { other_errors: 'message' } };
        expect(handler.errorToString(errorMessageError)).toBe('message');

        const errorMessageArrayError = { message: { other_errors: ['error1', 'error2'] } };
        expect(handler.errorToString(errorMessageArrayError)).toBe('error1<br/>error2');

        const objDataError = { data: { random: 'random' } };
        expect(handler.errorToString(objDataError)).toBe('<br><b>random</b>: random');

        global.console = { error: jest.fn() };

        handler.defineErrorAndShow('Err 1');
        handler.showError('Err 1', 'console');

        expect(guiPopUp.error).toBeCalledTimes(2);
        expect(global.console.error).toBeCalledTimes(2);
    });
});
