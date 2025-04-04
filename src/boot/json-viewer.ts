import { defineBoot } from '#q-app/wrappers';
import JsonViewer from 'vue3-json-viewer';
import 'vue3-json-viewer/dist/index.css';

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot(({ app }) => {
  // something to do
  app.use(JsonViewer);
});
