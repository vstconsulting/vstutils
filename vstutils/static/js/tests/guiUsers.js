/**
 * File with tests for /user/ view.
 */

/**
 * Tests for views connected with User Model.
 */
window.qunitTestsArray['guiViews[user]'] = {
    test: function() {
        let list_path = '/user/';
        let instances_info = guiTests.getEmptyInstancesInfo();

        /////////////////////////////////////////////////////////////////
        // Test for set of /user/ views (list, page_new, page, page_edit)
        /////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(list_path, instances_info, {
            new: [
                {
                    is_valid: true,
                    data:{
                        username: {value: randomString(6)},
                        is_active: {value: true},
                        is_staff: {value: true},
                        first_name: {value: randomString(6)},
                        last_name: {value: randomString(6)},
                        email: {value: randomString(6) + '@mail.com'},
                        password: {value: 'password'},
                        password2: {value: 'password'},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {username: {value: randomString(6) + randomString(6)}},
                },
                {
                    is_valid: true,
                    data: {first_name: {value: 'Qwerty',}},
                },
            ],
        }, true);

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /user/{pk}/copy/ views
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.copyInstanceFromPageView(list_path + "{" + path_pk_key +"}/", instances_info, {
            is_valid: true,
            remove: true,
            data: {
                username: {value: 'copied-' + randomString(6),},
                is_active: {value: true},
            }
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Test, that deletes created during tests user instance.
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.testRemovePageViewInstance(list_path + "{" + path_pk_key +"}/", instances_info, true);
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