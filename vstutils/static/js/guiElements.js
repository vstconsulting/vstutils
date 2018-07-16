
var guiElements = {
}

/**
 * 
 * @param {type} opt
 * @returns {guiElements.button}
 * 
 * opt = {
 * class:''     - css
 * link:''      - ссылка
 * title:''     - подсказка
 * onclick:''   - текст события onclick
 * text:''      - текст надписи
 * }
 */
guiElements.button = function(opt)
{
    this.render = function()
    {
        if(!opt)
        {
            opt = {}
        }
        
        if(!opt.onclick)
        {
            opt.onclick = "return spajs.openURL(this.href);"
        }
        
        return spajs.just.render("guiElements.button", {opt:opt, guiObj:this});
    }
}

