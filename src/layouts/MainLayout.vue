<script setup lang="ts">
import { computed } from 'vue';
import { useTrainingStore } from 'src/stores/TrainingStore';
const trainingStore = useTrainingStore();
const completedMessages = computed(() => {
  if (trainingStore.reviewCount === 1) {
    return `You have completed ${trainingStore.reviewCount} review.`;
  }
  return `You have completed ${trainingStore.reviewCount} reviews.`;
});

const encourageMessage = computed(() => {
  if (trainingStore.reviewCount < 5) {
    return `Blast off! 🚀`;
  } else if (trainingStore.reviewCount < 10) {
    return `Keep going! ⭐`;
  } else if (trainingStore.reviewCount < 20) {
    return `Great progress! 🌟`;
  } else if (trainingStore.reviewCount < 30) {
    return `You're awesome! 💪`;
  } else if (trainingStore.reviewCount < 50) {
    return `Amazing! ✨`;
  } else if (trainingStore.reviewCount < 75) {
    return `You're unstoppable! 🔥`;
  } else if (trainingStore.reviewCount < 100) {
    return `You're a superstar! 🌟`;
  } else if (trainingStore.reviewCount < 150) {
    return `Outstanding dedication! 🏅`;
  } else if (trainingStore.reviewCount < 200) {
    return `Incredible effort! 🏆`;
  } else if (trainingStore.reviewCount < 250) {
    return `You're a legend! 🦸`;
  } else {
    return `You're a rockstar! 🎸`;
  }
});
</script>
<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="bg-white text-primary">
        <q-btn
          flat
          dense
          round
          icon="troubleshoot"
          aria-label="Menu"
          class="q-mr-md"
          @click="trainingStore.toggleDrawer"
        />
        <q-tabs shrink inline-label dense>
          <q-route-tab no-caps to="/" label="UDI Data Review" icon="grading" />
          <q-route-tab
            no-caps
            to="/ResultsReview"
            label="Submitted"
            icon="verified"
          />
        </q-tabs>
        <div v-if="trainingStore.reviewCount > 0">
          <span>
            {{ completedMessages }}
          </span>
          <span class="encourage q-ml-sm">
            {{ encourageMessage }}
          </span>
        </div>
        <q-space />
        <q-btn
          color="primary"
          dense
          icon="file_download"
          label="Download"
          @click="trainingStore.exportAllReviews"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
<style scoped lang="scss">
.encourage {
  font-weight: bold;
}
</style>
