import type { App } from 'vue';

import type { SFCWithInstall } from '#/helpers';

import QRow from './src/QRow.vue';

/* istanbul ignore next */
QRow.install = (app: App): void => {
  app.component(QRow.name, QRow);
};

export type { QRowProps, QRowInstance } from './src/types';
export default QRow as SFCWithInstall<App, typeof QRow>;
