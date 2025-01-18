<script setup lang="ts">
const tabs = [
  { name: "Pathway Outline", count: null },
  { name: "Resources", count: 12 },
];
</script>

<template>
  <nav class="border-b border-gray-200">
    <ul class="flex space-x-8">
      <li v-for="tab in tabs" :key="tab.name">
        <a
          href="#"
          :class="[
            'inline-flex items-center px-1 py-4 text-sm font-medium',
            tab.name === 'Pathway Outline'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
          ]"
        >
          {{ tab.name }}
          <span v-if="tab.count !== null" class="ml-2 text-gray-400"
            >({{ tab.count }})</span
          >
        </a>
      </li>
    </ul>
  </nav>
</template>
