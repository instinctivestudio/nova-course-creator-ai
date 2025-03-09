<template>
  <div class="min-h-screen bg-gray-50 flex">
    <Sidebar />
    <div class="flex-1">
      <!-- Header -->
      <header class="bg-white border-b">
        <!-- Pathway header -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16 items-center">
            <div class="flex items-center space-x-4">
              <!-- Make pathway title editable inline -->
              <div class="relative group">
                <h1
                  v-if="!isEditingTitle"
                  @click="startEditingTitle"
                  class="text-xl font-semibold cursor-text group-hover:bg-gray-50 px-2 py-1 rounded"
                >
                  {{ store.pathway.name }}
                  <span
                    class="opacity-0 group-hover:opacity-100 ml-2 text-gray-400"
                  >
                    <PencilIcon class="h-4 w-4 inline" />
                  </span>
                </h1>
                <input
                  v-else
                  ref="titleInput"
                  type="text"
                  v-model="editingTitle"
                  @blur="saveTitle"
                  @keydown.enter="saveTitle"
                  @keydown.esc="cancelEditTitle"
                  class="text-xl font-semibold px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <button
                @click="openPathwayModal"
                class="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <PencilIcon class="h-4 w-4 inline mr-1" />
                Edit Details
              </button>
              <button
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Pathway Edit Modal -->
      <div
        v-if="showPathwayModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Edit Pathway Details</h2>
            <button
              @click="closePathwayModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <XIcon class="h-6 w-6" />
            </button>
          </div>

          <div class="space-y-4">
            <!-- Pathway Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Pathway Name</label
              >
              <input
                type="text"
                v-model="editingPathway.name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Pathway Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Description</label
              >
              <textarea
                v-model="editingPathway.description"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <!-- Save / Cancel Buttons -->
            <div class="flex justify-end space-x-3 mt-6">
              <button
                @click="closePathwayModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                @click="savePathwayDetails"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CourseNavigation
          :activeTab="activeTab"
          :resourcesCount="myResourceCount"
          @tabChange="handleTabChange"
        />

        <!-- The transition makes the tab switch fade in and out -->
        <transition name="fade" mode="out-in">
          <!-- keep-alive ensures CourseResources is mounted immediately, 
               so the watcher fires and the Resources count is correct from the start -->
          <keep-alive>
            <component
              :is="
                activeTab === 'Pathway Outline'
                  ? CourseOutline
                  : CourseResources
              "
              @countChanged="handleResourceCountChanged"
            />
          </keep-alive>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
import { useCourseStore } from "~/stores/courseStore";
import CourseNavigation from "~/components/CourseNavigation.vue";
import CourseOutline from "~/components/CourseOutline.vue";
import CourseResources from "~/components/CourseResources.vue";
import Sidebar from "~/components/Sidebar.vue";
import { PencilIcon, XIcon, LogOut } from "lucide-vue-next";
import { cloneDeep } from "lodash";
import { useRouter } from "vue-router";

// Apply auth middleware to this page only
definePageMeta({
  middleware: ["auth"],
});

const router = useRouter();
const store = useCourseStore();

// For inline title editing
const isEditingTitle = ref(false);
const editingTitle = ref("");
const titleInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  console.log("Pathway page mounted, store data:", {
    pathwayName: store.pathway.name,
    pathwayDescription: store.pathway.description,
    title: store.title,
    description: store.description,
    stepsCount: store.pathway.steps.length,
  });
});

function startEditingTitle() {
  editingTitle.value = store.pathway.name;
  isEditingTitle.value = true;
  nextTick(() => {
    titleInput.value?.focus();
  });
}

function saveTitle() {
  if (editingTitle.value.trim()) {
    store.pathway.name = editingTitle.value.trim();
  }
  isEditingTitle.value = false;
}

function cancelEditTitle() {
  isEditingTitle.value = false;
}

// For modal pathway editing
const showPathwayModal = ref(false);
const editingPathway = ref({
  name: "",
  description: "",
});

function openPathwayModal() {
  editingPathway.value = {
    name: store.pathway.name,
    description: store.pathway.description,
  };
  showPathwayModal.value = true;
}

function closePathwayModal() {
  showPathwayModal.value = false;
}

function savePathwayDetails() {
  if (editingPathway.value.name.trim()) {
    store.pathway.name = editingPathway.value.name.trim();
    store.pathway.description = editingPathway.value.description.trim();
  }
  closePathwayModal();
}

/**
 * Manage which tab is currently active
 */
const activeTab = ref("Pathway Outline");

/**
 * This ref will be updated whenever CourseResources.vue
 * emits a "countChanged" event
 */
const myResourceCount = ref(0);

/**
 * Tab click handler from CourseNavigation
 */
function handleTabChange(tabName: string) {
  activeTab.value = tabName;
}

/**
 * This captures the emitted count from CourseResources.vue
 * ("groupedSources.length" or similar)
 */
function handleResourceCountChanged(newCount: number) {
  myResourceCount.value = newCount;
}

// Logout function
const logout = () => {
  localStorage.removeItem("authToken");
  // Redirect to index instead of directly to login to maintain proper flow
  router.push("/");
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
