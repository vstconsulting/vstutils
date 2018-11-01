

window.qunitTestsArray['guiPaths.users'] = {
    test:function()
    {
        let env = {}
        let path = '/user/'
        let api_obj = guiSchema.path[path]

        // Проверка того что страница открывается
        guiTests.openPage(path)

        // Проверка наличия элемента на странице
        guiTests.hasCreateButton(1, path)
        guiTests.hasAddButton(0, path)

        // Проверка возможности создания объекта
        guiTests.openPage(path+"new")

        guiTests.createObject(path, {username:{value:rundomString(6)},}, {}, false)

        // Создание объекта
        let pass = rundomString(6)
        let obj = {
            username:{value:rundomString(6)},
            password:{value:pass, do_not_compare:true},
            password2:{value:pass, do_not_compare:true},
        }

        guiTests.createObject(path, obj, env, true)

        guiTests.openPage(path)
        guiTests.openPage(path, env, (env) =>{ return vstMakeLocalApiUrl(api_obj.page.path, {api_pk:env.objectId}) })

        // Проверка возможности удаления объекта
        guiTests.hasDeleteButton(true, path)
        guiTests.hasCreateButton(false, path)
        guiTests.hasAddButton(false, path)

        let obj2 = {username : rundomString(6)}
        guiTests.updateObject(path, obj2, true)

        // Проверка удаления объекта
        guiTests.deleteObject()

        // Проверка что страницы нет
        guiTests.openError404Page(env, (env) =>{ return vstMakeLocalApiUrl(api_obj.page.path, {api_pk:env.objectId}) })
    }
}