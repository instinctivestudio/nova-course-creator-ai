<script setup lang="ts">
import { ref, computed, onMounted, reactive, nextTick } from "vue";
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
  FileText,
  ClipboardCheck,
  PencilIcon,
  X,
  Trash2,
  PlusCircle,
  Loader,
} from "lucide-vue-next";
import { usePathwayStore } from "~/stores/pathwayStore";
import { cloneDeep } from "lodash";
import { regenerateContent } from "~/services/pathway";
import type { RegenerationResponse } from "~/types/api";
import { useToast } from "vue-toast-notification";
import { v4 as uuidv4 } from "uuid";

interface QuizQuestion {
  question: string;
  type: "subjective" | "objective";
  options?: string[];
  correctOptions?: string[];
  points?: number;
  _id?: string;
}

interface Activity {
  id?: string;
  name: string;
  description: string;
  readData?: string;
  pdfUrls?: string[];
  videoUrls?: string[];
  youtubeVideos?: { title: string; url: string; description: string }[];
  quiz?: QuizQuestion[];
}

interface Step {
  id?: string;
  name: string;
  description: string;
  activities: Activity[];
  isExpanded?: boolean;
}

interface ExtendedActivity extends Activity {
  isRegenerating?: boolean;
}

interface ExtendedStep extends Step {
  isEditingName?: boolean;
  editingName?: string;
  isRegenerating?: boolean;
  activities: ExtendedActivity[];
}

const store = usePathwayStore();

const localSteps = ref<ExtendedStep[]>([]);
onMounted(() => {
  // Initialize a local copy of steps with editing and regenerating properties
  localSteps.value = store.pathway.steps.map((step, stepIndex) => ({
    id: `step-${stepIndex}`,
    name: step.name,
    description: step.description,
    activities: step.activities.map((activity, activityIndex) => ({
      id: `activity-${stepIndex}-${activityIndex}`,
      name: activity.name,
      description: activity.description,
      readData: activity.readData,
      pdfUrls: activity.pdfUrls,
      videoUrls: activity.videoUrls,
      quiz: activity.quiz ? cloneDeep(activity.quiz) : [],
      isRegenerating: false,
    })),
    isExpanded: true,
    isEditingName: false,
    isRegenerating: false,
  }));
});

// Search functionality
const searchQuery = ref("");
const filteredSteps = computed(() => {
  if (!searchQuery.value.trim()) return localSteps.value;

  const query = searchQuery.value.toLowerCase();
  return localSteps.value.filter((step) => {
    // Match step name or description
    if (
      step.name.toLowerCase().includes(query) ||
      step.description.toLowerCase().includes(query)
    ) {
      return true;
    }

    // Match activity name or description
    return step.activities.some(
      (activity) =>
        activity.name.toLowerCase().includes(query) ||
        activity.description.toLowerCase().includes(query)
    );
  });
});

// Step expansion
const isAllExpanded = ref(true);
function toggleAllSteps() {
  isAllExpanded.value = !isAllExpanded.value;
  localSteps.value.forEach((step) => {
    step.isExpanded = isAllExpanded.value;
  });
}

function toggleStep(step: ExtendedStep) {
  step.isExpanded = !step.isExpanded;
}

// Step title inline editing
function startEditingStepName(step: ExtendedStep) {
  step.editingName = step.name;
  step.isEditingName = true;
  nextTick(() => {
    // Fix focus issue by using type assertion
    const inputElement = document.querySelector(
      "input:focus"
    ) as HTMLInputElement | null;
    if (inputElement) {
      inputElement.focus();
    }
  });
}

function saveStepName(step: ExtendedStep) {
  if (step.editingName && step.editingName.trim()) {
    step.name = step.editingName.trim();

    // Update the store
    const stepIndex = localSteps.value.findIndex((s) => s.id === step.id);
    if (stepIndex !== -1) {
      store.pathway.steps[stepIndex].name = step.name;
    }
  }
  step.isEditingName = false;
}

function cancelEditStepName(step: ExtendedStep) {
  step.isEditingName = false;
}

// Activity modal editing
const showActivityModal = ref(false);
const showStepModal = ref(false);
const editingActivity = ref<Activity | null>(null);
const editingStep = ref<ExtendedStep | null>(null);
const currentStepIndex = ref(-1);
const currentActivityIndex = ref(-1);

function editActivity(step: Step, activity: Activity) {
  const stepIndex = localSteps.value.findIndex((s) => s.id === step.id);
  const activityIndex = step.activities.findIndex((a) => a.id === activity.id);

  currentStepIndex.value = stepIndex;
  currentActivityIndex.value = activityIndex;

  // Create a deep copy to edit
  editingActivity.value = cloneDeep(activity);
  showActivityModal.value = true;
}

function closeActivityModal() {
  showActivityModal.value = false;
  editingActivity.value = null;
}

function saveActivity() {
  if (!editingActivity.value) return;

  // Update the local copy
  if (currentStepIndex.value >= 0 && currentActivityIndex.value >= 0) {
    const activity = editingActivity.value;

    // Make sure arrays are initialized
    if (!activity.pdfUrls) activity.pdfUrls = [];
    if (!activity.videoUrls) activity.videoUrls = [];

    // Clean up empty values
    activity.pdfUrls = activity.pdfUrls.filter((url) => url.trim() !== "");
    activity.videoUrls = activity.videoUrls.filter((url) => url.trim() !== "");

    // Update local steps
    localSteps.value[currentStepIndex.value].activities[
      currentActivityIndex.value
    ] = cloneDeep(activity);

    // Update the store
    store.pathway.steps[currentStepIndex.value].activities[
      currentActivityIndex.value
    ] = cloneDeep(activity);
  }

  closeActivityModal();
}

// Helper functions
function getPdfFileName(url: string): string {
  try {
    const parts = url.split("/");
    return parts[parts.length - 1];
  } catch (e) {
    return url;
  }
}

function getVideoTitle(url: string, index: number): string {
  // First, look for the activity containing this URL across all steps
  for (const step of store.pathway.steps) {
    for (const activity of step.activities as Activity[]) {
      if (
        activity.videoUrls?.includes(url) &&
        (activity as any).youtubeVideos
      ) {
        // Find the matching YouTube video metadata
        const videoMetadata = (activity as any).youtubeVideos.find(
          (v: any) => v.url === url
        );
        if (videoMetadata && videoMetadata.title) {
          return videoMetadata.title;
        }
      }
    }
  }

  // Fall back to extracting YouTube video ID if possible
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = extractYouTubeId(url);
    return `YouTube Video ${index + 1}${videoId ? ` (${videoId})` : ""}`;
  }
  return `Video ${index + 1}`;
}

function extractYouTubeId(url: string): string | null {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

// Feedback mechanism
const feedback = ref<"up" | "down" | null>(null);
function handleFeedback(type: "up" | "down") {
  feedback.value = type;
  // Here you would typically send this feedback to the server
  console.log(`User gave ${type} feedback`);
  // Could also add a toast notification confirming feedback was received
}

// Initialize other required reactive variables for modals and functionality
const showRegenerateActivityModal = ref(false);
const regeneratePrompt = ref("");
const isRegenerating = ref(false);

// Stub methods for functionality not fully implemented
function confirmStepDeletion(step: ExtendedStep) {
  console.log("Step deletion functionality would be implemented here");
}

function regenerateStep(step: ExtendedStep) {
  console.log("Step regeneration functionality would be implemented here");
}

function editStepDetails(step: ExtendedStep) {
  console.log("Step details editing functionality would be implemented here");
}

function confirmDeleteActivity(step: ExtendedStep, activity: ExtendedActivity) {
  console.log("Activity deletion functionality would be implemented here");
}

function regenerateActivity(step: ExtendedStep, activity: ExtendedActivity) {
  console.log("Activity regeneration functionality would be implemented here");
}

function confirmDeleteQuizQuestionInView(
  step: ExtendedStep,
  activity: ExtendedActivity,
  qIndex: number
) {
  console.log("Quiz question deletion functionality would be implemented here");
}

function closeRegenerateActivityModal() {
  showRegenerateActivityModal.value = false;
  regeneratePrompt.value = "";
}

function submitActivityRegeneration() {
  console.log("Activity regeneration submission would be implemented here");
  closeRegenerateActivityModal();
}
</script>

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
        :key="step.id || step.name"
        class="bg-white rounded-lg border border-gray-200"
      >
        <!-- Step header -->
        <div
          class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        >
          <div class="flex items-center space-x-3" @click="toggleStep(step)">
            <FolderClosed class="h-5 w-5 text-gray-400" />
            <!-- Editable step name -->
            <div class="relative group">
              <span
                v-if="!step.isEditingName"
                @click.stop="startEditingStepName(step)"
                class="text-gray-700 font-medium cursor-text group-hover:bg-gray-100 px-2 py-1 rounded-md"
              >
                {{ step.name }}
                <span
                  class="opacity-0 group-hover:opacity-100 ml-2 text-gray-400"
                >
                  <PencilIcon class="h-4 w-4 inline" />
                </span>
              </span>
              <input
                v-else
                type="text"
                v-model="step.editingName"
                @blur="saveStepName(step)"
                @keydown.enter="saveStepName(step)"
                @keydown.esc="cancelEditStepName(step)"
                @click.stop
                class="text-gray-700 font-medium px-2 py-1 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <!-- Add edit button for step description -->
          <div class="flex items-center space-x-3">
            <!-- Delete button -->
            <button
              @click.stop="confirmStepDeletion(step)"
              class="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded"
            >
              <Trash2 class="h-4 w-4" />
            </button>
            <!-- Regenerate button -->
            <button
              @click.stop="regenerateStep(step)"
              class="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded"
              :disabled="step.isRegenerating"
              :class="{ 'opacity-50 cursor-not-allowed': step.isRegenerating }"
            >
              <Sparkles class="h-4 w-4" />
            </button>
            <button
              @click.stop="editStepDetails(step)"
              class="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            <component
              :is="step.isExpanded ? ChevronUp : ChevronDown"
              class="h-5 w-5 text-gray-400"
              @click="toggleStep(step)"
            />
          </div>
        </div>

        <!-- Step content -->
        <div
          v-if="step.isExpanded"
          class="border-t border-gray-200"
          :class="{ 'opacity-50': step.isRegenerating }"
        >
          <div
            v-for="activity in step.activities"
            :key="activity.id || activity.name"
            class="px-4 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 relative"
            :class="{ 'opacity-50': activity.isRegenerating }"
          >
            <!-- Edit, Regenerate and Delete buttons for activity -->
            <div class="absolute top-3 right-3 flex space-x-1">
              <!-- Delete button -->
              <button
                @click="confirmDeleteActivity(step, activity)"
                class="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded"
                :disabled="activity.isRegenerating"
              >
                <Trash2 class="h-4 w-4" />
              </button>
              <button
                @click="regenerateActivity(step, activity)"
                class="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded"
                :disabled="activity.isRegenerating"
                :class="{
                  'opacity-50 cursor-not-allowed': activity.isRegenerating,
                }"
              >
                <Sparkles class="h-4 w-4" />
              </button>
              <button
                @click="editActivity(step, activity)"
                class="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded"
                :disabled="activity.isRegenerating"
              >
                <PencilIcon class="h-4 w-4" />
              </button>
            </div>

            <!-- Activity header -->
            <div class="flex items-center space-x-3 mb-2">
              <!-- Activity icon based on content type -->
              <div v-if="activity.readData">
                <BookOpenText class="h-5 w-5 text-gray-400" />
              </div>
              <div v-else-if="activity.videoUrls && activity.videoUrls.length">
                <Video class="h-5 w-5 text-gray-400" />
              </div>
              <div v-else-if="activity.pdfUrls && activity.pdfUrls.length">
                <FileText class="h-5 w-5 text-gray-400" />
              </div>
              <div v-else-if="activity.quiz && activity.quiz.length">
                <ClipboardCheck class="h-5 w-5 text-gray-400" />
              </div>
              <div v-else>
                <Lightbulb class="h-5 w-5 text-gray-400" />
              </div>
              <span class="text-gray-700 font-medium">{{ activity.name }}</span>
            </div>

            <!-- Activity description -->
            <p class="text-gray-500 text-sm pl-8 mb-3">
              {{ activity.description }}
            </p>

            <!-- Reading content if available -->
            <div
              v-if="activity.readData"
              class="pl-8 mb-3 bg-gray-50 p-3 rounded text-sm"
            >
              {{ activity.readData }}
            </div>

            <!-- PDF links if available -->
            <div
              v-if="activity.pdfUrls && activity.pdfUrls.length"
              class="pl-8 mb-3"
            >
              <div class="text-sm font-medium mb-1">PDF Resources:</div>
              <div
                v-for="(pdfUrl, index) in activity.pdfUrls"
                :key="index"
                class="flex items-center space-x-2"
              >
                <FileText class="h-4 w-4 text-gray-400" />
                <a
                  :href="pdfUrl"
                  target="_blank"
                  class="text-blue-600 hover:underline text-sm"
                >
                  {{ getPdfFileName(pdfUrl) }}
                </a>
              </div>
            </div>

            <!-- Video links if available -->
            <div
              v-if="activity.videoUrls && activity.videoUrls.length"
              class="pl-8 mb-3"
            >
              <div class="text-sm font-medium mb-1">Video Resources:</div>
              <div
                v-for="(videoUrl, index) in activity.videoUrls"
                :key="index"
                class="flex items-center space-x-2"
              >
                <Video class="h-4 w-4 text-gray-400" />
                <a
                  :href="videoUrl"
                  target="_blank"
                  class="text-blue-600 hover:underline text-sm"
                >
                  {{ getVideoTitle(videoUrl, index) }}
                </a>
              </div>
            </div>

            <!-- Quiz questions if available -->
            <div v-if="activity.quiz && activity.quiz.length" class="pl-8">
              <div class="text-sm font-medium mb-2">Quiz Questions:</div>
              <div
                v-for="(question, qIndex) in activity.quiz"
                :key="qIndex"
                class="mb-4 bg-gray-50 p-3 rounded relative"
              >
                <!-- Add delete button to the top right of each question -->
                <button
                  @click="
                    confirmDeleteQuizQuestionInView(step, activity, qIndex)
                  "
                  class="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1"
                  title="Delete question"
                >
                  <Trash2 class="h-4 w-4" />
                </button>

                <div class="font-medium text-sm mb-2 pr-8">
                  {{ question.question }}
                </div>

                <!-- Subjective (open-ended) question -->
                <div
                  v-if="question.type === 'subjective'"
                  class="text-sm text-gray-500"
                >
                  Open-ended question - Write your response.
                </div>

                <!-- Objective (multiple choice) question -->
                <div v-if="question.type === 'objective' && question.options">
                  <div
                    v-for="(option, oIndex) in question.options"
                    :key="oIndex"
                    class="flex items-center space-x-2 my-1"
                  >
                    <input
                      type="checkbox"
                      :name="`question-${qIndex}`"
                      :id="`option-${qIndex}-${oIndex}`"
                      class="text-blue-500 focus:ring-blue-500"
                    />
                    <label
                      :for="`option-${qIndex}-${oIndex}`"
                      class="text-sm"
                      >{{ option }}</label
                    >
                  </div>
                </div>

                <div v-if="question.points" class="text-xs text-right mt-2">
                  Points: {{ question.points }}
                </div>
              </div>
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

    <!-- Add modals and other UI components from CourseOutline -->
    <!-- Activity Edit Modal -->
    <div
      v-if="showActivityModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <!-- Activity modal content -->
    </div>

    <!-- Step Edit Modal -->
    <div
      v-if="showStepModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <!-- Step modal content -->
    </div>

    <!-- Regenerate Activity Modal -->
    <div
      v-if="showRegenerateActivityModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <!-- Regenerate activity modal content -->
    </div>

    <!-- Delete Confirmation Modals -->
    <div><!-- Delete confirmation modals content --></div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Add any additional styles from CourseOutline */
</style>
