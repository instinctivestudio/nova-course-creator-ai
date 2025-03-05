<template>
  <div class="space-y-6">
    <!-- Success / feedback bar -->
    <div class="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
      <div class="flex items-center space-x-2 text-blue-700">
        <Sparkles class="h-5 w-5" />
        <span>Your pathway was created successfully. How did we do?</span>
      </div>
      <div class="flex space-x-2">
        <button
          :class="{
            'text-blue-700': feedback !== 'up',
            'text-blue-800': feedback === 'up',
          }"
          @click="handleFeedback('up')"
        >
          <ThumbsUp
            :class="{ 'fill-current': feedback === 'up' }"
            class="h-5 w-5"
          />
        </button>
        <button
          :class="{
            'text-blue-700': feedback !== 'down',
            'text-blue-800': feedback === 'down',
          }"
          @click="handleFeedback('down')"
        >
          <ThumbsDown
            :class="{ 'fill-current': feedback === 'down' }"
            class="h-5 w-5"
          />
        </button>
      </div>
    </div>

    <!-- Search bar -->
    <div class="relative">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5"
      />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Find step or activity..."
        class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- Module count & expand all -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">
          {{ localSteps.length }} Steps
        </span>
      </div>
      <button
        @click="toggleAllSteps"
        class="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-2"
      >
        <Layers class="h-4 w-4" />
        <span>{{ isAllExpanded ? "Collapse All" : "Expand All" }}</span>
      </button>
    </div>

    <!-- Module list -->
    <div class="space-y-3">
      <div
        v-for="step in filteredSteps"
        :key="step.id"
        class="bg-white rounded-lg border border-gray-200"
      >
        <!-- Step header -->
        <div
          class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
          @click="toggleStep(step)"
        >
          <div class="flex items-center space-x-3">
            <FolderClosed class="h-5 w-5 text-gray-400" />
            <span class="text-gray-700 font-medium">{{ step.stepName }}</span>
          </div>
          <div class="flex items-center space-x-3">
            <component
              :is="step.isExpanded ? ChevronUp : ChevronDown"
              class="h-5 w-5 text-gray-400"
            />
          </div>
        </div>

        <!-- Step content -->
        <div v-if="step.isExpanded" class="border-t border-gray-200">
          <div
            v-for="activity in step.activities"
            :key="activity.id"
            class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
          >
            <!-- Activity description -->
            <div class="pl-8">
              <div class="flex items-center space-x-3">
                <!-- Icons for each type -->
                <div v-if="activity.activityType === 'Read'">
                  <BookOpenText class="h-5 w-5 text-gray-400" />
                </div>
                <div v-else-if="activity.activityType === 'Watch'">
                  <Video class="h-5 w-5 text-gray-400" />
                </div>
                <div v-else-if="activity.activityType === 'Reflect'">
                  <Lightbulb class="h-5 w-5 text-gray-400" />
                </div>
                <div v-else-if="activity.activityType === 'Practice'">
                  <HandHelping class="h-5 w-5 text-gray-400" />
                </div>
                <div v-else-if="activity.activityType === 'Discuss'">
                  <MessageCircle class="h-5 w-5 text-gray-400" />
                </div>
                <span class="text-gray-700">
                  {{ activity.activityType + ": " + activity.title }}
                </span>
              </div>
              <p class="pt-1 w-8/12 text-gray-500 text-sm">
                {{ activity.description }}
              </p>
            </div>

            <!-- Watch activity button -->
            <div
              v-if="activity.activityType === 'Watch' && activity.videoUrl"
              class="pr-4"
            >
              <a
                :href="activity.videoUrl"
                class="underline text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <PlayCircle class="h-7 w-7 text-gray-400 hover:text-blue-600" />
              </a>
            </div>
          </div>

          <!-- If no activities were generated -->
          <div
            v-if="step.activities.length === 0"
            class="px-4 py-3 text-center text-sm text-gray-500"
          >
            No content was generated here.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  Search,
  FolderClosed,
  ChevronDown,
  ChevronUp,
  BookOpenText,
  Lightbulb,
  MessageCircle,
  Video,
  HandHelping,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Layers,
  PlayCircle,
} from "lucide-vue-next";
import { useCourseStore } from "~/stores/courseStore";

interface Activity {
  id: string;
  activityType: string;
  title: string;
  description: string;
  videoUrl?: string;
}

interface Step {
  id: string;
  stepName: string;
  activities: Activity[];
  isExpanded?: boolean;
}

const store = useCourseStore();

const localSteps = ref<Step[]>([]);
onMounted(() => {
  // Initialize a local copy of steps
  localSteps.value = store.pathway.steps.map((step, stepIndex) => ({
    id: step.id || `step-${stepIndex}`,
    stepName: step.stepName,
    activities: step.activities.map((activity, activityIndex) => ({
      id: activity.id || `activity-${stepIndex}-${activityIndex}`,
      activityType: activity.activityType,
      title: activity.title,
      description: activity.description,
      videoUrl: activity.videoUrl || "",
    })),
    // Each step starts expanded
    isExpanded: true,
  }));
});

// Track feedback and search
const searchQuery = ref("");
const feedback = ref<"up" | "down" | null>(null);

// Track global expand/collapse
const isAllExpanded = ref(true);
const toggleAllSteps = () => {
  isAllExpanded.value = !isAllExpanded.value;
  localSteps.value.forEach((step) => {
    step.isExpanded = isAllExpanded.value;
  });
};

// Toggle a single step
const toggleStep = (step: Step) => {
  step.isExpanded = !step.isExpanded;
};

// Filter steps by search query
const filteredSteps = computed(() => {
  if (!searchQuery.value) {
    return localSteps.value;
  }
  const query = searchQuery.value.toLowerCase();
  return localSteps.value.filter((step) => {
    const stepNameMatches = step.stepName.toLowerCase().includes(query);
    const activityMatches = step.activities.some((activity) =>
      activity.title.toLowerCase().includes(query)
    );
    return stepNameMatches || activityMatches;
  });
});

// Track feedback button clicks
const handleFeedback = (type: "up" | "down") => {
  feedback.value = feedback.value === type ? null : type;
};
</script>
