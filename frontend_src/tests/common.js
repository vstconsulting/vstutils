import runner from './TestsRunner.js';

const spa = window.spa;

runner.module('guiCommon');

/**
 * Test for 'stringToBoolean()' function.
 */
runner.test('stringToBoolean', (assert) => {
    assert.ok(spa.utils.stringToBoolean('true'), 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('True'), 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('TRUE'), 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('yes'), 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('Yes'), 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('YES'), 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('1'), 'stringToBoolean');

    assert.ok(spa.utils.stringToBoolean('false') === false, 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('False') === false, 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('FALSE') === false, 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('no') === false, 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('No') === false, 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('NO') === false, 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean('0') === false, 'stringToBoolean');
    assert.ok(spa.utils.stringToBoolean(null) === false, 'stringToBoolean');
});

/**
 * Test for guiLocalSettings object.
 */
runner.test('guiLocalSettings', (assert) => {
    let test_settings = {
        test_1: true,
        test_2: 'string',
        test_3: 1,
        test_4: {
            prop_1: 1,
            prop_2: false,
            prop_3: 'str',
            prop_4: ['sdf', 'fdgs', true, 12, { abc: '123' }],
        },
    };

    let test_tmp_settings_existing = {
        test_1: false,
        test_2: '',
        test_3: 0,
    };

    let test_tmp_settings_unexisting = {
        test_8: true,
        test_9: 'qwerty',
    };

    // checks setting and getting of value to guiLocalSettings
    for (let key in test_settings) {
        spa.utils.guiLocalSettings.set(key, test_settings[key]);
        assert.ok(
            spa.utils.deepEqual(spa.utils.guiLocalSettings.get(key), test_settings[key]),
            'guiLocalSettings.set & guiLocalSettings.get',
        );
    }

    // checks setting as tmp values of existing before settings
    for (let key in test_tmp_settings_existing) {
        spa.utils.guiLocalSettings.setAsTmp(key, test_tmp_settings_existing[key]);
        assert.ok(
            spa.utils.deepEqual(spa.utils.guiLocalSettings.get(key), test_tmp_settings_existing[key]),
            'guiLocalSettings.setAsTmp (existing settings) & guiLocalSettings.get',
        );
    }

    // checks setting as tmp values of unexisting before settings
    for (let key in test_tmp_settings_unexisting) {
        spa.utils.guiLocalSettings.setAsTmp(key, test_tmp_settings_unexisting[key]);
        assert.ok(
            spa.utils.deepEqual(spa.utils.guiLocalSettings.get(key), test_tmp_settings_unexisting[key]),
            'guiLocalSettings.setAsTmp (unexisting settings) & guiLocalSettings.get',
        );
    }

    spa.utils.guiLocalSettings.set('test_1', test_settings['test_1']);

    // checks that after guiLocalSettings.set() call non tmp values of settings were saved to local storage
    for (let key in test_settings) {
        assert.ok(
            spa.utils.deepEqual(spa.utils.guiLocalSettings.get(key), test_settings[key]),
            'existing tmp settings were not added to LocalStorage after guiLocalSettings.set',
        );
    }

    // checks that after guiLocalSettings.set() call tmp values of unexisting before settings were not saved to local storage
    for (let key in test_tmp_settings_unexisting) {
        assert.ok(
            spa.utils.guiLocalSettings.get(key) === undefined,
            'tmp unexisting wetting were not added to LocalStorage after guiLocalSettings.set',
        );
    }

    // checks guiLocalSettings.delete
    for (let key in test_settings) {
        spa.utils.guiLocalSettings.delete(key);
        assert.ok(spa.utils.guiLocalSettings.get(key) === undefined, 'delete settings');
    }

    for (let key in test_tmp_settings_unexisting) {
        delete spa.utils.guiLocalSettings.__tmpSettings[key];
    }

    // checks guiLocalSettings.setIfNotExists for a new key
    spa.utils.guiLocalSettings.setIfNotExists('q1w2e3r4t5y6', true);
    assert.ok(spa.utils.guiLocalSettings.get('q1w2e3r4t5y6') === true, 'setIfNotExists - unexisting key');

    // checks guiLocalSettings.setIfNotExists for existing key
    spa.utils.guiLocalSettings.setIfNotExists('q1w2e3r4t5y6', false);
    assert.ok(spa.utils.guiLocalSettings.get('q1w2e3r4t5y6') === true, 'setIfNotExists - existing key');

    spa.utils.guiLocalSettings.delete('q1w2e3r4t5y6');
});

/**
 * Test for 'capitalizeString()' function.
 */
runner.test('capitalizeString', (assert) => {
    let strings = ['hello', 'Hello', 'HELLO', 'hELLO'];

    let answer = 'Hello';

    assert.ok(spa.utils.capitalizeString() === '', 'empty call of capitalizeString');

    strings.forEach((item) => {
        assert.ok(spa.utils.capitalizeString(item) === answer, 'capitalizeString()');
    });
});

/**
 * Test for 'sliceLongString()' function.
 */
runner.test('sliceLongString', function (assert) {
    let short_string = 'string';
    let long_string =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor' +
        ' incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation' +
        ' ullamco laboris nisi ut aliquip ex ea commodo consequat.';
    let args = [false, short_string, long_string];
    let answer = [
        'false',
        'string',
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit,' +
            ' sed do eiusmod tempor incididunt ut labore ...',
    ];

    for (let i in args) {
        assert.strictEqual(spa.utils.sliceLongString(args[i]), answer[i]);
    }

    assert.ok(spa.utils.sliceLongString(short_string, 6) === short_string);
    assert.ok(spa.utils.sliceLongString(short_string, 5) === 'strin...');
});

/**
 * Test for 'isEmptyObject()' function.
 */
runner.test('isEmptyObject', function (assert) {
    let obj = {
        a: 1,
        b: true,
        c: ['string', 2],
    };

    assert.ok(spa.utils.isEmptyObject({}) === true, 'isEmptyObject');
    assert.ok(spa.utils.isEmptyObject(obj) === false, 'isEmptyObject');

    for (let i in obj) {
        delete obj[i];
    }

    assert.ok(spa.utils.isEmptyObject(obj) === true, 'isEmptyObject');
});

/**
 * Test for 'addCssClassesToElement()' function.
 */
runner.test('addCssClassesToElement', function (assert) {
    assert.ok(spa.utils.addCssClassesToElement('td'), 'td');
    assert.ok(spa.utils.addCssClassesToElement('td', 'user'), 'td_user');
    assert.ok(spa.utils.addCssClassesToElement('td', 'user', 'username'), 'td_user_username');
});

/**
 * Test for 'allPropertiesIsObjects()' function.
 */
runner.test('allPropertiesIsObjects', function (assert) {
    let obj = {
        a: 'string',
        b: [1, 2],
        c: {},
    };

    assert.ok(spa.utils.allPropertiesIsObjects(obj) === false, 'allPropertiesIsObjects');

    obj['a'] = { d: 5 };
    assert.ok(spa.utils.allPropertiesIsObjects(obj) === false, 'allPropertiesIsObjects');

    obj['b'] = {};
    assert.ok(spa.utils.allPropertiesIsObjects(obj) === true, 'allPropertiesIsObjects');

    assert.ok(spa.utils.allPropertiesIsObjects({}) === true, 'allPropertiesIsObjects');
});

/**
 * Test for 'hexToRgbA()' function.
 */
runner.test('hexToRgbA', function (assert) {
    let test_values = [
        { hex: 'ffffff', alpha: undefined, rgba: undefined },
        { hex: '#ffffff', alpha: undefined, rgba: 'rgba(255,255,255,1)' },
        { hex: '#ffffff', alpha: 0.8, rgba: 'rgba(255,255,255,0.8)' },
        { hex: '#fDac03', alpha: -1, rgba: 'rgba(253,172,3,1)' },
        { hex: '#fDac03', alpha: 2, rgba: 'rgba(253,172,3,1)' },
    ];

    test_values.forEach((obj) => {
        assert.strictEqual(spa.utils.hexToRgbA(obj.hex, obj.alpha), obj.rgba, 'hexToRgbA()');
    });
});

/**
 * Test for 'String.prototype.format' method.
 */
runner.test('String.prototype.format', function (assert) {
    let test_values = [
        { string: '/user/{0}/', argument: 1, answer: '/user/1/', arg_type: 'number' },
        {
            string: '/user/1/{0}/',
            argument: 'settings',
            answer: '/user/1/settings/',
            arg_type: 'string',
        },
        {
            string: '/user/{0}/{1}/',
            argument: [1, 'settings'],
            answer: '/user/1/settings/',
            arg_type: 'array',
        },
        {
            string: '/user/{pk}/{sublink}/',
            argument: { pk: 1, sublink: 'settings' },
            answer: '/user/1/settings/',
            arg_type: 'object',
        },
    ];

    test_values.forEach((obj) => {
        assert.ok(
            obj.string.format(obj.argument) === obj.answer,
            'String.prototype.format() argument type is ' + obj.arg_type,
        );
    });
});
