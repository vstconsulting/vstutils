
function rundomString(length, abc = "qwertyuiopasdfghjklzxcvbnm012364489")
{
    let res = ""
    for(let i =0; i< length; i++)
    {
        res += abc[Math.floor(Math.random()*abc.length)]
    }

    return res;
}

guiTests = {

}

guiTests.openPage =  function(path)
{
    // Проверка того что страница открывается
    syncQUnit.addTest("guiPaths['"+path+"'].List", function ( assert )
    {
        let done = assert.async();
        $.when(vstGO(path)).done(() => {
            assert.ok(true, 'guiPaths["'+path+'"].opened');
            testdone(done)
        }).fail(() => {
            debugger;
            assert.ok(false, 'guiPaths["'+path+'"].opened fail');
            testdone(done)
        })
    });
}

guiTests.openError404Page =  function(env, path_callback)
{
    syncQUnit.addTest("guiPaths['openError404Page'].Error404", function ( assert )
    {
        debugger;
        let done = assert.async();
        let path = path_callback(env);
        $.when(vstGO(path)).always(() => {
            assert.ok($(".error-as-page.error-status-404").length != 0, 'guiPaths["'+path+'"] ok, and delete was failed');
            testdone(done)
        })
    })
}

guiTests.canCreateObject =  function(path, canCreate)
{
    // Проверка того что страница с флагом path.canCreate != true не открывается
    syncQUnit.addTest("guiPaths['"+path+"new']", function ( assert )
    {
        let done = assert.async();
        try{
            $.when(vstGO(path+"new")).done(() => {
                assert.ok(canCreate == true, 'guiPaths["'+path+'new"] canCreate("'+canCreate+'")');
                testdone(done)
            }).fail(() => {
                assert.ok(canCreate == false, 'guiPaths["'+path+'new"] canCreate("'+canCreate+'")');
                testdone(done)
            })
        }catch (ex)
        {
            assert.ok(canCreate == false, 'guiPaths["'+path+'new"] [catch] canCreate("'+canCreate+'")');
            testdone(done)
        }
    });
}

guiTests.createObject =  function(api_obj, fieldsData, env = {}, isWillCreated = true)
{
    // Проверка того что страница с флагом api_obj.canCreate == true открывается
    syncQUnit.addTest("guiPaths['"+api_obj.path+"new']", function ( assert )
    {
        let done = assert.async();

        // Открыли страницу создания
        $.when(vstGO(api_obj.path+"new")).done(() => {

            let values = []
            for(let i in fieldsData)
            {
                let field = window.curentPageObject.model.guiFields[i]
                // Наполнили объект набором случайных данных
                values[i] = field.insertTestValue(fieldsData[i].value)

                if(fieldsData[i].real_value != undefined && values[i] != fieldsData[i].real_value )
                {
                    assert.ok(true, 'fieldsData["'+i+'"].real_value !=' + values[i]);
                    testdone(done)
                    return;
                }
            }

            // Создали объект с набором случайных данных
            $.when(window.curentPageObject.createAndGoEdit()).done(() => {

                assert.ok(isWillCreated == true, 'guiPaths["'+api_obj.path+'new"] done');
                for(let i in fieldsData)
                {
                    let field = window.curentPageObject.model.guiFields[i]

                    if(fieldsData[i].do_not_compare)
                    {
                        continue;
                    }

                    // Проверили что данные теже
                    assert.ok(field.getValue() == values[i], 'test["'+api_obj.path+'"]["'+i+'"] == ' + values[i]);
                }

                if(window.curentPageObject.model.data.id)
                {
                    env.objectId = window.curentPageObject.model.data.id;
                }
                else if(window.curentPageObject.model.data.pk)
                {
                    env.objectId = window.curentPageObject.model.data.pk;
                }
                else if(window.curentPageObject.model.data.name)
                {
                    env.objectId = window.curentPageObject.model.data.name;
                }

                testdone(done)
            }).fail((err) => {
                debugger;
                assert.ok(isWillCreated == false, 'guiPaths["'+api_obj.path+'new"] fail');
                testdone(done)
            })
        }).fail((err) => {
            debugger;
            assert.ok(isWillCreated == false, 'guiPaths["'+api_obj.path+'new"] fail');
            testdone(done)
        })
    });
}

guiTests.deleteObject =  function(path = "deleteObject")
{
    // Проверка того что страница с флагом api_obj.canCreate == true открывается
    syncQUnit.addTest("guiPaths['"+path+"objectId'].delete", function ( assert )
    {
        let done = assert.async();
        tabSignal.once("spajs.open", () => {
            assert.ok(true, 'guiPaths["'+path+'objectId"] ok');
            testdone(done)
        })

        $(".btn-delete-one-entity").trigger('click')
    });
}

guiTests.canDeleteObject =  function(canDelete, path = "canDeleteObject")
{
    // Проверка того что страница с флагом api_obj.canCreate == true открывается
    syncQUnit.addTest("guiPaths['"+path+"'].canDelete['"+canDelete+"']", function ( assert )
    {
        let done = assert.async();
        assert.ok( $(".btn-delete-one-entity").length == canDelete/1, 'guiPaths["'+path+'"] has ("'+$(".btn-delete-one-entity").length+'") delete button with api_obj.page.canDelete == '+canDelete);
        testdone(done)
    });
}


window.qunitTestsArray['guiPaths.users'] = {
    test:function()
    {
        let env = {}
        let path = '/user/'
        let api_obj = guiSchema.path[path]

        // Проверка того что страница открывается
        guiTests.openPage(path)

        // Проверка возможности создания объекта
        guiTests.canCreateObject(path, true)

        // Создание объекта
        let pass = rundomString(6)
        let obj = {
            username:{value:rundomString(6)},
            password:{value:pass, do_not_compare:true},
            password2:{value:pass, do_not_compare:true},
        }

        guiTests.createObject(api_obj, obj, env, true)

        // Проверка возможности удаления объекта
        guiTests.canDeleteObject(true)

        // Проверка удаления объекта
        guiTests.deleteObject()

        // Проверка что страницы нет
        guiTests.openError404Page(env, (env) =>{ return vstMakeLocalApiUrl(api_obj.page.path, {api_pk:env.objectId}) })
    }
}