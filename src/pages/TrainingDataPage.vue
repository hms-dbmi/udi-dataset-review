<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTrainingStore } from 'src/stores/TrainingStore';

const trainingStore = useTrainingStore();

const currentIndex = ref<{
  template: number;
  expanded: number;
  paraphrased: number;
}>({
  template: 0,
  expanded: 0,
  paraphrased: 0,
});

type stepType = 'expanded' | 'paraphrased' | 'template';

function next(stepType: stepType) {
  switch (stepType) {
    case 'template':
      currentIndex.value.template = currentIndex.value.template + 1;
      currentIndex.value.expanded = 0;
      currentIndex.value.paraphrased = 0;
      if (currentIndex.value.template >= numberOfTemplates.value) {
        currentIndex.value.template = 0;
      }
      break;
    case 'expanded':
      currentIndex.value.expanded = currentIndex.value.expanded + 1;
      currentIndex.value.paraphrased = 0;
      if (currentIndex.value.expanded >= numberOfExpanded.value) {
        currentIndex.value.expanded = 0;
      }
      break;
    case 'paraphrased':
      currentIndex.value.paraphrased = currentIndex.value.paraphrased + 1;
      if (currentIndex.value.paraphrased >= numberOfParaphrased.value) {
        currentIndex.value.paraphrased = 0;
      }
      break;
  }
  fetchCurrentExampleTrainingData();
}

function prev(stepType: stepType) {
  switch (stepType) {
    case 'template':
      currentIndex.value.template = currentIndex.value.template - 1;
      currentIndex.value.expanded = 0;
      currentIndex.value.paraphrased = 0;
      if (currentIndex.value.template < 0) {
        currentIndex.value.template = numberOfTemplates.value - 1;
      }
      break;
    case 'expanded':
      currentIndex.value.expanded = currentIndex.value.expanded - 1;
      currentIndex.value.paraphrased = 0;
      if (currentIndex.value.expanded < 0) {
        currentIndex.value.expanded = numberOfExpanded.value - 1;
      }
      break;
    case 'paraphrased':
      currentIndex.value.paraphrased = currentIndex.value.paraphrased - 1;
      if (currentIndex.value.paraphrased < 0) {
        currentIndex.value.paraphrased = numberOfParaphrased.value - 1;
      }
      break;
  }
  fetchCurrentExampleTrainingData();
}

function fetchCurrentExampleTrainingData() {
  const { template, expanded, paraphrased } = currentIndex.value;
  fetchExampleTrainingData(template, expanded, paraphrased);
  fetchParaphrasedCounts(template, expanded);
}

function fetchExampleTrainingData(
  templateId: number,
  expandedId: number,
  paraphrasedId: number,
) {
  const combinedId = `${templateId}_${expandedId}_${paraphrasedId}`;
  window?.electron.fetchRowData(combinedId).then((data) => {
    currentExample.value = data;
  });
}

function fetchCurrentExampleParaphrasedCount() {
  const { template, expanded } = currentIndex.value;
  fetchParaphrasedCounts(template, expanded);
}

function fetchParaphrasedCounts(templateId: number, expandedId: number) {
  window?.electron
    .fetchParaphrasedCounts(templateId, expandedId)
    .then((data) => {
      numberOfParaphrased.value = data[0].count;
    });
}

const currentExample = ref<TrainingData | null>(null);

const numberOfExamples = ref(0);

const numberOfTemplates = computed(() => {
  return expandedCounts.value.length;
});

const numberOfExpanded = computed(() => {
  return (
    expandedCounts.value.find(
      (item) => item.template_id === currentIndex.value.template,
    )?.count ?? 0
  );
});

const numberOfParaphrased = ref<number>(0);

const expandedCounts = ref<ExpandedCount[]>([]);

onMounted(() => {
  window?.electron.fetchRowCount().then((data) => {
    numberOfExamples.value = data[0].count;
  });

  window?.electron.fetchExpandedCounts().then((data) => {
    expandedCounts.value = data;
  });

  fetchCurrentExampleTrainingData();
  fetchCurrentExampleParaphrasedCount();
});

export interface TrainingData {
  id: number;
  combined_id: string;
  template_id: number;
  expanded_id: number;
  paraphrased_id: number;
  query: string;
  spec: string;
  constraints: string;
  creation_method: string;
  dataset_schema: string;
  solution: string;
  expertise: number;
  formality: number;
  query_base: string;
  query_template: string;
  query_type: string;
  spec_template: string;
}

export interface ExpandedCount {
  template_id: number;
  count: number;
}

export interface ParaphrasedCount {
  template_id: number;
  expanded_id: number;
  count: number;
}

export interface RowCount {
  count: number;
}

const validSpec = computed(() => {
  try {
    JSON.parse(currentExample.value?.spec ?? '');
    return true;
  } catch (_error) {
    return false;
  }
});

const spec = computed(() => {
  return JSON.parse(currentExample.value?.spec ?? '');
});
</script>
<template>
  <q-drawer v-model="trainingStore.leftDrawerOpen" bordered :width="400">
    <q-list separator>
      <q-item>
        <q-item-section>
          <q-item-label>{{ currentExample?.query_type }}</q-item-label>
          <q-item-label caption>query_type</q-item-label>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>{{ currentExample?.creation_method }}</q-item-label>
          <q-item-label caption>creation_method</q-item-label>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>{{ currentExample?.query_template }}</q-item-label>
          <q-item-label caption>query_template</q-item-label>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>
            <JsonViewer
              v-if="currentExample"
              :value="JSON.parse(currentExample?.constraints ?? '[]')"
              expand-depth="3"
              theme="light"
            />
          </q-item-label>
          <q-item-label caption>constraints</q-item-label>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>{{ currentExample?.dataset_schema }}</q-item-label>
          <q-item-label caption>dataset_schema</q-item-label>
        </q-item-section>
      </q-item>

      <q-item>
        <q-item-section>
          <q-item-label>
            <JsonViewer
              v-if="currentExample"
              :value="JSON.parse(currentExample?.solution ?? '{}')"
              expand-depth="2"
              theme="light"
            />
          </q-item-label>
          <q-item-label caption>solution</q-item-label>
        </q-item-section>
      </q-item>

      <q-item>
        <q-item-section>
          <q-item-label>{{ currentExample?.query_base }}</q-item-label>
          <q-item-label caption>query_base</q-item-label>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>{{ currentExample?.query }}</q-item-label>
          <q-item-label caption>query</q-item-label>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>{{ currentExample?.expertise }}</q-item-label>
          <q-item-label caption>expertise</q-item-label>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>{{ currentExample?.formality }}</q-item-label>
          <q-item-label caption>formality</q-item-label>
        </q-item-section>
      </q-item>

      <q-item>
        <q-item-section>
          <q-item-label>
            <JsonViewer
              :value="JSON.parse(currentExample?.spec_template ?? '{}')"
              expand-depth="4"
              theme="light"
            />
          </q-item-label>
          <q-item-label caption>spec_template</q-item-label>
        </q-item-section>
      </q-item>

      <q-item>
        <q-item-section>
          <q-item-label>
            <JsonViewer
              :value="JSON.parse(currentExample?.spec ?? '{}')"
              expand-depth="4"
              theme="light"
            />
          </q-item-label>
          <q-item-label caption>spec</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-drawer>
  <q-page class="column items-center justify-start q-ma-md">
    <div class="q-mt-lg q-ml-lg q-mr-lg">
      <q-card flat class="q-mb-md mw-600" v-if="currentExample">
        <q-card-section>
          <div class="text-h6">
            {{ (currentExample.id + 1).toLocaleString() }} of
            {{ numberOfExamples.toLocaleString() }}
          </div>
          <q-list separator>
            <q-item>
              <q-item-section avatar>
                <q-icon color="primary" name="radio_button_unchecked" />
              </q-item-section>

              <q-item-section>
                <q-item-label
                  >{{ (currentIndex.template + 1).toLocaleString() }} of
                  {{ numberOfTemplates.toLocaleString() }}
                  templates</q-item-label
                >
                <q-item-label caption>{{
                  currentExample.query_template
                }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  @click="prev('template')"
                  flat
                  round
                  icon="chevron_left"
                />
              </q-item-section>
              <q-item-section side>
                <q-btn
                  @click="next('template')"
                  flat
                  round
                  icon="chevron_right"
                />
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar>
                <q-icon color="primary" name="radio_button_checked" />
              </q-item-section>

              <q-item-section>
                <q-item-label
                  >{{ (currentIndex.expanded + 1).toLocaleString() }} of
                  {{ numberOfExpanded.toLocaleString() }} expanded</q-item-label
                >
                <q-item-label caption>{{
                  currentExample.query_base
                }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  @click="prev('expanded')"
                  flat
                  round
                  icon="chevron_left"
                />
              </q-item-section>
              <q-item-section side>
                <q-btn
                  @click="next('expanded')"
                  flat
                  round
                  icon="chevron_right"
                />
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar>
                <q-icon color="primary" name="check_circle" />
              </q-item-section>

              <q-item-section>
                <q-item-label
                  >{{ (currentIndex.paraphrased + 1).toLocaleString() }} of
                  {{ numberOfParaphrased.toLocaleString() }}
                  paraphrased</q-item-label
                >
                <q-item-label caption
                  >Formality: {{ currentExample.formality }}, Expertise:
                  {{ currentExample.expertise }}</q-item-label
                >
              </q-item-section>
              <q-item-section side>
                <q-btn
                  @click="prev('paraphrased')"
                  flat
                  round
                  icon="chevron_left"
                />
              </q-item-section>
              <q-item-section side>
                <q-btn
                  @click="next('paraphrased')"
                  flat
                  round
                  icon="chevron_right"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
      <template v-if="currentExample">
        <p class="text-h5">
          {{ currentExample.query }}
        </p>
        <UDIVis v-if="validSpec" :spec="spec"></UDIVis>
      </template>
    </div>
  </q-page>
</template>

<style lang="scss">
.jv-code {
  padding: 0 !important;
}

.mw-600 {
  max-width: 600px;
}
</style>
