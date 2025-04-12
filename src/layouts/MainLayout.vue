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
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useTrainingStore } from 'src/stores/TrainingStore';
const trainingStore = useTrainingStore();
</script>
