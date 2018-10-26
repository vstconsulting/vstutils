

/**
 * Класс управления выделением в списках
 * @returns {guiSelections}
 */
function guiSelections(){

    this.selectedItems = {}
    this.selectedCount = {}

    this.lastTag = undefined
    this.initTag = function(tag, doNotDeleteOldSelections = false)
    {
        if(this.lastTag != tag && !doNotDeleteOldSelections)
        {
            this.selectedItems = {}
            this.selectedCount = {}
        }

        if(!this.selectedItems[tag])
        {
            this.selectedItems[tag] = {}
            this.selectedCount[tag] = 0
        }

        if(!doNotDeleteOldSelections)
        {
            this.lastTag = tag
        }

    }

    this.isSelected = function(tag, id)
    {
        if(!this.selectedItems[tag])
        {
            return false;
        }

        return this.selectedItems[tag][id] == true
    }

    this.unSelectAll = function(tag)
    {
        if(!this.selectedItems[tag])
        {
            return;
        }

        for(let i in this.selectedItems[tag])
        {
            this.selectedItems[tag][i] = false
        }

        this.selectedCount[tag] = 0
    }

    this.getSelection = function(tag)
    {
        if(!this.selectedItems[tag])
        {
            return []
        }

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
        if(!this.selectedItems[tag])
        {
            return;
        }

        let delta = 0;

        if($.isArray(id))
        {
            for(let i in id)
            {
                if(this.selectedItems[tag][id[i]] === undefined)
                {
                    continue;
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
        if(!this.selectedItems[tag])
        {
            return;
        }

        let ids = []
        for (var i = 0; i < elements.length; i++)
        {
            ids.push($(elements[i]).attr('data-id'))
        }

        this.setSelection(tag, ids, mode)
    }

    this.toggleSelection = function(tag, id)
    {
        if(!this.selectedItems[tag])
        {
            return;
        }

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
        if(!this.selectedItems[tag])
        {
            return;
        }

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

