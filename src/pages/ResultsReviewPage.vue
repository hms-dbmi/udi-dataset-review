<script setup lang="ts">
import type { Review } from 'app/src-electron/electron-preload';
import { ref, onMounted } from 'vue';

const reviews = ref<Review[]>([]);
onMounted(async () => {
  reviews.value = await window?.electron.fetchAllReviews();
});
</script>

<template>
  <div>{{ reviews }}</div>
</template>

<style scoped lang="scss"></style>
