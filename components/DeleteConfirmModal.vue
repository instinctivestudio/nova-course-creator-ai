<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">{{ title }}</h2>
        <button @click="cancel" class="text-gray-400 hover:text-gray-600">
          <X class="h-6 w-6" />
        </button>
      </div>

      <div class="space-y-4">
        <p class="text-gray-600">
          {{
            message ||
            "Are you sure you want to delete this item? This action cannot be undone."
          }}
        </p>

        <div v-if="itemPreview" class="bg-gray-50 p-3 rounded">
          <p class="font-medium">{{ itemPreview.title }}</p>
          <p v-if="itemPreview.description" class="text-sm text-gray-500 mt-1">
            {{ itemPreview.description }}
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="cancel"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="confirm"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";

interface ItemPreview {
  title: string;
  description?: string;
}

const props = defineProps<{
  isVisible: boolean;
  title: string;
  message?: string;
  itemPreview?: ItemPreview | null;
}>();

const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "confirm"): void;
}>();

function cancel() {
  emit("cancel");
}

function confirm() {
  emit("confirm");
}
</script>
