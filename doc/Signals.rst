Signals
========================

List of signals that you can use to customize your application. If you want customize your application by using signals, you can add your own signals, insert in your source code ``tabsignal.emit('name_of_signal', {object})``, instead of ``name_of_signal``  you can use you custom name of signal, instead of object you can send object with arguments for functions that subscribe to this signal. If you need subscribe to signal use ``tabsignal.connect('name_of_signal', function)``, on ``name_of_signal`` you need insert name of signal for what you want to subscribe, instead of ``function`` insert function that you need for this signal. Signals list of  `VST Utils`


1. Get Schema
-------------------------

    resourse.loaded
    """"""""""""""""""""""""

    Arguments: None

    Description: This Signal send after load all resources

    openapi.loaded
    """"""""""""""""""""""""

    Arguments:

        api: variable contains API

    Description: Inside this event can overload openapi answer


2. Parsing Schema
----------------------

    openapi.schema
    """"""""""""""""""""""""

    Arguments:

        api: ``object`` contains API

        schema: ``object`` contains gui schema

    Description: Signal send if gui schema not in cache

    openapi.schema.name.[name]
    """""""""""""""""""""""""""""""""

    Parameters:

        [name]: this is ``string`` contains name of schema

    Arguments:

        paths: List of all paths

        path: ``string`` variable contains path for current object

        value: schema ``object`` that equivalent to path

    Description: Signal calls after getting gui schema and calls with `name` of current object.

    openapi.schema.type.[type]
    """"""""""""""""""""""""""""""""""

    Parameters:

        [type]: this is ``string`` contains type of schema

    Arguments:

        paths: List of all paths

        path: ``string`` variable contains path for current object

        value: schema ``object`` that equivalent to path

    Description: Signal calls after getting gui schema and calls with `type` of current object.

    openapi.schema.schema
    """""""""""""""""""""""""""""""""

    Arguments:

        paths: List of all paths

        path: Current path

        value: schema ``object`` that equivalent to path

    Description:

    openapi.schema.schema.[schema]
    """"""""""""""""""""""""""""""""""""""""""""""""""""

    Parameters:

        [schema]: contains ``string`` name of schema

    Arguments:

        paths: List of all paths

        path: ``string`` variable contains path for current object

        value: schema ``object`` that equivalent to path

        schema: name of one of schema's of this object

    Description: Signal calls after getting gui schema and calls with `schema_name` of current object.

    openapi.schema.fields
    """""""""""""""""""""""""""""""""

    Arguments:

        paths: List of all paths

        path: ``string`` variable contains path for current object

        value: schema ``object`` that equivalent to path

        schema: name of one of schema's of this object

        fields: list of fields of ``schema``

    Description: Signal calls after getting gui schema and calls with `fields` of current object.


3. Render
----------------------------

    guiLocalSettings.[name]
    """"""""""""""""""""""""""""""""

    Parameters:

        [name]: ``string`` contains name of local setting

    Arguments:

        type: http method

        name: name of setting

        value: value for setting

    Description: Signal send after set settings

    openapi.schema.definition
    """""""""""""""""""""""""""""""""

    Arguments:

        definitions: definition object

        api: api

        name: name of this object

        parent_name: this object parent name

    Description: Signal send in function ```getObjectDefinitionByName```

    openapi.schema.definition.[definition]
    """""""""""""""""""""""""""""""""""""""""""""""""""

    Parameters:

        [definition]: ``string`` contain name of definition

    Arguments:

        definitions: definition object

        name: name of definition

        parent_name: this object parent name

    Description: Signal send in function ```getObjectDefinitionByName```

    guiList.renderPage
    """""""""""""""""""""""""""

    Arguments:

        guiObj: object that would be render

        options: page render options

        data: data of this model object

    Description: using this signal to modify page for render

    guiList.renderPage.[bulk_name]
    """"""""""""""""""""""""""""""""""""""""""""""

    Parameters:

        [bulk_name]: ``string`` contains bulk name of rendered page

    Arguments:

        guiObj: object that would be render

        options: page render options

        data: data of this model object

    Description: using this signal to modify page for render

    guiList.renderLine.[bulk_name]
    """"""""""""""""""""""""""""""""""""""""""""""

    Parameters:

        [bulk_name]: ``string`` contains bulk name of rendered list

    Arguments:

        guiObj: object that would be render

        dataLine: object that contains data for line

    Description: using this signal to modify lines in list

    guiList.renderLine
    """"""""""""""""""""""""""""""""""""""""""""""

    Arguments:

        guiObj: object that would be render

        dataLine: object that contains data for line

    Description: using this signal to modify lines in list

    webGui.start
    """""""""""""""""""""""""""""

    Description: after initialization of web gui can be used to add additional pages

    loading.completed
    """""""""""""""""""""""""

    Arguments: None

    Description: Signal send after complete loading all


4. Deprecated functions
----------------------------------

    openapi.paths
    """"""""""""""""""""""""

    Arguments:

        api: variable contains API

    Description: Signal send after schema signals

    openapi.completed
    """""""""""""""""""""""""""

    Arguments:

        api: variable contains API

    Description: signal send after complete openapi load


Examples
---------------------

    .. sourcecode:: javascript

        tabSignal.connect("guiList.renderLine.group", function(obj){

            if(obj.dataLine.line.children)
            {
                if(obj.dataLine.sublinks_l2['host'])
                {
                    obj.dataLine.sublinks_l2['host'].hidden = true
                }

                if(obj.dataLine.sublinks_l2['group'])
                {
                    obj.dataLine.sublinks_l2['group'].hidden = false
                }
            }
            else
            {
                if(obj.dataLine.sublinks_l2['host'])
                {
                    obj.dataLine.sublinks_l2['host'].hidden = false
                }

                if(obj.dataLine.sublinks_l2['group'])
                {
                    obj.dataLine.sublinks_l2['group'].hidden = true
                }
            }

        })

    We receive in this signal object and edit options of this object.

    .. sourcecode:: javascript

        tabSignal.connect("openapi.schema.definition.History", addHistoryPrefetchCommon);

    Also we can send function as object to signal

    .. sourcecode:: javascript

        tabSignal.connect("resource.loaded", function()
        {
            window.api = new guiApi();
            $.when(window.api.init()).done(function()
            {
                // Событие в теле которого можно было бы переопределить ответ от open api
                tabSignal.emit("openapi.loaded",  {api: window.api});

                $.when(getGuiSchema()).done(function ()
                {
                    //.. декодирование схемы из кэша
                    window.guiSchema.path = returnParentLinks(window.guiSchema.path);

                    emitFinalSignals()

                }
            }
        }

    We can send signal inside function of another signal.