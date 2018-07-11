
/**
 * Класс страницы
 * @returns {guiPage}
 */
function guiPage()
{
    var thisObj = this;
    this.blocks = []

    /**
     * Отрисовывает сообщение о том что рендер блока вернул ошибку
     * @param {Object} block
     * @param {Object} error
     * @returns {undefined}
     */
    this.renderFail = function(block, error)
    {
        $(block.id).insertTpl("error"+JSON.stringify(error))
    }

    /**
     * Отрисовывает блок
     * @param {Object} block
     * @returns {undefined}
     */
    var renderOneBlock = function(block, menuInfo, data)
    {
        var res = block.item.render(menuInfo, data);
        if(typeof res == "string")
        {
            $(block.id).insertTpl(res)
            return;
        }

        if(!res)
        {
            thisObj.renderFail(block)
            return;
        }

        $.when(res).done(function(html)
        {
            $(block.id).insertTpl(html)
        }).fail(function(error)
        {
            thisObj.renderFail(block, error)
        })
    }

    /**
     * Отрисовывает страницу состоящею из отдельно загружающихся блоков
     * @returns {undefined}
     */
    this.render = function(holder, menuInfo, data)
    {
        var blocks = []
        var blocksHtml = "";

        for(var i in thisObj.blocks)
        {
            var id = "block_"+i+"_"+Math.floor(Math.random()*10000000)

            var val = {
                item:thisObj.blocks[i],
                id:"#"+id
            }
            blocks.push(val)
            blocksHtml += "<div id="+id+"></div>"
        }

        $(holder).insertTpl(blocksHtml)

        blocks = blocks.sort(compareBlocks);

        for(var i in blocks)
        {
            renderOneBlock(blocks[i], menuInfo, data)
        }

        return;
    }

    /**
     * Регистрирует урл страницы для показа её при заходе на конкретный урл.
     * @param {type} urlregexp
     * @returns {undefined}
     */
    this.registerURL = function(urlregexp, menu_id)
    {
        this.urlregexp = urlregexp;
        spajs.addMenu({
            id:menu_id,
            urlregexp:urlregexp,
            onOpen:function(holder, menuInfo, data)
            {
                return thisObj.render(holder, menuInfo, data);
            },
            /*onClose:function()
            {
            },*/
        })
    }
}

/**
 * Для сортировки блоков
 * @param {Number} a
 * @param {Number} b
 * @returns {Number}
 */
function compareBlocks(a, b)
{
    if (!a[0].prioritet && a[0].prioritet !== 0) a[0].prioritet = 999;
    if (!b[0].prioritet && b[0].prioritet !== 0) b[0].prioritet = 999;

    if (a[0].prioritet > b[0].prioritet) return 1;
    if (a[0].prioritet < b[0].prioritet) return -1;
    return 0


    if (a[0].index > b[0].index) return 1;
    if (a[0].index < b[0].index) return -1;
}
