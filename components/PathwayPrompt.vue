<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useCourseStore } from "~/stores/courseStore";
import {
  generatePathwayDetails,
  type PathwayDetails,
} from "~/services/pathwayDetails";

const emit = defineEmits(["next"]);
const store = useCourseStore();
const prompt = ref("");
const isLoading = ref(false);
const error = ref("");
const generatingDots = ref(".");
let dotsInterval: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  dotsInterval = setInterval(() => {
    generatingDots.value =
      generatingDots.value.length < 3 ? generatingDots.value + "." : ".";
  }, 400);
});

onUnmounted(() => {
  if (dotsInterval) {
    clearInterval(dotsInterval);
  }
});

const handleGenerateDetails = async () => {
  if (!prompt.value.trim()) {
    error.value = "Please enter a description of your pathway";
    return;
  }

  error.value = "";
  isLoading.value = true;

  try {
    const pathwayDetails = await generatePathwayDetails(prompt.value);

    // Update the store with the generated details
    store.setTitle(pathwayDetails.title || "");
    store.setDescription(pathwayDetails.description || "");
    store.setLearningOutcomes(pathwayDetails.learningOutcomes || "");
    store.setTargetAudience(pathwayDetails.targetAudience || "");
    store.setWhyTakeIt(pathwayDetails.whyTakeIt || "");

    // Move to the next step
    emit("next");
  } catch (err) {
    console.error("Error generating pathway details:", err);
    error.value = "Failed to generate pathway details. Please try again.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="p-6 bg-white rounded-lg shadow-sm max-w-2xl w-full">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">Describe Your Pathway</h2>
      <span class="text-sm text-gray-500">Step 1 of 2</span>
    </div>
    <p class="text-gray-600 mb-6">
      Tell us about the pathway you want to create in natural language, and
      we'll help you generate the details.
    </p>

    <div class="space-y-6">
      <div>
        <label
          for="prompt"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          Pathway Description <span class="text-red-500">*</span>
        </label>
        <textarea
          id="prompt"
          v-model="prompt"
          placeholder="Example:"
          rows="6"
          :class="[
            'w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500',
            error ? 'border-red-500' : 'border-gray-300',
          ]"
        ></textarea>
        <p v-if="error" class="mt-1 text-sm text-red-500">
          {{ error }}
        </p>
      </div>

      <button
        @click="handleGenerateDetails"
        :disabled="isLoading"
        class="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
      >
        <div v-if="isLoading">Generating{{ generatingDots }}</div>
        <div v-else>Generate Pathway Details</div>
      </button>
    </div>
  </div>
</template>
