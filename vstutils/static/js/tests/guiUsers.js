/**
 * File with tests for /user/ view.
 */

/**
 * Tests for views connected with User Model.
 */
window.qunitTestsArray['guiViews[user]'] = {
    test: function() {
        let list_path = '/user/';
        let page_path = list_path + '{' + window.spa.utils.path_pk_key +'}/';
        let instances_info = guiTests.getEmptyInstancesInfo();

        /////////////////////////////////////////////////////////////////
        // Test for set of /user/ views (list, page_new, page, page_edit)
        /////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(list_path, instances_info, {
            new: [
                {
                    is_valid: true,
                    data:{
                        username: {value: window.spa.utils.randomString(6)},
                        is_active: {value: true},
                        is_staff: {value: true},
                        first_name: {value: window.spa.utils.randomString(6)},
                        last_name: {value: window.spa.utils.randomString(6)},
                        email: {value: window.spa.utils.randomString(6) + '@mail.com'},
                        password: {value: 'password'},
                        password2: {value: 'password'},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {username: {value: window.spa.utils.randomString(6) + window.spa.utils.randomString(6)}},
                },
                {
                    is_valid: true,
                    data: {first_name: {value: 'Qwerty',}},
                },
            ],
        }, true);

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /user/{pk}/copy/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.copyInstanceFromPageView(page_path, instances_info, {
            is_valid: true,
            remove: true,
            data: {
                username: {value: 'copied-' + window.spa.utils.randomString(6),},
                is_active: {value: true},
            }
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /user/{pk}/change_password/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.openPage(page_path, instances_info.url_params, true);
        guiTests.clickAndWaitRedirect('.btn-action-change_password', true);
        guiTests.click(".btn-operation-generate_password");
        guiTests.setValues(page_path + 'change_password/', {
            old_password: {value: 'password'},
        });
        guiTests.clickAndWaitRedirect('.btn-operation-execute', true);

        ////////////////////////////////////////////////////////////////////////////////
        // Test, that deletes created during tests user instance.
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.testRemovePageViewInstance(list_path + "{" + window.spa.utils.path_pk_key +"}/", instances_info, true);
    },
};

/**
 * Test for 'profile' views.
 */
window.qunitTestsArray['guiViews[profile]'] = {
    test: function() {
        let instances_info = {
            url_params: {},
            key_fields_data : {},
        };

        /////////////////////////////////////////////////////////////////
        // Test for /profile/ view
        /////////////////////////////////////////////////////////////////
        guiTests.testPageView("/profile/", instances_info, true);

        /////////////////////////////////////////////////////////////////
        // Test for /profile/edit/ view
        /////////////////////////////////////////////////////////////////
        guiTests.openPage("/profile/edit/", instances_info.url_params);
    },
};