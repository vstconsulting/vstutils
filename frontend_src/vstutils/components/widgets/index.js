import { globalComponentsRegistrator } from '../../ComponentsRegistrator.js';

import Counter from './Counter.vue';
import LineChart from './LineChart.js';

globalComponentsRegistrator.add(Counter);
globalComponentsRegistrator.add(LineChart);

export { Counter, LineChart };
