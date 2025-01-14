<script setup lang="ts">
import { ref } from 'vue'
import { 
  Search,
  FolderClosed,
  ChevronDown,
  ChevronUp,
  File,
  Plus,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Layers,
  MoreHorizontal
} from 'lucide-vue-next'

interface Module {
  id: string
  title: string
  type: 'folder' | 'lesson'
  lessons?: Module[]
  isExpanded?: boolean
}

const modules = ref<Module[]>([
  {
    id: '1',
    title: 'Understanding the Basics of Training',
    type: 'folder',
    isExpanded: false,
    lessons: [
      { id: '1.1', title: 'Effective Communication', type: 'lesson' },
      { id: '1.2', title: 'The Role of a Trainer', type: 'lesson' },
      { id: '1.3', title: 'Learning Styles', type: 'lesson' }
    ]
  },
  {
    id: '2',
    title: 'Designing a Training Program',
    type: 'folder',
    isExpanded: false,
    lessons: []
  },
  {
    id: '3',
    title: 'Delivering the Training',
    type: 'folder',
    isExpanded: false,
    lessons: []
  }
])

const searchQuery = ref('')
const isAllExpanded = ref(false)

const toggleModule = (module: Module) => {
  module.isExpanded = !module.isExpanded
}

const toggleAllModules = () => {
  isAllExpanded.value = !isAllExpanded.value
  modules.value.forEach(module => {
    module.isExpanded = isAllExpanded.value
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Success message -->
    <div class="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
      <div class="flex items-center space-x-2 text-blue-700">
        <Sparkles class="h-5 w-5" />
        <span>Your course outline was created successfully! How did we do?</span>
      </div>
      <div class="flex space-x-2">
        <button class="text-blue-700 hover:text-blue-800">
          <ThumbsUp class="h-5 w-5" />
        </button>
        <button class="text-blue-700 hover:text-blue-800">
          <ThumbsDown class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Search bar -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Find module or lesson..."
        class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- Module count and expand all -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">{{ modules.length }} Modules</span>
      </div>
      <button 
        @click="toggleAllModules"
        class="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-2"
      >
        <Layers class="h-4 w-4" />
        <span>{{ isAllExpanded ? 'Collapse All' : 'Expand All' }}</span>
      </button>
    </div>

    <!-- Module list -->
    <div class="space-y-3">
      <div 
        v-for="module in modules" 
        :key="module.id"
        class="bg-white rounded-lg border border-gray-200"
      >
        <!-- Module header -->
        <div 
          class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
          @click="toggleModule(module)"
        >
          <div class="flex items-center space-x-3">
            <FolderClosed class="h-5 w-5 text-gray-400" />
            <span class="text-gray-700 font-medium">{{ module.title }}</span>
          </div>
          <div class="flex items-center space-x-3">
            <button 
              class="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1.5"
              @click.stop
            >
              <Plus class="h-4 w-4" />
              <span>Add Content</span>
            </button>
            <div class="h-4 w-px bg-gray-200"></div>
            <span class="text-sm text-gray-500">Draft</span>
            <div class="h-4 w-px bg-gray-200"></div>
            <button class="text-gray-400 hover:text-gray-600">
              <MoreHorizontal class="h-5 w-5" />
            </button>
            <component 
              :is="module.isExpanded ? ChevronUp : ChevronDown" 
              class="h-5 w-5 text-gray-400"
            />
          </div>
        </div>

        <!-- Module content -->
        <div v-if="module.isExpanded" class="border-t border-gray-200">
          <div 
            v-for="lesson in module.lessons" 
            :key="lesson.id"
            class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
          >
            <div class="flex items-center space-x-3 pl-8">
              <File class="h-5 w-5 text-gray-400" />
              <span class="text-gray-700">{{ lesson.title }}</span>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-500">Draft</span>
              <div class="h-4 w-px bg-gray-200"></div>
              <button class="text-gray-400 hover:text-gray-600">
                <MoreHorizontal class="h-5 w-5" />
              </button>
            </div>
          </div>
          <div 
            v-if="module.lessons?.length === 0" 
            class="px-4 py-3 text-center text-sm text-gray-500"
          >
            No content yet. Click "Add Content" to get started.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>