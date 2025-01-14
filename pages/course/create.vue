<script setup>
import { useCourseStore } from '~/stores/courseStore'

definePageMeta({
  layout: 'dashboard'
})

const store = useCourseStore()
const isLoading = ref(true)

// Simulate loading state
onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  isLoading.value = false
})
</script>

<template>
  <LoadingSpinner v-if="isLoading" />
  <template v-else>
    <!-- Header -->
    <header class="bg-white border-b">
      <!-- Top navigation -->
      <div class="border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex h-12 items-center justify-between">
            <div class="flex items-center space-x-4">
              <a href="/" class="text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </a>
              <div class="flex items-center space-x-2">
                <span class="text-gray-600">Rangan SaRam's First</span>
                <span class="text-gray-400">/</span>
                <span class="text-gray-900">Courses</span>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-gray-600">Rangan SaRam</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Course header -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center space-x-4">
            <img src="https://via.placeholder.com/40" alt="Course thumbnail" class="rounded-lg" />
            <h1 class="text-xl font-semibold">{{ store.title }}</h1>
          </div>
          <div class="flex items-center space-x-4">
            <button class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Add content
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CourseNavigation />
      <div class="mt-6">
        <CourseOutline />
      </div>
    </div>
  </template>
</template>