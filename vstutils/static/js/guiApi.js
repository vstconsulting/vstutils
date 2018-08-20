
/**
 * Класс апи и запросов к нему
 * @returns {guiApi}
 */
function guiApi()
{
    var thisObj = this;
    this.init = function()
    {
        var def = new $.Deferred(); 
        spajs.ajax.Call({
            url: hostname + "/api/v2/openapi/?format=openapi",
            type: "GET",
            contentType:'application/json',
            data: "",
            success: function(data)
            {
                thisObj.openapi = data
                def.resolve();
            },
            error: function (){
                def.reject();
            }
        });
        return def.promise();
    }

    var query_data = {}
    var reinit_query_data = function()
    {
        query_data = {
            timeOutId:undefined,
            data:[],
            def:undefined,
            promise:[]
        }
    }
    reinit_query_data()

    /**
     * Балк запрос к апи который в себе содержит накопленные с разных подсистем запросы
     * @returns {promise}
     */
    var real_query = function(query_data)
    {
        var this_query_data = mergeDeep({}, query_data)
        reinit_query_data()

        var scheme = "http"
        if($.inArray("https", thisObj.openapi.schemes) != -1)
        {
            scheme = "https"
        }

        spajs.ajax.Call({
            url: scheme+"://"+thisObj.openapi.host + thisObj.openapi.basePath+"/_bulk/",
            type: "PUT",
            contentType:'application/json',
            data: JSON.stringify(this_query_data.data),
            success: function(data)
            {
                this_query_data.def.resolve(data);
            },
            error: function (error){
                this_query_data.def.reject(error);
            }
        });
        return this_query_data.def.promise();
    }

    /**
     * Примеры запросов
     * https://git.vstconsulting.net/vst/vst-utils/blob/master/vstutils/unittests.py#L337
     *
     * Пример как ссылаться на предыдущий результат
     * https://git.vstconsulting.net/vst/vst-utils/blob/master/vstutils/unittests.py#L383
     *
     * @param {Object} data для балк запроса
     * @returns {promise}
     */
    this.query = function(data)
    {
        if(!query_data.def)
        {
            query_data.def = new $.Deferred();
        }

        if(query_data.timeOutId)
        {
            clearTimeout(query_data.timeOutId)
        }

        let data_index = query_data.data.length
        
        if($.isArray(data))
        {
            for(let i in data)
            {
                query_data.data.push(data[i])
            } 
        }
        else
        {
            query_data.data.push(data)
        }

        var promise = new $.Deferred();

        query_data.timeOutId = setTimeout(real_query, 100, query_data)

        $.when(query_data.def).done(data => {
            let val = data[data_index];


            if(val.status >= 200 && val.status < 400)
            {
                promise.resolve(val)
            }
            else
            {
                promise.reject(val)
            }

        }).fail(function(error)
        {
            promise.reject(error)
        })


        return promise.promise();
    }

    return this;
}
 