

/**
 * Класс управления выделением в списках
 * @returns {guiSelections}
 */
function guiSelections(){

    this.selectedItems = {}
    this.selectedCount = {}

    this.intTag = function(tag)
    {
        if(!this.selectedItems[tag])
        {
            this.selectedItems[tag] = {}
            this.selectedCount[tag] = 0
        }

    }

    this.isSelected = function(tag, id)
    {
        return this.selectedItems[tag][id] == true
    }

    this.unSelectAll = function(tag)
    {
        for(let i in this.selectedItems[tag])
        {
            this.selectedItems[tag][i] = false
        }

        this.selectedCount[tag] = 0
    }

    this.getSelection = function(tag)
    {
        let ids = []
        for(let i in this.selectedItems[tag])
        {
            if(this.selectedItems[tag][i])
            {
                ids.push(i)
            }
        }

        return ids;
    }

    this.getSelectionFromCurrentPage = function(elements)
    {
        let ids = []
        for (var i = 0; i < elements.length; i++)
        {
            ids.push($(elements[i]).attr('data-id'))
        }
        return ids;
    }

    this.setSelection = function(tag, id, value)
    {
        let delta = 0;

        if($.isArray(id))
        {
            for(let i in id)
            {
                if(this.selectedItems[tag][id[i]] === undefined)
                {
                    this.selectedItems[tag][id[i]] = false
                }
                delta -= this.selectedItems[tag][id[i]] - !!value
                this.selectedItems[tag][id[i]] = !!value
            }

            this.selectedCount[tag] += delta
            return;
        }

        if(this.selectedItems[tag][id] === undefined)
        {
            this.selectedItems[tag][id] = false
        }
        delta -= this.selectedItems[tag][id] - !!value
        this.selectedItems[tag][id] = !!value

        this.selectedCount[tag] += delta
    }

    this.toggleSelectElements = function (tag, elements, mode)
    {
        let ids = []
        for (var i = 0; i < elements.length; i++)
        {
            ids.push($(elements[i]).attr('data-id'))
        }

        this.setSelection(tag, ids, mode)
    }

    this.toggleSelection = function(tag, id)
    {
        let delta = 0;
        if($.isArray(id))
        {
            for(let i in id)
            {
                if(this.selectedItems[tag][id[i]] === undefined)
                {
                    this.selectedItems[tag][id[i]] = false
                }
                delta -= this.selectedItems[tag][id[i]] - !this.selectedItems[tag][id[i]]
                this.selectedItems[tag][id[i]] = !this.selectedItems[tag][id[i]]
            }

            this.selectedCount[tag] += delta
            return;
        }

        if(this.selectedItems[tag][id] === undefined)
        {
            this.selectedItems[tag][id] = false
        }
        delta -= this.selectedItems[tag][id] - !this.selectedItems[tag][id]
        this.selectedItems[tag][id] = !this.selectedItems[tag][id]
        this.selectedCount[tag] += delta
    }

    this.selectionControll = function(tag, id, css_class)
    {
        if(!this.selectedItems[tag][id])
        {
            this.selectedItems[tag][id] = false
        }

        if(!css_class)
        {
            css_class = 'selected'
        }

        return this.selectedItems[tag].justClass(id, css_class)
    }

}


window.guiListSelections = new guiSelections()

