/**
 * Class of base widget.
 */
import CounterWidgetComponent from './components/widgets/CounterWidgetComponent.vue';

export class BaseWidget {
    constructor(options = {}) {
        /**
         * Component name for widget to render
         */
        this.componentName = null;
        /**
         * Order number of current widget.
         */
        this.sort = 0;
        /**
         * Property, that means, that current widget should be shown on the page.
         */
        this.active = true;
        /**
         * Property, that means, that current widget should be collapsed on the page.
         */
        this.collapse = false;
        /**
         * Property, that means, that current widget could be collapsed on the page.
         */
        this.collapsable = true;
        /**
         * Name of widget.
         */
        this.name = options.name;
        /**
         * Widget's title, that will be shown on the page.
         */
        this.title = options.title;

        ['active', 'collapse', 'sort'].forEach((key) => {
            if (options[key] !== undefined) {
                this[key] = options[key];
            }
        });
    }
}

/**
 * Class of counter widget.
 */
export class CounterWidget extends BaseWidget {
    constructor(options = {}) {
        super(options);

        this.componentName = CounterWidgetComponent.name;
        this.collapsable = false;
        /**
         * URL of page with which current widget is linked.
         */
        this.url = options.url;
    }
}

/**
 * Class of card widget.
 */
export class CardWidget extends BaseWidget {}
