<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  activeTab: {
    type: String,
    default: "",
  },
  resourcesCount: {
    type: Number,
    default: 0,
  },
});

const emits = defineEmits(["tabChange"]);

const handleTabClick = (tabName: string) => {
  emits("tabChange", tabName);
};
</script>

<template>
  <nav class="border-b border-gray-200">
    <ul class="flex space-x-8">
      <li>
        <a
          href="#"
          @click.prevent="handleTabClick('Pathway Outline')"
          :class="[
            'inline-flex items-center px-1 py-4 text-sm font-medium',
            activeTab === 'Pathway Outline'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
          ]"
        >
          Pathway Outline
        </a>
      </li>
      <li>
        <a
          href="#"
          @click.prevent="handleTabClick('Resources')"
          :class="[
            'inline-flex items-center px-1 py-4 text-sm font-medium',
            activeTab === 'Resources'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
          ]"
        >
          Resources
          <span v-if="resourcesCount" class="ml-2">
            ({{ resourcesCount }})
          </span>
        </a>
      </li>
    </ul>
  </nav>
</template>
