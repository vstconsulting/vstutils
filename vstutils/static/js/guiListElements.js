
function renderLineField(field, value, field_name, dataLine)
{ 
    let type = getFieldType(field, dataLine, guiListElements) 
    if(guiListElements[type])
    {
        return guiListElements[type].render(field, value, dataLine)
    }
    
    let val = sliceLongString(value);
    if(field.value && typeof field.value == 'function')
    {
        let opt = {
            data: dataLine.line,
            fields: dataLine.opt.fields,
            value: value,
        }
        val = field.value.apply(dataLine, [opt]);
    }

    return val;
}


guiListElements = {
    
}

guiListElements.base = {
    template_name:'guiListElements.base',
    type:'base',
    render : function(field, value, dataLine){ 
        return spajs.just.render(this.template_name, {field:field, value:value, dataLine:dataLine, guiObj:this});
    } 
}

guiListElements.boolean = $.extend(guiListElements.base, {
    type:'boolean',
    template_name:'guiListElements.boolean'
})

guiListElements.array = $.extend(guiListElements.base, {
    type:'array',
    template_name:'guiListElements.array'
})