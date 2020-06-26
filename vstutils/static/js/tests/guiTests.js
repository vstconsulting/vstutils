spa.utils.guiLocalSettings.setAsTmp("page_update_interval", 600);
// guiLocalSettings.get('guiApi.real_query_timeout', 1200)

/**
 * Class, that stores methods needed for guiViews tests.
 */
class GuiTests {
  constructor() {}
  /**
   * Method, that returns empty 'instances_info' - object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * This object is needed for GuiTests.
   * @return {object}.
   */
  getEmptyInstancesInfo() {
    return {
      url_params: {},
      key_fields_data: {},
    };
  }
  /**
   * Method, that saves data of instance, created during tests.
   * @param {object} instances_info Object to which data will be saved.
   * @param {boolean} is_parent If true - key will be equal to path_pk_key.
   * @param {prefix} prefix Key prefix, at which data will be saved.
   */
  saveInstanceData(instances_info, is_parent, prefix = "") {
    // let url = app.application.$route.path.replace(/^\/|\/$/g, "");
    //
    let view = app.views[app.application.$route.name];
    let qs_path = view.objects.url;
    let url = qs_path
      .format(app.application.$route.params)
      .replace(/^\/|\/$/g, "")
      .replace("/edit", "")
      .replace("/new", "");``
    //
    let instance = app.application.$store.state.objects[url].cache;
    let model = app.application.$store.state.objects[url].model;
    // let view = app.views[app.application.$route.name];
    let pk_key = window.spa.utils.path_pk_key;

    if (!is_parent) {
      pk_key = prefix + view.schema.name + "_id";
    }

    instances_info.url_params[pk_key] = instance.getPkValue();
    instances_info.key_fields_data[prefix + view.schema.name] = {};
    instances_info.key_fields_data[prefix + view.schema.name][
      model.pk_name
    ] = instance.getPkValue();
    instances_info.key_fields_data[prefix + view.schema.name][
      model.view_name
    ] = instance.getViewFieldValue();
  }
  /**
   * Method, that creates test, that opens page and raises if there are some errors.
   * @param path {string} path
   * @param params {object} object - object with ids of instances from path.
   * @param {boolean} expectation If true - test is expected to be successful. Otherwise, it's expected to be failed.
   */
  openPage(path, params, expectation = true) {
    syncQUnit.addTest("guiViews['" + path + "'].open", function (assert) {
      let done = assert.async();
      let url = path.format(params).replace(/\/$/g, "");

      spa.utils.current_view._initLoadingPromise();

      if (
        url.replace(/^\/|\/$/g, "") ==
        app.application.$route.path.replace(/^\/|\/$/g, "")
      ) {
        spa.utils.current_view.setLoadingSuccessful();
      } else {
        app.application.$router.push({ path: url });
      }

      let getTestResult = (result) => {
        assert.ok(result == expectation, 'guiViews["' + path + '"].opened');
        testdone(done);
      };

      spa.utils.current_view.promise
        .then(() => {
          getTestResult(true);
        })
        .catch((error) => {
          getTestResult(false);
        });
    });
  }
  /**
   * Method, that creates test, that does nothing, just makes a pause for a set time interval.
   * @param {string} test_name Name of test.
   * @param {number} time Time in milliseconds - size of pause interval.
   */
  wait(test_name, time = undefined) {
    if (!time) {
      time = spa.utils.guiLocalSettings.get("page_update_interval") * 2.2;
    }

    syncQUnit.addTest("wait['" + test_name + "']", function (assert) {
      let done = assert.async();
      setTimeout(() => {
        assert.ok(true, 'wait["' + test_name + '"]');
        testdone(done);
      }, time);
    });
  }
  /**
   * Method, that creates test, that just click on element with current selector.
   * @param {string} selector Selector of element to click.
   * @param {function} callback Callback for a successful test.
   * @param {function} fallback Callback for a fail test.
   */
  click(selector, callback, fallback) {
    syncQUnit.addTest("click on '" + selector + "' element", function (assert) {
      let done = assert.async();

      if (($(selector).length = 0)) {
        if (fallback) {
          fallback(assert);
        }

        assert.ok(false);
      } else {
        $(selector)[0].dispatchEvent(new Event("click"));

        if (callback) {
          callback(assert);
        }

        assert.ok(true);
      }

      testdone(done);
    });
  }
  /**
   * Method, that creates test, that imitates click on some element and waits end of redirect.
   * @param {string} selector Selector of element to click.
   * @param {boolean} expectation If true - test is expected to be successful. Otherwise, it's expected to be failed.
   * @param {function} callback Callback for a successful redirect.
   * @param {function} fallback Callback for a redirect with error.
   */
  clickAndWaitRedirect(selector, expectation = true, callback, fallback) {
    syncQUnit.addTest(
      "click on '" + selector + "' element and wait redirect",
      function (assert) {
        let done = assert.async();

        spa.utils.current_view._initLoadingPromise();

        $(selector)[0].dispatchEvent(new Event("click"));

        let getTestResult = (result) => {
          let bool = result == expectation;
          assert.ok(bool, "clicked");

          if (bool && callback) {
            callback(assert);
          }

          if (!bool && fallback) {
            fallback(assert);
          }

          testdone(done);
        };

        spa.utils.current_view.promise
          .then(() => {
            getTestResult(true);
          })
          .catch((error) => {
            getTestResult(false);
          });
      }
    );
  }
  /**
   * Method, that creates test, that sets values to fields from view form.
   * @param {string} path Path of view.
   * @param {object} data Object with values of all fields.
   */
  setValues(path, data) {
    syncQUnit.addTest("guiViews[" + path + "].setValues", function (assert) {
      let done = assert.async();
      let view = app.views[path];
      let fields = view.objects.model.fields;
      let test_data = data;

      if (typeof test_data == "function") {
        test_data = test_data();
      }

      try {
        // let url = app.application.$route.path.replace(/^\/|\/$/g, "").replace("/edit", "").replace("/new", "");
        //
        let qs_path = view.objects.url;
        let url = qs_path
          .format(app.application.$route.params)
          .replace(/^\/|\/$/g, "")
          .replace("/edit", "")
          .replace("/new", "");
        //
        let d_data = $.extend(
          true,
          {},
          app.application.$store.state.sandbox[url].cache.data
        );

        for (let key in test_data) {
          d_data[key] = test_data[key].value;
        }

        for (let key in test_data) {
          if (!fields[key]) {
            continue;
          }

          fields[key]._insertTestValue(d_data);
        }

        assert.ok(true, "guiViews[" + path + "].setValues");
      } catch (e) {
        assert.ok(false, "guiViews[" + path + "].setValues");
      }

      testdone(done);
    });
  }
  /**
   * Method, that creates test, that compares instance data with input data.
   * @param {string} path Path of view.
   * @param {object} data Object with values of all fields.
   */
  compareValues(path, data) {
    syncQUnit.addTest("guiViews[" + path + "].compareValues", function (
      assert
    ) {
      let done = assert.async();
      let view = app.views[path];
      let view_type = view.schema.type;

      let qs_path = view.objects.url;
      let url = qs_path
        .format(app.application.$route.params)
        .replace(/^\/|\/$/g, "")
        .replace("/edit", "")
        .replace("/new", "");
      // let url = app.application.$route.path.replace(/^\/|\/$/g, "").replace("/new", "").replace("/edit", "");
      let store = "objects";

      if (["page_new", "page_edit", "action"].includes(view_type)) {
        store = "sandbox";
      }

      let store_data = app.application.$store.state[store][url].cache.data;

      let test_data = data;

      if (typeof test_data == "function") {
        test_data = test_data();
      }

      for (let key in test_data) {
        if (test_data[key].do_not_compare) {
          continue;
        }

        let bool;

        if (typeof test_data[key].value == "object") {
          bool = window.spa.utils.deepEqual(test_data[key].value, store_data[key]);
        } else {
          bool = test_data[key].value == store_data[key];
        }

        assert.ok(
          bool,
          "guiViews[" + path + "].compareValues - field - '" + key + "'"
        );
      }

      assert.ok(true);

      testdone(done);
    });
  }
  /**
   * Method, that creates test, that checks, that all unhidden buttons are on page.
   * @param {string} path Path of view, which buttons should be checked.
   */
  checkViewButtons(path) {
    syncQUnit.addTest("guiViews[" + path + "].checkButtons", function (assert) {
      let done = assert.async();
      let view = app.views[path];

      let operations = view.schema.operations;

      for (let key in operations) {
        let btn = operations[key];

        if (btn.hidden) {
          continue;
        }

        let btn_name = btn.name || btn.title;
        assert.ok(
          $(".btn-operation-" + btn_name).length > 0,
          "guiViews[" + path + "].checkButtons - " + btn_name
        );
      }

      assert.ok(true);

      testdone(done);
    });
  }
  /**
   * Method, that creates test, that sets values to filters from filter modal form of list view.
   * @param {string} path Path of view.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   */
  setFilterValues(path, instances_info, is_parent = true) {
    syncQUnit.addTest("guiViews[" + path + "].setFilterValues", function (
      assert
    ) {
      let done = assert.async();
      let view = app.views[path];
      let filters = view.schema.filters;

      let prefix = is_parent ? "" : "child_";

      let data = instances_info.key_fields_data[prefix + view.schema.name];

      try {
        for (let key in data) {
          if (!filters[key]) {
            continue;
          }

          filters[key]._insertTestValue(data);
        }

        assert.ok(true, "guiViews[" + path + "].setValues");
      } catch (e) {
        assert.ok(false, "guiViews[" + path + "].setValues");
      }

      testdone(done);
    });
  }
  /**
   * Method, that creates test, that check work of reload button on 'page_edit' view.
   * @param {string} path Path of view.
   * @param {object} data Object with values of all fields.
   */
  checkReloadButtonWork(path, data) {
    this.setValues(path, data);

    this.compareValues(path, data);

    this.click(".btn-operation-reload");

    this.wait("data reloading", 30);

    syncQUnit.addTest("guiViews[" + path + "].checkReloadButton", function (
      assert
    ) {
      let done = assert.async();
      // let url = app.application.$route.path.replace(/^\/|\/$/g, "").replace("/edit", "");
      //
      let view = app.views[app.application.$route.name];
      let qs_path = view.objects.url;
      let url = qs_path
        .format(app.application.$route.params)
        .replace(/^\/|\/$/g, "")
        .replace("/edit", "");
      //

      let api_data = app.application.$store.state.objects[url].cache.data;
      let edit_data = app.application.$store.state.sandbox[url].cache.data;

      assert.ok(window.spa.utils.deepEqual(api_data, edit_data), "data was reloaded");

      testdone(done);
    });
  }
  /**
   * Method, that creates test for a '/{some_entity}/{path_pk_key}/{some_action}/' or
   * for a '/{some_entity}/{some_action}/ views.
   * @param {string} path View's path (page type).
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {object} options Object with options for test. Includes:
   * - {object} data  Data, that should be inserted in the view fields.
   * - {boolean} is_valid Expectation, that test should be successful or not.
   * - {boolean} remove If true - copied instance will be deleted.
   * @param {function} callback Callback for a successful redirect.
   * @param {function} fallback Callback for a redirect with error.
   */
  executeActionFromSomeView(path, instances_info, options, callback, fallback) {
    this.openPage(path, instances_info.url_params);

    this.clickAndWaitRedirect(".btn-action-" + options.action, true);

    this.setValues(path + options.action + "/", options.data);

    this.compareValues(path + options.action + "/", options.data);

    this.clickAndWaitRedirect(
      ".btn-operation-execute",
      options.is_valid,
      callback,
      fallback
    );
  }
  /**
   * Method, that creates test for a '/{some_entity}/{path_pk_key}/copy/' view.
   * @param {string} path View's path (page type).
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {object} options Object with options for test. Includes:
   * - {object} data  Data, that should be inserted in the view fields.
   * - {boolean} is_valid Expectation, that test should be successful or not.
   * - {boolean} remove If true - copied instance will be deleted.
   */
  copyInstanceFromPageView(path, instances_info, options) {
    options.action = "copy";

    this.executeActionFromSomeView(path, instances_info, options);

    if (options.remove) {
      this.testRemovePageViewInstance(path, instances_info, false);
    }
  }
  /**
   * Method, that creates random user to use his data in other tests.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {boolean} is_parent If true - Value of PK field of created instance will be saved at path_pk_key key.
   * Otherwise, it will be saved, as 'user_id', for example.
   */
  createRandomUser(instances_info, is_parent = false) {
    let path = "/user/new/";
    let password = window.spa.utils.randomString(6);
    let fieldsData = {
      username: { value: window.spa.utils.randomString(6) },
      email: { value: window.spa.utils.randomString(6) + "@mail.com" },
      password: { value: password, do_not_compare: true },
      password2: { value: password, do_not_compare: true },
    };

    this.openPage(path, instances_info.url_params, true);

    this.setValues(path, fieldsData);

    this.clickAndWaitRedirect(".btn-operation-save", true, (assert) => {
      this.saveInstanceData(instances_info, is_parent);
    });
  }
  /**
   * Method, that creates test, that checks feature of adding existing child instance to the parent list.
   * This test creates new child instance, adds it to parent's list and then deletes it.
   * @param {string} path View's path.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {object} options Object with options for test. Includes:
   * - {object} data  Data, that should be inserted in the view fields.
   * - {string} child_path Path of child instance list.
   */
  testAddChildInstanceToParentList(path, instances_info, options) {
    this.openPage(options.child_path + "new/", instances_info.url_params, true);

    this.setValues(options.child_path + "new/", options.data);

    this.clickAndWaitRedirect(".btn-operation-save", true, (assert) => {
      this.saveInstanceData(instances_info, false, "child_");
    });

    this.openPage(path, instances_info.url_params, true);

    this.click(".btn-operation-add");

    this.wait(
      "modal opening",
      spa.utils.guiLocalSettings.get("guiApi.real_query_timeout") * 3
    );

    syncQUnit.addTest(
      "guiViews[" + path + "].addChild set filter value",
      function (assert) {
        let done = assert.async();
        let view = app.views[options.child_path];

        assert.ok($(".modal-list-search-input").length > 0);

        let filter_value =
          instances_info.key_fields_data["child_" + view.schema.name][
            view.objects.model.view_name
          ];

        $($(".modal-list-search-input")[0]).val(filter_value);
        $(".modal-list-search-input")[0].dispatchEvent(new Event("input"));
        $(".modal-list-search-apply")[0].dispatchEvent(new Event("click"));

        testdone(done);
      }
    );

    this.wait(
      "list filtering",
      spa.utils.guiLocalSettings.get("guiApi.real_query_timeout") * 3
    );

    syncQUnit.addTest(
      "guiViews[" + path + "].addChild select and add child instance",
      function (assert) {
        let done = assert.async();
        let view = app.views[options.child_path];

        assert.ok($(".modal-body .item-row").length > 0);

        $(".modal-body .item-row .td_select_btn")[0].dispatchEvent(
          new Event("click")
        );
        $(".btn-operation-add-child-apply")[0].dispatchEvent(
          new Event("click")
        );

        testdone(done);
      }
    );

    this.wait("list updating", 100);

    this.testListViewFilters(path, instances_info, true, false, false);

    this.wait("filtered list opening", 100);

    syncQUnit.addTest(
      "guiViews[" + path + "].addChild check instance was added",
      function (assert) {
        let done = assert.async();
        let id = instances_info.url_params["child_" + view.schema.name + "_id"];

        assert.ok($(".item-row").length > 0);
        assert.ok($("tr.item-row[data-id=" + id + "]").length > 0);

        spa.utils.current_view._initLoadingPromise();

        $("tr.item-row[data-id=" + id + "]").trigger("click");

        spa.utils.current_view.promise
          .then(() => {
            testdone(done);
          })
          .catch(() => {
            testdone(done);
          });
      }
    );

    this.wait("child instance opening", 30);

    this.clickAndWaitRedirect(".btn-operation-remove");

    let view = app.views[options.child_path];
    let pk_key = "child_" + view.schema.name + "_id";

    this.testRemovePageViewInstance(
      options.child_path + "{" + pk_key + "}/",
      instances_info,
      true
    );
  }
  /**
   * Method, that creates test for a view of 'list' type.
   * @param {string} path View's path.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   */
  testListView(path, instances_info) {
    this.openPage(path, instances_info.url_params);
    this.checkViewButtons(path);
  }
  /**
   * Method, that creates test, that checks work of list view filters.
   * @param {string} path View's path.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {boolean} expectation If true - test is expected to be successful. Otherwise, it's expected to be failed.
   * @param {boolean} is_parent If false - filter should be taken from instances_info.key_fields_data['child_' + view.schema.name].
   * @param {boolean} open_by_path If true - test will open the 'page' view by Vue-router.push().
   * Otherwise, it will not be opened again
   * (it's supposed, that test is following after 'page_new' or 'page_edit' type view).
   */
  testListViewFilters(
    path,
    instances_info,
    expectation = true,
    is_parent = true,
    open_by_path = true
  ) {
    if (open_by_path) {
      this.openPage(path, instances_info.url_params);
    }

    this.click(".btn-open-filters-modal");

    this.wait("filters modal opening", 100);

    this.setFilterValues(path, instances_info, is_parent);

    this.clickAndWaitRedirect(".btn-apply-filters", true, (assert) => {
      assert.ok($(".item-row").length > 0 == expectation);
    });
  }
  /**
   * Method, that creates test, that checks work of list view selections.
   * @param {string} path View's path.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {boolean} expectation If true - test is expected to be successful. Otherwise, it's expected to be failed.
   * @param {boolean} open_by_path If true - test will open the 'page' view by Vue-router.push().
   * Otherwise, it will not be opened again
   * (it's supposed, that test is following after 'page_new' or 'page_edit' type view).
   */
  testListViewSelections(
    path,
    instances_info,
    expectation = true,
    open_by_path = true
  ) {
    if (open_by_path) {
      this.openPage(path, instances_info.url_params);
    }

    let compareSelectionsWithStore = (assert) => {
      // let url = app.application.$route.path.replace(/^\/|\/$/g, "");
      //
      let view = app.views[app.application.$route.name];
      let qs_path = view.objects.url;
      let url = qs_path
        .format(app.application.$route.params)
        .replace(/^\/|\/$/g, "")
        .replace("/edit", "")
        .replace("/new", "");
      //
      let selections = app.application.$store.state.selections[url];
      let rows = $(".item-row.selected");

      for (let index = 0; index < rows.length; index++) {
        let id = $(rows[index]).attr("data-id");

        assert.ok(selections[id] == true);
      }
    };

    this.click(".item-row .td_select_btn", (assert) => {
      setTimeout(() => {
        assert.ok($(".item-row.selected").length > 0 == expectation);
        compareSelectionsWithStore(assert);
      }, 20);
    });

    this.click(".item-row .td_select_btn");

    this.click(".global-select.td_select_btn", (assert) => {
      setTimeout(() => {
        assert.ok($(".item-row.selected").length > 0 == expectation);
        assert.ok(
          ($("tr.selected").length - $(".item-row.selected").length == 1) ==
            expectation
        );
        compareSelectionsWithStore(assert);
      }, 20);
    });

    this.click(".global-select.td_select_btn");
  }
  /**
   * Method, that creates test for a view of 'page_new' type.
   * @param {string} path View's path.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {object} options Object with options for test. Includes:
   * - {object} data  Data, that should be inserted in the view fields.
   * - {boolean} is_valid Expectation, that test should be successful or not.
   * @param {boolean} is_parent If true - Value of PK field of created instance will be saved at path_pk_key key.
   * Otherwise, it will be saved, as 'user_id', for example.
   * @param {boolean} open_by_path If true - test will open the 'page_new' view by Vue-router.push().
   * Otherwise, it will use '.btn-new' button (it's supposed, that test is following after 'list' type view).
   */
  testPageNewView(
    path,
    instances_info,
    options,
    is_parent = true,
    open_by_path = true
  ) {
    if (open_by_path) {
      this.openPage(path, instances_info.url_params);
    } else {
      this.clickAndWaitRedirect(".btn-operation-new");
    }

    this.checkViewButtons(path);

    this.setValues(path, options.data);

    this.compareValues(path, options.data);

    this.clickAndWaitRedirect(
      ".btn-operation-save",
      options.is_valid,
      (assert) => {
        if (!options.is_valid) {
          return;
        }

        this.saveInstanceData(instances_info, is_parent);
      }
    );
  }
  /**
   * Method, that creates test for a view of 'page' type.
   * @param {string} path View's path.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {boolean} open_by_path If true - test will open the 'page' view by Vue-router.push().
   * Otherwise, it will not be opened again
   * (it's supposed, that test is following after 'page_new' or 'page_edit' type view).
   */
  testPageView(path, instances_info, open_by_path = true) {
    if (open_by_path) {
      this.openPage(path, instances_info.url_params);
    }

    this.checkViewButtons(path);
  }
  /**
   * Method, that creates test for a view of 'page_edit' type.
   * @param {string} path View's path.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {object} options Object with options for test. Includes:
   * - {object} data  Data, that should be inserted in the view fields.
   * - {boolean} is_valid Expectation, that test should be successful or not.
   * @param {boolean} open_by_path If true - test will open the 'page_edit' view by Vue-router.push().
   * Otherwise, it will use '.btn-edit' button (it's supposed, that test is following after 'page' type view).
   */
  testPageEditView(path, instances_info, options, open_by_path = true) {
    if (open_by_path) {
      this.openPage(path, instances_info.url_params);
    } else {
      this.clickAndWaitRedirect(".btn-operation-edit");
    }

    this.checkViewButtons(path);

    if (!options.do_not_check_reload_button) {
      this.checkReloadButtonWork(path, options.data);
    }

    this.setValues(path, options.data);

    this.compareValues(path, options.data);

    this.clickAndWaitRedirect(
      ".btn-operation-save",
      options.is_valid,
      (assert) => {
        if (!options.is_valid) {
          return;
        }
        // let url = app.application.$route.path.replace(/^\/|\/$/g, "");
        //
        let view = app.views[app.application.$route.name];
        let qs_path = view.objects.url;
        let url = qs_path
          .format(app.application.$route.params)
          .replace(/^\/|\/$/g, "")
          .replace("/edit", "")
          .replace("/new", "");
        //
        let instance = app.application.$store.state.objects[url].cache;
        let model = app.application.$store.state.objects[url].model;
        // let view = app.views[app.application.$route.name];

        if (
          instances_info.key_fields_data[view.schema.name] &&
          instance.getViewFieldValue() !== undefined
        ) {
          instances_info.key_fields_data[view.schema.name][
            model.view_name
          ] = instance.getViewFieldValue();
        }
      }
    );
  }
  /**
   * Method, that creates test, that removes 'page' view model instance.
   * @param {string} path View's path.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {boolean} open_by_path If true - test will open the 'page' view by Vue-router.push().
   * Otherwise, it will not be opened again
   * (it's supposed, that test is following after 'page_new' or 'page_edit' type view).
   */
  testRemovePageViewInstance(path, instances_info, open_by_path = true) {
    if (open_by_path) {
      this.openPage(path, instances_info.url_params);
    }

    this.clickAndWaitRedirect(".btn-operation-remove");
  }
  /**
   * Method, that creates set of connected tests for connected views of following types:
   * - list;
   * - page_new;
   * - page;
   * - page_edit.
   * For example, current method creates tests for:
   * - /user/ view;
   * - /user/new/ view;
   * - /user/{path_pk_key, user_id}/ view;
   * - /user/{path_pk_key, user_id}/edit/ view.
   * @param {string} list_path Path of list view.
   * @param {object} instances_info Object with 2 properties:
   * - {object} url_params Object with URL params for path;
   * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
   * @param {object} test_options Object, that contains options for current test.
   * This object includes settings(execute child test or not) and data for child test.
   * @param {boolean} is_parent If true, id of created Model instance will be saved at path_pk_key key.
   * Otherwise, it wll ba saved as '{model_name}_id' ('user_id', for example).
   */
  testSetOfViews(list_path, instances_info, test_options, is_parent) {
    let pk_key = window.spa.utils.path_pk_key;

    if (!is_parent) {
      pk_key = app.views[list_path].schema.name + "_id";
    }

    this.testListView(list_path, instances_info);

    for (let index in test_options.new) {
      this.testPageNewView(
        list_path + "new/",
        instances_info,
        test_options.new[index],
        is_parent,
        index != 0
      );
    }

    this.testPageView(list_path + "{" + pk_key + "}/", instances_info, false);

    for (let index in test_options.edit) {
      let path_edit = list_path + "{" + pk_key + "}/" + "edit/";
      this.testPageEditView(
        path_edit,
        instances_info,
        test_options.edit[index],
        index != 0
      );
    }

    if (test_options.add_child) {
      this.testAddChildInstanceToParentList(
        list_path,
        instances_info,
        test_options.add_child
      );
    }

    if (!(test_options.list && test_options.list.do_not_check_filters)) {
      this.testListViewFilters(list_path, instances_info, true, true, true);
    }

    this.testListViewSelections(list_path, instances_info, true, true);

    if (test_options.page && test_options.page.remove) {
      this.testRemovePageViewInstance(
        list_path + "{" + pk_key + "}/",
        instances_info,
        true
      );
    }
  }
}

window.GuiTests = GuiTests;

/**
 * Instance of GuiTests Class.
 * This instance is used for guiViews' tests creating.
 */
window.guiTests = new GuiTests();
