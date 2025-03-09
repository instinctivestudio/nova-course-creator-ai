<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Pathway Creator Access
        </h2>
      </div>
      <div v-if="error" class="bg-red-50 p-4 rounded-md">
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="login">
        <div>
          <label for="password" class="sr-only">Password</label>
          <input
            id="password"
            v-model="password"
            name="password"
            type="password"
            required
            class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Enter password"
          />
        </div>
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span v-if="isLoading">Loading...</span>
            <span v-else>Sign in</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
// Define route metadata - explicitly state no middleware needed
definePageMeta({
  middleware: [],
});

import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const password = ref("");
const error = ref("");
const isLoading = ref(false);

// Check if already authenticated
onMounted(() => {
  try {
    const token = localStorage.getItem("authToken");
    if (token) {
      // Redirect to index to go through the normal flow
      router.push("/");
    }
  } catch (e) {
    console.error("Error checking authentication:", e);
  }
});

const login = async () => {
  if (!password.value) return;

  isLoading.value = true;
  error.value = "";

  try {
    const response = await $fetch("/api/auth", {
      method: "POST",
      body: {
        password: password.value,
      },
    });

    if (response.success) {
      // Store the auth token
      localStorage.setItem("authToken", response.token);

      // Redirect to index instead of pathway directly
      router.push("/");
    } else {
      error.value = response.message || "Authentication failed";
    }
  } catch (err) {
    error.value = "An error occurred during authentication";
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};
</script>
