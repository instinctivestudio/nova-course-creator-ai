<script setup lang="ts">
import { useCourseStore } from "~/stores/courseStore";
import { ref, onMounted, onUnmounted } from "vue";
import { generatePathway } from "~/services/pathway";
import type { Pathway } from "~/types/pathway";
import { useRouter } from "vue-router";

const emit = defineEmits(["next"]);
const store = useCourseStore();
const errors = ref<Record<string, string>>({});
const isLoading = ref(false);
const router = useRouter();
const generatingDots = ref(".");
let dotsInterval: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  dotsInterval = setInterval(() => {
    generatingDots.value =
      generatingDots.value.length < 3 ? generatingDots.value + "." : ".";
  }, 400);
});

onUnmounted(() => {
  if (dotsInterval) {
    clearInterval(dotsInterval);
  }
});

const validateForm = () => {
  const newErrors: Record<string, string> = {};

  if (!store.title.trim()) {
    newErrors.title = "Pathway name is required";
  }
  if (!store.description.trim()) {
    newErrors.description = "Pathway overview is required";
  }
  if (!store.learningOutcomes.trim()) {
    newErrors.learningOutcomes = "Learning outcomes are required";
  }
  if (!store.targetAudience.trim()) {
    newErrors.targetAudience = "Target audience is required";
  }
  if (!store.whyTakeIt.trim()) {
    newErrors.whyTakeIt = "This field is required";
  }

  errors.value = newErrors;
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async () => {
  if (validateForm()) {
    isLoading.value = true;
    try {
      console.log("Calling generatePathway with params:", {
        pathway_name: store.title,
        pathway_overview: store.description,
        pathway_learning_outcomes: store.learningOutcomes,
        audience: store.targetAudience,
        rationale: store.whyTakeIt,
      });

      const response = await generatePathway({
        pathway_name: store.title,
        pathway_overview: store.description,
        pathway_learning_outcomes: store.learningOutcomes,
        audience: store.targetAudience,
        rationale: store.whyTakeIt,
      });

      console.log("Response from generatePathway:", response);

      // Check if name property exists (server returns 'name' but client checks for 'pathway_name')
      if (
        response &&
        typeof response === "object" &&
        ("name" in response || "pathway_name" in response) &&
        "steps" in response
      ) {
        store.setPathway(response as Pathway);
        router.push("/course");
      } else {
        console.error(
          "Invalid response format from generatePathway:",
          response
        );
      }
    } catch (error) {
      console.error("Error generating pathway:", error);
    } finally {
      isLoading.value = false;
    }
  }
};
</script>

<template>
  <div class="p-6 bg-white rounded-lg shadow-sm max-w-2xl w-full">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">Pathway Details</h2>
      <span class="text-sm text-gray-500">Step 2 of 2</span>
    </div>
    <p class="text-gray-600 mb-6 w-10/12">
      Review and refine the generated details, then generate your pathway.
    </p>

    <div class="space-y-6">
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
          Pathway Name <span class="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          v-model="store.title"
          placeholder="Example: Building Effective Leadership Skills"
          :class="[
            'w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500',
            errors.title ? 'border-red-500' : 'border-gray-300',
          ]"
        />
        <p v-if="errors.title" class="mt-1 text-sm text-red-500">
          {{ errors.title }}
        </p>
      </div>

      <div>
        <label
          for="description"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          Pathway Overview <span class="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          v-model="store.description"
          placeholder="Example: Learn the skills required to ..."
          rows="4"
          :class="[
            'w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500',
            errors.description ? 'border-red-500' : 'border-gray-300',
          ]"
        ></textarea>
        <p v-if="errors.description" class="mt-1 text-sm text-red-500">
          {{ errors.description }}
        </p>
      </div>

      <div>
        <label
          for="learningOutcomes"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          Learning outcomes <span class="text-red-500">*</span>
        </label>
        <textarea
          id="learningOutcomes"
          v-model="store.learningOutcomes"
          placeholder="What will learners be able to do after completing this pathway?"
          rows="4"
          :class="[
            'w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500',
            errors.learningOutcomes ? 'border-red-500' : 'border-gray-300',
          ]"
        ></textarea>
        <p v-if="errors.learningOutcomes" class="mt-1 text-sm text-red-500">
          {{ errors.learningOutcomes }}
        </p>
      </div>

      <div>
        <label
          for="targetAudience"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          Who would benefit from this pathway?
          <span class="text-red-500">*</span>
        </label>
        <textarea
          id="targetAudience"
          v-model="store.targetAudience"
          placeholder="Describe your target audience and their experience level..."
          rows="4"
          :class="[
            'w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500',
            errors.targetAudience ? 'border-red-500' : 'border-gray-300',
          ]"
        ></textarea>
        <p v-if="errors.targetAudience" class="mt-1 text-sm text-red-500">
          {{ errors.targetAudience }}
        </p>
      </div>

      <div>
        <label
          for="whyTakeIt"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          Why take this pathway? <span class="text-red-500">*</span>
        </label>
        <textarea
          id="whyTakeIt"
          v-model="store.whyTakeIt"
          placeholder="What makes this pathway unique and valuable?"
          rows="4"
          :class="[
            'w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500',
            errors.whyTakeIt ? 'border-red-500' : 'border-gray-300',
          ]"
        ></textarea>
        <p v-if="errors.whyTakeIt" class="mt-1 text-sm text-red-500">
          {{ errors.whyTakeIt }}
        </p>
      </div>

      <button
        @click="handleSubmit"
        :disabled="isLoading"
        class="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
      >
        <div v-if="isLoading">Generating{{ generatingDots }}</div>
        <div v-else>Generate</div>
      </button>
    </div>
  </div>
</template>
