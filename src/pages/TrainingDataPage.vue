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
  const combinedId = getCombinedId(templateId, expandedId, paraphrasedId);
  window?.electron.fetchRowData(combinedId).then((data) => {
    currentExample.value = data;
  });
}

function getCombinedId(
  templateId: number,
  expandedId: number,
  paraphrasedId: number,
) {
  return `${templateId}_${expandedId}_${paraphrasedId}`;
}

async function fetchCurrentExampleParaphrasedCount() {
  const { template, expanded } = currentIndex.value;
  await fetchParaphrasedCounts(template, expanded);
}

async function fetchParaphrasedCounts(templateId: number, expandedId: number) {
  const data = await window?.electron.fetchParaphrasedCounts(
    templateId,
    expandedId,
  );
  numberOfParaphrased.value = data[0].count;
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

onMounted(async () => {
  window?.electron.fetchRowCount().then((data) => {
    numberOfExamples.value = data[0].count;
  });

  expandedCounts.value = await window?.electron.fetchExpandedCounts();
  await selectRandomIndex();
  fetchCurrentExampleTrainingData();
  fetchCurrentExampleParaphrasedCount();
  window?.electron.createReviews();
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

const reviewerComment = ref<string>('');

interface FeedbackCategory {
  present: boolean;
  name: string;
  description: string;
}

const possibleFeedbackCategories = ref<FeedbackCategory[]>([
  {
    present: false,
    name: 'Bad Question',
    description: 'The question does not make sense.',
  },
  {
    present: false,
    name: 'Error Message',
    description:
      'An error message is displayed where there should be a visualization.',
  },
  {
    present: false,
    name: 'Malformed Visualization',
    description: 'The visualization is blank or malformed.',
  },
  {
    present: false,
    name: 'Question Not Answered',
    description:
      'It is impossible to answer the question posed with the visualization.',
  },
  {
    present: false,
    name: 'Other',
    description: 'Something else is wrong. (Please describe in comments.)',
  },
]);

const feedbackCategories = computed<string[]>(() => {
  if (!currentExample.value) return [];
  if (feedbackStatus.value === null) return [];
  if (feedbackStatus.value === 'good') return [];
  if (feedbackStatus.value === 'improve') return [];
  if (feedbackStatus.value === 'bad') {
    return possibleFeedbackCategories.value
      .filter((issue) => issue.present)
      .map((issue) => issue.name);
  }
  return [];
});

const feedbackStatus = ref<'good' | 'bad' | 'improve' | null>(null);

function setFeedbackStatus(status: 'good' | 'bad' | 'improve') {
  setTimeout(() => {
    // purely for aesthetics, so ripple animation appears to fill in button
    feedbackStatus.value = status;
  }, 160);
}

function resetFeedbackStatus() {
  feedbackStatus.value = null;
}

const showNavigation = computed(() => trainingStore.leftDrawerOpen);

async function submitFeedback() {
  const current = currentExample.value;
  if (!current) {
    return;
  }
  const status = feedbackStatus.value;
  if (!status) {
    return;
  }
  window?.electron.addReview({
    data_id: current.id,
    combined_id: current.combined_id,
    template_id: current.template_id,
    expanded_id: current.expanded_id,
    paraphrased_id: current.paraphrased_id,
    query_template: current.query_template,
    constraints: current.constraints,
    spec_template: current.spec_template,
    query_type: current.query_type,
    creation_method: current.creation_method,
    query_base: current.query_base,
    spec: current.spec,
    solution: current.solution,
    dataset_schema: current.dataset_schema,
    query: current.query,
    expertise: current.expertise,
    formality: current.formality,
    review_status: status,
    reviewer: 'Devin', // TODO: either get from user, or assign on initial load
    review_comments: reviewerComment.value,
    review_categories: feedbackCategories.value,
  });

  trainingStore.reviewCount += 1;

  // clear feedback
  resetFeedbackStatus();
  for (const issue of possibleFeedbackCategories.value) {
    issue.present = false;
  }
  reviewerComment.value = '';
  await selectRandomIndex();
  fetchCurrentExampleTrainingData();
}

async function selectRandomIndex() {
  const completedReviews = new Set(
    (await trainingStore.fetchAllReviews()).map((review) => review.combined_id),
  );
  do {
    currentIndex.value.template = Math.floor(
      Math.random() * (numberOfTemplates.value - 1),
    );
    currentIndex.value.expanded = Math.floor(
      Math.random() * (numberOfExpanded.value - 1),
    );
    await fetchCurrentExampleParaphrasedCount();

    currentIndex.value.paraphrased = Math.floor(
      Math.random() * (numberOfParaphrased.value - 1),
    );
  } while (
    completedReviews.has(
      getCombinedId(
        currentIndex.value.template,
        currentIndex.value.expanded,
        currentIndex.value.paraphrased,
      ),
    )
  );
}
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
  <q-page class="column items-center justify-start q-ma-sm">
    <div v-if="showNavigation" class="q-mt-none q-ml-lg q-mr-lg full-width">
      <q-card flat class="q-mb-md" v-if="currentExample">
        <q-card-section class="q-pa-sm q-pt-none">
          <div class="text-h6">
            {{ (currentExample.id + 1).toLocaleString() }} of
            {{ numberOfExamples.toLocaleString() }}
          </div>
          <q-list separator dense>
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
          <q-separator></q-separator>
        </q-card-section>
      </q-card>
    </div>
    <div class="full-width row justify-between">
      <div class="q-pa-md q-ml-md q-mr-md mw-600">
        <template v-if="currentExample">
          <p class="text-h5">
            {{ currentExample.query }}
          </p>
          <UDIVis v-if="validSpec" :spec="spec"></UDIVis>
        </template>
        <template v-else>
          <div>Loading...</div>
        </template>
      </div>
      <q-card flat class="q-mb-md mw-585" v-if="currentExample">
        <q-card-section class="row">
          <q-btn
            no-caps
            size="xl"
            color="positive"
            label="Looks Good!"
            :outline="feedbackStatus !== 'good'"
            :ripple="{ color: 'green' }"
            class="chonk-button"
            @click="setFeedbackStatus('good')"
          ></q-btn>
          <q-space></q-space>
          <q-btn
            no-caps
            size="xl"
            color="warning"
            label="Could Be Better"
            :outline="feedbackStatus !== 'improve'"
            :ripple="{ color: 'orange' }"
            class="chonk-button"
            @click="setFeedbackStatus('improve')"
          ></q-btn>
          <q-space></q-space>
          <q-btn
            no-caps
            size="xl"
            color="negative"
            :ripple="{ color: 'red' }"
            class="chonk-button"
            label="Something's Wrong"
            :outline="feedbackStatus !== 'bad'"
            @click="setFeedbackStatus('bad')"
          ></q-btn>
        </q-card-section>
        <template v-if="feedbackStatus === 'improve'">
          <q-card-section>
            Please provide a short description of how the visualization could be
            improved.
          </q-card-section>
          <q-card-section>
            <q-input
              v-model="reviewerComment"
              autogrow
              filled
              label="Comments"
            ></q-input>
          </q-card-section>
        </template>
        <template v-if="feedbackStatus === 'bad'">
          <q-list>
            <q-item
              v-for="issue in possibleFeedbackCategories"
              :key="issue.name"
              tag="label"
              v-ripple
            >
              <q-item-section side top>
                <q-checkbox v-model="issue.present" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ issue.name }}</q-item-label>
                <q-item-label caption>
                  {{ issue.description }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <q-card-section>
            <q-input
              v-model="reviewerComment"
              autogrow
              filled
              label="Comments"
            ></q-input>
          </q-card-section>
        </template>
        <q-card-section>
          <q-btn
            no-caps
            size="lg"
            class="full-width"
            color="primary"
            style="height: 90px"
            label="Submit and Get New Question"
            :disable="feedbackStatus === null"
            @click="submitFeedback"
          ></q-btn>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<style lang="scss">
.jv-code {
  padding: 0 !important;
}

.chonk-button {
  height: 180px;
  width: 180px;
}

.mw-585 {
  max-width: 585px;
  width: 585px;
}
.mw-600 {
  max-width: 600px;
}
</style>
