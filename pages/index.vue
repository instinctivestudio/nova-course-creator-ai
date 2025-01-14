<script setup>
import { useCourseStore } from '~/stores/courseStore'

const router = useRouter()
const store = useCourseStore()
const isLoading = ref(false)

const handleNext = async () => {
  isLoading.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    router.push('/course/create')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <LoadingSpinner v-if="isLoading" />
    <div v-else class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <CourseForm @next="handleNext" />
      <CoursePreview />
    </div>
  </div>
</template>