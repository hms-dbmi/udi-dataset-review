<script setup lang="ts">
import type { Review } from 'app/src-electron/electron-preload';
import { ref, onMounted } from 'vue';

const reviews = ref<Review[]>([]);
onMounted(async () => {
  reviews.value = await window?.electron.fetchAllReviews();
});
</script>

<template>
  <div v-if="reviews.length > 0">
    <q-card v-for="review in reviews" :key="review.data_id" class="q-mb-md">
      <q-card-section>
        <div><strong>Query:</strong> {{ review.query }}</div>
        <div><strong>Review Status:</strong> {{ review.review_status }}</div>
        <div>
          <strong>Review Comments:</strong> {{ review.review_comments }}
        </div>
        <div>
          <strong>Review Categories:</strong> {{ review.review_categories }}
        </div>
        <div><strong>Original ID:</strong> {{ review.original_id }}</div>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped lang="scss"></style>
