<script setup lang="ts">
import { useCourseStore } from "~/stores/courseStore";
import { onMounted, computed } from "vue";

const store = useCourseStore();

// This will help debug the issue
const pathwayName = computed(() => {
  console.log("Pathway data:", store.pathway);
  return store.pathway.name || store.title || "Pathway name";
});

const pathwayDescription = computed(() => {
  return (
    store.pathway.description ||
    store.description ||
    "Short description that tells what the pathway is about."
  );
});

onMounted(() => {
  console.log("PathwayPreview mounted, pathway data:", store.pathway);
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm overflow-hidden">
    <!-- Browser mockup -->
    <div class="bg-gray-100 px-4 py-2 border-b flex items-center space-x-2">
      <div class="flex space-x-1">
        <div class="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
        <div class="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
        <div class="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
      </div>
    </div>

    <!-- Pathway preview -->
    <div class="p-6">
      <div class="bg-blue-500 text-white p-8 rounded-lg text-center mb-8">
        <h1 class="text-2xl font-bold mb-2">
          {{ pathwayName }}
        </h1>
        <p class="text-blue-100">
          {{ pathwayDescription }}
        </p>
        <button
          class="mt-4 bg-white/60 text-blue-500 px-6 py-2 rounded-md w-[100px] h-[30px]"
        ></button>
      </div>

      <!-- Placeholder content -->
      <div class="space-y-6">
        <div v-for="i in 6" :key="i" class="flex items-start space-x-4">
          <div class="w-16 h-16 bg-gray-200 rounded-md flex-shrink-0"></div>
          <div class="flex-grow">
            <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div class="w-24 h-16 bg-gray-200 rounded-md flex-shrink-0"></div>
        </div>
      </div>
    </div>
  </div>
</template>
