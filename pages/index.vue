<script setup>
import { useCourseStore } from "~/stores/courseStore";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const store = useCourseStore();
const isLoading = ref(false);
const currentStep = ref(1); // 1 = Prompt, 2 = Form

// Check if the user has already generated a pathway
onMounted(() => {
  // If there are steps, it means a pathway has been generated
  if (store.pathway.steps && store.pathway.steps.length > 0) {
    router.push("/pathway");
  }

  // Check authentication
  const token = localStorage.getItem("authToken");
  if (!token) {
    router.push("/login");
  }
});

const handleNext = async () => {
  isLoading.value = true;
  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } finally {
    isLoading.value = false;
  }
};

const goToFormStep = () => {
  currentStep.value = 2;
};

const goToGenerateStep = async () => {
  await handleNext();
  router.push("/pathway");
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <LoadingSpinner v-if="isLoading" />
    <div
      v-else
      class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
    >
      <PathwayPrompt v-if="currentStep === 1" @next="goToFormStep" />
      <PathwayForm v-else @next="goToGenerateStep" />
      <PathwayPreview />
    </div>
  </div>
</template>
