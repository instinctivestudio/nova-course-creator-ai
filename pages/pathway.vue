<template>
  <div class="min-h-screen bg-gray-50 flex">
    <Sidebar />
    <div class="flex-1">
      <!-- Header -->
      <header class="bg-white border-b">
        <!-- Pathway header -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16 items-center">
            <div class="flex items-center space-x-4">
              <h1 class="text-xl font-semibold">{{ store.title }}</h1>
            </div>
            <div class="flex items-center space-x-4">
              <button
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CourseNavigation
          :activeTab="activeTab"
          :resourcesCount="myResourceCount"
          @tabChange="handleTabChange"
        />

        <!-- The transition makes the tab switch fade in and out -->
        <transition name="fade" mode="out-in">
          <!-- keep-alive ensures CourseResources is mounted immediately, 
               so the watcher fires and the Resources count is correct from the start -->
          <keep-alive>
            <component
              :is="
                activeTab === 'Pathway Outline'
                  ? CourseOutline
                  : CourseResources
              "
              @countChanged="handleResourceCountChanged"
            />
          </keep-alive>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useCourseStore } from "~/stores/courseStore";
import CourseNavigation from "~/components/CourseNavigation.vue";
import CourseOutline from "~/components/CourseOutline.vue";
import CourseResources from "~/components/CourseResources.vue";
import Sidebar from "~/components/Sidebar.vue";

const store = useCourseStore();

/**
 * Manage which tab is currently active
 */
const activeTab = ref("Pathway Outline");

/**
 * This ref will be updated whenever CourseResources.vue
 * emits a "countChanged" event
 */
const myResourceCount = ref(0);

/**
 * Tab click handler from CourseNavigation
 */
function handleTabChange(tabName: string) {
  activeTab.value = tabName;
}

/**
 * This captures the emitted count from CourseResources.vue
 * ("groupedSources.length" or similar)
 */
function handleResourceCountChanged(newCount: number) {
  myResourceCount.value = newCount;
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
