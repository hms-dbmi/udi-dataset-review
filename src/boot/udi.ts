import { boot } from 'quasar/wrappers';
import { UDIToolkit } from 'udi-toolkit';

export default boot(({ app }) => {
  app.use(UDIToolkit);
});
