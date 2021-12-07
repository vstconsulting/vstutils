import { expect, jest, test, describe, it } from '@jest/globals';
import { Model, ModelClass } from '../Model.js';
import StringField from '../../fields/text/StringField.js';
import { IntegerField } from '../../fields/numbers/integer.js';
import JSONField from '../../fields/json/JSONField.js';

const emailField = new StringField({ name: 'email', maxLength: 60 });
const firstNameField = new StringField({ name: 'firstName' });
const ageField = new IntegerField({ name: 'age' });
const settingsField = new JSONField({ name: 'settings' });

describe('Model', () => {
    @ModelClass('AbstractUser')
    class AbstractUser extends Model {
        static declaredFields = [emailField];
    }

    @ModelClass()
    class User extends AbstractUser {
        static declaredFields = [firstNameField, ageField, settingsField];
    }

    it('should have name', () => {
        const abstractUser = new AbstractUser();
        const user = new User();

        expect(AbstractUser.name).toBe('AbstractUser');
        expect(User.name).toBe('User');

        expect(abstractUser._name).toBe('AbstractUser');
        expect(user._name).toBe('User');

        @ModelClass()
        class Nameless extends Model {}
        const nameless = new Nameless();
        expect(Nameless.name).toBe('Nameless');
        expect(nameless._name).toBe('Nameless');
    });

    it('should keep fields order', () => {
        const expectedAbstractUserFields = [['email', emailField]];
        const expectedUserFields = [
            ['email', emailField],
            ['firstName', firstNameField],
            ['age', ageField],
            ['settings', settingsField],
        ];

        expect(Array.from(AbstractUser.fields)).toEqual(expectedAbstractUserFields);
        expect(Array.from(User.fields)).toEqual(expectedUserFields);

        const abstractUser = new AbstractUser();
        const user = new User();

        expect(Array.from(abstractUser._fields)).toEqual(expectedAbstractUserFields);
        expect(Array.from(user._fields)).toEqual(expectedUserFields);
    });

    test('fields data access', () => {
        const user = new User({
            age: 22,
            settings: { param1: 'value1', param2: 2 },
            email: 'name@domain.com',
        });

        // Simple getting 'toRepresent' value
        expect(user.firstName).toBeUndefined();
        expect(user.age).toBe(22);
        expect(user.settings).toStrictEqual({ param1: 'value1', param2: 2 });
        expect(user.email).toBe('name@domain.com');
        expect(user['email']).toBe('name@domain.com');

        // Set value and check that 'toInner' is invoked
        const settingsSpy = jest.spyOn(user._fields.get('settings'), 'toInner');
        user.settings = { param1: 'value2', param2: 2, param3: false };
        expect(settingsSpy).toBeCalledTimes(1);
        expect(user.settings).toStrictEqual({ param1: 'value2', param2: 2, param3: false });

        // Check inner values
        expect(user._getInnerData()).toStrictEqual({
            email: 'name@domain.com',
            age: 22,
            settings: { param1: 'value2', param2: 2, param3: false },
        });

        expect(user._getInnerData(['email', 'age'])).toStrictEqual({
            email: 'name@domain.com',
            age: 22,
        });

        // Check represent values
        expect(user._getRepresentData()).toStrictEqual({
            email: 'name@domain.com',
            firstName: undefined,
            age: 22,
            settings: { param1: 'value2', param2: 2, param3: false },
        });
        // Check validation data
        user._validateAndSetData({
            email: 'test@mail.com',
            firstName: 'Alex',
            age: 30,
            settings: { param1: 'value2', param2: 2, param3: false },
        });
        expect(user.email).toBe('test@mail.com');
        expect(user.age).toBe(30);
        expect(user.firstName).toBe('Alex');

        // Check _setFieldValue
        const emailSpy = jest.spyOn(user._fields.get('email'), 'toInner');
        user._setFieldValue('email', 'name1@user.com');
        user._setFieldValue('email', 'name2@user.com');
        expect(emailSpy).toBeCalledTimes(2);
        user._setFieldValue('email', 'test@mail.com', true);
        expect(emailSpy).toBeCalledTimes(2);

        // Check invalid fields
        emailField.options.maxLength = 1;
        expect(() => user._validateAndSetData({ email: 'invalid@mail.com' })).toThrow();
        expect(user.email).toBe('test@mail.com');
    });

    test('pk field', () => {
        const id = new StringField({ name: 'id' });
        const field1 = new StringField({ name: 'field1' });
        const field2 = new StringField({ name: 'field2' });

        @ModelClass()
        class Model1 extends Model {
            static declaredFields = [field2];
        }
        expect(Model1.pkField).toBe(field2);

        @ModelClass()
        class Model2 extends Model1 {
            static pkFieldName = 'field1';
            static declaredFields = [field1];
        }
        expect(Model2.pkField).toBe(field1);

        @ModelClass()
        class Model3 extends Model1 {
            static declaredFields = [field1];
        }
        expect(Model3.pkField).toBe(field2);
        expect(new Model3({ id: 1, field2: 'value' }).getPkValue()).toBe('value');

        @ModelClass()
        class Model4 extends Model1 {
            static declaredFields = [id];
            static pkFieldName = 'id';
        }
        expect(Model4.pkField).toBe(id);
        expect(new Model4({ id: 1, field2: 'value' }).getPkValue()).toBe(1);

        // pkFieldParameters check
        const modelInstance = new Model4({ id: 1 });
        const pkFieldResult = modelInstance._pkField;
        expect(pkFieldResult).toEqual(id);
    });

    test('view field', () => {
        const name = new StringField({ name: 'name', required: true });
        const field1 = new StringField({ name: 'field1' });

        @ModelClass()
        class Model1 extends Model {
            static declaredFields = [name];
        }
        expect(Model1.viewField).toBe(name);
        expect(new Model1({ name: 'name value', field1: 'value' }).getViewFieldValue()).toBe('name value');
        expect(new Model1({ name: 'name value', field1: 'value' }).getViewFieldString()).toBe('name value');
        expect(new Model1({ name: '<script>alert()</script>', field1: 'value' }).getViewFieldString()).toBe(
            '&lt;script&gt;alert()&lt;/script&gt;',
        );

        @ModelClass()
        class Model2 extends Model1 {
            static viewFieldName = 'field1';
            static declaredFields = [field1];
        }
        expect(Model2.viewField).toBe(field1);
        expect(new Model2({ name: 'name value', field1: 'value' }).getViewFieldValue('default')).toBe(
            'value',
        );

        @ModelClass()
        class NoViewField extends Model {}
        expect(NoViewField.viewField).toBeNull();
        expect(new NoViewField().getViewFieldValue('default')).toBe('default');

        @ModelClass()
        class Model3 extends Model {
            static declaredFields = [name];
        }
        const ModelInst = new Model1();
        expect(new Model3({ name: ModelInst }).getViewFieldString()).toBe('');
        // Check value field is null
        expect(new Model3({ name: null }).getViewFieldString());
    });

    test('test parent instance', () => {
        const id = new StringField({ name: 'id' });
        const name = new StringField({ name: 'name' });

        @ModelClass()
        class RetrieveModel extends Model {
            static declaredFields = [id, name];
        }

        @ModelClass()
        class UpdateModel extends Model {
            static declaredFields = [name];
        }

        const retrieveInstance = new RetrieveModel({ id: 1, name: 'Eugene' });
        const updateModel = new UpdateModel({ name: 'Eugene' }, null, retrieveInstance);

        expect(updateModel.getPkValue()).toBe(1);
    });

    test('isEqual', () => {
        const user1 = new AbstractUser({ email: 'user1@users.com' });
        expect(user1.isEqual(new AbstractUser({ email: 'user1@users.com' }))).toBeTruthy();
        expect(user1.isEqual(new User({ email: 'user1@users.com' }))).toBeFalsy();

        expect(user1.isEqual({ email: 'user1@users.com' })).toBeTruthy();
        expect(user1.isEqual({ email: 'otheruser@users.com' })).toBeFalsy();
    });

    test('parseModelError', () => {
        const user = new User({});
        expect(user.parseModelError(undefined)).toBeUndefined();
        expect(user.parseModelError(null)).toBeUndefined();
        expect(user.parseModelError([])).toBeUndefined();
        expect(user.parseModelError({})).toBeUndefined();

        const modelError = user.parseModelError({
            age: 'err 1',
            firstName: ['err 2', 'err 3'],
            non_existing_field: 'asd',
        });
        expect(modelError).toBeDefined();
        expect(modelError.errors.length).toBe(2);
        expect(modelError.errors).toContainEqual({
            field: User.fields.get('age'),
            message: 'err 1',
        });
        expect(modelError.errors).toContainEqual({
            field: User.fields.get('firstName'),
            message: 'err 2 err 3',
        });
    });
});
