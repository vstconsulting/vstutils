import runner from './TestsRunner.js';
import { guiTests } from './GUITests.js';

const spa = window.spa;
const randomString = spa.utils.randomString;

/**
 * File with tests for /user/ view.
 */

runner.module('guiViews[user]', undefined, () => {
    let list_path = '/user/';
    let page_path = list_path + `{${spa.utils.path_pk_key}}/`;
    let instancesInfo = guiTests.getEmptyInstancesInfo();

    /////////////////////////////////////////////////////////////////
    // Test for set of /user/ views (list, page_new, page, page_edit)
    /////////////////////////////////////////////////////////////////
    guiTests.testSetOfViews(
        list_path,
        instancesInfo,
        {
            new: [
                {
                    is_valid: true,
                    data: {
                        username: { value: randomString(6) },
                        is_active: { value: true },
                        is_staff: { value: true },
                        first_name: { value: randomString(6) },
                        last_name: { value: randomString(6) },
                        email: { value: randomString(6) + '@mail.com' },
                        password: { value: 'password' },
                        password2: { value: 'password' },
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        username: {
                            value: randomString(6) + randomString(6),
                        },
                    },
                },
                {
                    is_valid: true,
                    data: { first_name: { value: 'Qwerty' } },
                },
            ],
        },
        true,
    );

    ////////////////////////////////////////////////////////////////////////////////
    // Tests for /user/{pk}/copy/ view
    ////////////////////////////////////////////////////////////////////////////////
    guiTests.copyInstanceFromPageView(page_path, instancesInfo, {
        is_valid: true,
        remove: true,
        data: {
            username: { value: 'copied-' + randomString(6) },
            is_active: { value: true },
        },
    });

    ////////////////////////////////////////////////////////////////////////////////
    // Tests for /user/{pk}/change_password/ view
    ////////////////////////////////////////////////////////////////////////////////
    guiTests.openPage(page_path, instancesInfo.url_params, true);
    guiTests.clickAndWaitRedirect('.btn-action-change_password', true);
    guiTests.click('.btn-operation-generate_password');
    guiTests.setValues(page_path + 'change_password/', {
        old_password: { value: 'password' },
    });
    guiTests.clickAndWaitRedirect('.btn-operation-execute', true);

    ////////////////////////////////////////////////////////////////////////////////
    // Test, that deletes created during tests user instance.
    ////////////////////////////////////////////////////////////////////////////////
    guiTests.testRemovePageViewInstance(list_path + '{' + spa.utils.path_pk_key + '}/', instancesInfo, true);
});

runner.module('guiViews[profile]', undefined, () => {
    let instancesInfo = guiTests.getEmptyInstancesInfo();

    /////////////////////////////////////////////////////////////////
    // Test for /profile/ view
    /////////////////////////////////////////////////////////////////
    guiTests.testPageView('/profile/', instancesInfo, true);

    /////////////////////////////////////////////////////////////////
    // Test for /profile/edit/ view
    /////////////////////////////////////////////////////////////////
    guiTests.openPage('/profile/edit/', instancesInfo.url_params);
});
