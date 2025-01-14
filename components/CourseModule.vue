<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="border rounded-lg p-4 flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      </div>
      <span class="text-gray-700">{{ title }}</span>
    </div>
    <div class="flex items-center space-x-4">
      <button class="text-gray-600 hover:text-gray-800 px-3 py-1">
        Add Content
      </button>
      <span class="text-gray-500 text-sm">Draft</span>
      <button class="text-gray-400 hover:text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6 6L14 10L6 14V6Z"/>
        </svg>
      </button>
    </div>
  </div>
</template>