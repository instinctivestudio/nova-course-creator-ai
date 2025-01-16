<script setup lang="ts">
import {
  Home,
  Package,
  Users,
  BarChart2,
  ChevronDown,
  ChevronRight,
} from "lucide-vue-next";

const isProductsExpanded = ref(false);
const isContactsExpanded = ref(false);

const toggleProducts = () => {
  isProductsExpanded.value = !isProductsExpanded.value;
};

const toggleContacts = () => {
  isContactsExpanded.value = !isContactsExpanded.value;
};
</script>

<template>
  <aside class="w-64 bg-white border-r h-screen flex flex-col">
    <!-- Get Started Section -->
    <div class="p-4">
      <div class="bg-blue-600 text-white rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-blue-200">Get Started</span>
          <span class="text-sm text-blue-200">1/4</span>
        </div>
        <button class="flex items-center space-x-2 text-white font-medium">
          <span>Create Product</span>
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Navigation Links -->
    <nav class="flex-1 px-4 space-y-1">
      <a
        href="#"
        class="flex items-center space-x-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
      >
        <Home class="h-5 w-5" />
        <span>Dashboard</span>
      </a>

      <div>
        <button
          @click="toggleProducts"
          class="w-full flex items-center justify-between px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <div class="flex items-center space-x-3">
            <Package class="h-5 w-5" />
            <span>Products</span>
          </div>
          <component
            :is="isProductsExpanded ? ChevronDown : ChevronRight"
            class="h-4 w-4"
          />
        </button>

        <div v-if="isProductsExpanded" class="ml-8 mt-1 space-y-1">
          <a
            href="#"
            class="block px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-100"
          >
            All Products
          </a>
          <a
            href="#"
            class="block px-3 py-2 text-gray-600 rounded-lg bg-gray-100"
          >
            Courses
          </a>
        </div>
      </div>

      <div>
        <button
          @click="toggleContacts"
          class="w-full flex items-center justify-between px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <div class="flex items-center space-x-3">
            <Users class="h-5 w-5" />
            <span>Contacts</span>
          </div>
          <component
            :is="isContactsExpanded ? ChevronDown : ChevronRight"
            class="h-4 w-4"
          />
        </button>
      </div>

      <a
        href="#"
        class="flex items-center space-x-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
      >
        <BarChart2 class="h-5 w-5" />
        <span>Analytics</span>
      </a>
    </nav>
  </aside>
</template>
