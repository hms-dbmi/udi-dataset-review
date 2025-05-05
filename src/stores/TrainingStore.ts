import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { Review } from 'app/src-electron/electron-preload';

// import type { UDIGrammar } from './GrammarTypes';
// import { compressToEncodedURIComponent } from 'lz-string';

export const useTrainingStore = defineStore('TrainingStore', () => {
  const reviewCount = ref<number>(0);
  fetchAllReviews().then((reviews: Review[]) => {
    reviewCount.value = reviews.length;
  });

  const leftDrawerOpen = ref<boolean>(false);

  function toggleDrawer() {
    leftDrawerOpen.value = !leftDrawerOpen.value;
  }

  async function fetchAllReviews(): Promise<Review[]> {
    return await window?.electron.fetchAllReviews();
  }

  async function exportAllReviews() {
    const reviews = await fetchAllReviews();
    const compressed = JSON.stringify(reviews);
    const blob = new Blob([compressed], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reviews.json';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  return {
    leftDrawerOpen,
    toggleDrawer,
    reviewCount,
    fetchAllReviews,
    exportAllReviews,
  };
});
