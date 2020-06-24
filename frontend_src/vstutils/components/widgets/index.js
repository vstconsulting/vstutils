import { globalComponentsRegistrator } from '../../ComponentsRegistrator.js';

import CounterWidgetComponent from './CounterWidgetComponent.vue';
import LineChartWidgetComponent from './LineChartWidgetComponent.js';

globalComponentsRegistrator.add(CounterWidgetComponent);
globalComponentsRegistrator.add(LineChartWidgetComponent);

export { CounterWidgetComponent, LineChartWidgetComponent };
