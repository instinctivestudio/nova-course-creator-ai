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

    <!-- Activity Edit Modal -->
    <div
      v-if="showActivityModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Edit Activity</h2>
          <button
            @click="closeActivityModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <div class="space-y-4" v-if="editingActivity">
          <!-- Activity Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Activity Name</label
            >
            <input
              type="text"
              v-model="editingActivity.name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Activity Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Description</label
            >
            <textarea
              v-model="editingActivity.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Reading Content -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Reading Content</label
            >
            <textarea
              v-model="editingActivity.readData"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- PDF URLs -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >PDF URLs</label
            >
            <div
              v-for="(url, index) in editingActivity.pdfUrls || []"
              :key="`pdf-${index}`"
              class="flex mb-2"
            >
              <input
                type="text"
                v-model="editingActivity.pdfUrls![index]"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                @click="removeItem(editingActivity.pdfUrls!, index)"
                class="px-3 py-2 bg-red-50 text-red-500 border border-l-0 border-gray-300 rounded-r-md hover:bg-red-100"
              >
                <Trash2 class="h-5 w-5" />
              </button>
            </div>
            <button
              @click="addPdfUrl"
              class="mt-1 text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <PlusCircle class="h-4 w-4 mr-1" /> Add PDF URL
            </button>
          </div>

          <!-- Video URLs -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Video URLs</label
            >
            <div
              v-for="(url, index) in editingActivity.videoUrls || []"
              :key="`video-${index}`"
              class="flex mb-2"
            >
              <input
                type="text"
                v-model="editingActivity.videoUrls![index]"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                @click="removeItem(editingActivity.videoUrls!, index)"
                class="px-3 py-2 bg-red-50 text-red-500 border border-l-0 border-gray-300 rounded-r-md hover:bg-red-100"
              >
                <Trash2 class="h-5 w-5" />
              </button>
            </div>
            <button
              @click="addVideoUrl"
              class="mt-1 text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <PlusCircle class="h-4 w-4 mr-1" /> Add Video URL
            </button>
          </div>

          <!-- Quiz Questions -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-sm font-medium text-gray-700"
                >Quiz Questions</label
              >
              <button
                @click="addQuizQuestion"
                class="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <PlusCircle class="h-4 w-4 mr-1" /> Add Question
              </button>
            </div>

            <div
              v-for="(question, qIndex) in editingActivity.quiz || []"
              :key="`quiz-${qIndex}`"
              class="mb-4 p-3 border border-gray-200 rounded-md"
            >
              <div class="flex justify-between items-start mb-2">
                <h3 class="text-sm font-medium">Question {{ qIndex + 1 }}</h3>
                <button
                  @click="confirmQuizQuestionDeletion(qIndex)"
                  class="text-red-500 hover:text-red-700"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>

              <!-- Question Text -->
              <div class="mb-2">
                <label class="block text-xs text-gray-500 mb-1"
                  >Question Text</label
                >
                <input
                  type="text"
                  v-model="question.question"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Question Type -->
              <div class="mb-2">
                <label class="block text-xs text-gray-500 mb-1"
                  >Question Type</label
                >
                <select
                  v-model="question.type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="subjective">Open-ended</option>
                  <option value="objective">Multiple Choice</option>
                </select>
              </div>

              <!-- Points -->
              <div class="mb-2">
                <label class="block text-xs text-gray-500 mb-1">Points</label>
                <input
                  type="number"
                  v-model="question.points"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <!-- Options (for multiple choice) -->
              <div v-if="question.type === 'objective'" class="mb-2">
                <label class="block text-xs text-gray-500 mb-1"
                  >Answer Options</label
                >
                <div
                  v-for="(option, oIndex) in question.options || []"
                  :key="`option-${qIndex}-${oIndex}`"
                  class="flex mb-2"
                >
                  <div class="mr-2 pt-2">
                    <input
                      type="checkbox"
                      :id="`correct-${qIndex}-${oIndex}`"
                      :checked="isCorrectOption(question, option)"
                      @change="toggleCorrectOption(question, option)"
                      class="text-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="text"
                    v-model="question.options![oIndex]"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :placeholder="`Option ${oIndex + 1}`"
                  />
                  <button
                    @click="confirmOptionDeletion(question, oIndex)"
                    class="px-3 py-2 bg-red-50 text-red-500 border border-l-0 border-gray-300 rounded-r-md hover:bg-red-100"
                  >
                    <Trash2 class="h-5 w-5" />
                  </button>
                </div>
                <button
                  @click="addOption(question)"
                  class="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <PlusCircle class="h-4 w-4 mr-1" /> Add Option
                </button>
                <p class="text-xs text-gray-500 mt-1">
                  Check the options that are correct answers.
                </p>
              </div>
            </div>
          </div>

          <!-- Save / Cancel Buttons -->
          <div class="flex justify-end space-x-3 mt-6">
            <button
              @click="closeActivityModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="saveActivity"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step Edit Modal -->
    <div
      v-if="showStepModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-xl w-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Edit Step</h2>
          <button
            @click="closeStepModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <div class="space-y-4" v-if="editingStep">
          <!-- Step Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Step Name</label
            >
            <input
              type="text"
              v-model="editingStep.name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Step Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Description</label
            >
            <textarea
              v-model="editingStep.description"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Save / Cancel Buttons -->
          <div class="flex justify-end space-x-3 mt-6">
            <button
              @click="closeStepModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="saveStepDetails"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Regenerate Step Modal -->
    <div
      v-if="showRegenerateStepModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-xl w-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Regenerate Step</h2>
          <button
            @click="closeRegenerateStepModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-gray-600">
            What would you like to change about this step? Your prompt will
            guide the AI in creating a new version.
          </p>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Regeneration Prompt</label
            >
            <textarea
              v-model="regeneratePrompt"
              rows="4"
              placeholder="Example: Make this step more focused on practical exercises and include more interactive activities."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end space-x-3 mt-6">
            <button
              @click="closeRegenerateStepModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="submitStepRegeneration"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              :disabled="isRegenerating"
            >
              <Loader v-if="isRegenerating" class="animate-spin h-4 w-4 mr-2" />
              <span>{{
                isRegenerating ? "Regenerating..." : "Regenerate"
              }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Regenerate Activity Modal -->
    <div
      v-if="showRegenerateActivityModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-xl w-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Regenerate Activity</h2>
          <button
            @click="closeRegenerateActivityModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-gray-600">
            What would you like to change about this activity? Your prompt will
            guide the AI in creating a new version.
          </p>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Regeneration Prompt</label
            >
            <textarea
              v-model="regeneratePrompt"
              rows="4"
              placeholder="Example: Include more videos and make the quiz questions more challenging."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end space-x-3 mt-6">
            <button
              @click="closeRegenerateActivityModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="submitActivityRegeneration"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              :disabled="isRegenerating"
            >
              <Loader v-if="isRegenerating" class="animate-spin h-4 w-4 mr-2" />
              <span>{{
                isRegenerating ? "Regenerating..." : "Regenerate"
              }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modals -->
    <div><!-- Replaced delete confirmation modals --></div>
  </div>
</template>

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
import { useCourseStore } from "~/stores/courseStore";
import { cloneDeep } from "lodash";
import { regenerateContent } from "~/services/pathway";
import type { RegenerationResponse } from "~/types/api";

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

const store = useCourseStore();

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

// Helper functions for modal editing
function addPdfUrl() {
  if (!editingActivity.value) return;
  if (!editingActivity.value.pdfUrls) {
    editingActivity.value.pdfUrls = [];
  }
  editingActivity.value.pdfUrls.push("");
}

function addVideoUrl() {
  if (!editingActivity.value) return;
  if (!editingActivity.value.videoUrls) {
    editingActivity.value.videoUrls = [];
  }
  editingActivity.value.videoUrls.push("");
}

function removeItem(array: string[], index: number) {
  array.splice(index, 1);
}

// Quiz question functions
function addQuizQuestion() {
  if (!editingActivity.value) return;
  if (!editingActivity.value.quiz) {
    editingActivity.value.quiz = [];
  }
  editingActivity.value.quiz.push({
    question: "New question",
    type: "subjective",
    options: [],
    correctOptions: [],
    points: 1,
  });
}

function addOption(question: QuizQuestion) {
  if (!question.options) {
    question.options = [];
  }
  question.options.push("");
}

function removeQuizQuestion(index: number) {
  confirmQuizQuestionDeletion(index);
}

function confirmQuizQuestionDeletion(index: number) {
  if (!editingActivity.value || !editingActivity.value.quiz) return;

  const question = editingActivity.value.quiz[index].question;
  if (
    confirm(
      `Are you sure you want to delete question "${question}"?\n\nThis action cannot be undone.`
    )
  ) {
    editingActivity.value.quiz.splice(index, 1);
  }
}

function removeOption(question: QuizQuestion, index: number) {
  confirmOptionDeletion(question, index);
}

function confirmOptionDeletion(question: QuizQuestion, index: number) {
  if (!question.options) return;

  const option = question.options[index];
  if (
    confirm(
      `Are you sure you want to delete option "${option}"?\n\nThis action cannot be undone.`
    )
  ) {
    // Also remove from correctOptions if it's there
    if (question.correctOptions && question.correctOptions.includes(option)) {
      const correctIndex = question.correctOptions.indexOf(option);
      if (correctIndex !== -1) {
        question.correctOptions.splice(correctIndex, 1);
      }
    }

    question.options.splice(index, 1);
  }
}

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
    const stepNameMatches = step.name.toLowerCase().includes(query);
    const activityMatches = step.activities.some((activity) =>
      activity.name.toLowerCase().includes(query)
    );
    return stepNameMatches || activityMatches;
  });
});

// Helper functions for display
const getPdfFileName = (url: string) => {
  const parts = url.split("/");
  return parts[parts.length - 1] || "PDF Document";
};

const getVideoTitle = (url: string, index: number) => {
  // Extract video title from YouTube URL if possible
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  return ytMatch ? `YouTube Video ${index + 1}` : `Video ${index + 1}`;
};

// Track feedback button clicks
const handleFeedback = (type: "up" | "down") => {
  feedback.value = feedback.value === type ? null : type;
};

// Step details editing modal
function editStepDetails(step: ExtendedStep) {
  const stepIndex = localSteps.value.findIndex((s) => s.id === step.id);
  currentStepIndex.value = stepIndex;

  // Create a deep copy to edit
  editingStep.value = cloneDeep(step);
  showStepModal.value = true;
}

function closeStepModal() {
  showStepModal.value = false;
  editingStep.value = null;
}

function saveStepDetails() {
  if (!editingStep.value) return;

  if (currentStepIndex.value >= 0) {
    const step = editingStep.value;

    // Update local steps
    localSteps.value[currentStepIndex.value].name = step.name;
    localSteps.value[currentStepIndex.value].description = step.description;

    // Update the store
    store.pathway.steps[currentStepIndex.value].name = step.name;
    store.pathway.steps[currentStepIndex.value].description = step.description;
  }

  closeStepModal();
}

// Regeneration functionality
const showRegenerateStepModal = ref(false);
const showRegenerateActivityModal = ref(false);
const regeneratePrompt = ref("");
const isRegenerating = ref(false);
const stepToRegenerate = ref<ExtendedStep | null>(null);
const activityToRegenerate = ref<ExtendedActivity | null>(null);

function regenerateStep(step: ExtendedStep) {
  stepToRegenerate.value = step;
  regeneratePrompt.value = "";
  showRegenerateStepModal.value = true;
}

function closeRegenerateStepModal() {
  showRegenerateStepModal.value = false;
  stepToRegenerate.value = null;
}

function regenerateActivity(step: ExtendedStep, activity: ExtendedActivity) {
  stepToRegenerate.value = step;
  activityToRegenerate.value = activity;
  regeneratePrompt.value = "";
  showRegenerateActivityModal.value = true;
}

function closeRegenerateActivityModal() {
  showRegenerateActivityModal.value = false;
  stepToRegenerate.value = null;
  activityToRegenerate.value = null;
}

async function submitStepRegeneration() {
  if (!stepToRegenerate.value || !regeneratePrompt.value.trim()) return;

  const step = stepToRegenerate.value;
  const stepIndex = localSteps.value.findIndex((s) => s.id === step.id);

  if (stepIndex === -1) return;

  // Set regenerating state
  isRegenerating.value = true;
  step.isRegenerating = true;

  try {
    const response = (await regenerateContent({
      pathway: store.pathway,
      itemType: "step",
      itemIndex: stepIndex,
      regenerationPrompt: regeneratePrompt.value,
    })) as RegenerationResponse;

    if (response && response.success && response.regeneratedItem) {
      const regeneratedStep = response.regeneratedItem;

      // Update activities with ids
      const activities =
        regeneratedStep.activities?.map(
          (activity: ExtendedActivity, activityIndex: number) => ({
            ...activity,
            id: `activity-${stepIndex}-${activityIndex}`,
            isRegenerating: false,
          })
        ) || [];

      // Update local steps
      localSteps.value[stepIndex] = {
        ...step,
        name: regeneratedStep.name,
        description: regeneratedStep.description,
        activities,
        isRegenerating: false,
        isExpanded: true,
      };

      // Update store
      store.pathway.steps[stepIndex] = {
        name: regeneratedStep.name,
        description: regeneratedStep.description,
        activities: activities.map((a: ExtendedActivity) => ({
          name: a.name,
          description: a.description,
          readData: a.readData,
          pdfUrls: a.pdfUrls,
          videoUrls: a.videoUrls,
          quiz: a.quiz,
        })),
      };
    }
  } catch (error) {
    console.error("Error regenerating step:", error);
  } finally {
    isRegenerating.value = false;
    step.isRegenerating = false;
    closeRegenerateStepModal();
  }
}

async function submitActivityRegeneration() {
  if (
    !stepToRegenerate.value ||
    !activityToRegenerate.value ||
    !regeneratePrompt.value.trim()
  )
    return;

  const currentStep = stepToRegenerate.value;
  const currentActivity = activityToRegenerate.value;

  const currentStepIndex = localSteps.value.findIndex(
    (s) => s.id === currentStep.id
  );
  const currentActivityIndex = currentStep.activities.findIndex(
    (a) => a.id === currentActivity.id
  );

  if (currentStepIndex === -1 || currentActivityIndex === -1) return;

  // Set regenerating state
  isRegenerating.value = true;
  currentActivity.isRegenerating = true;

  try {
    const response = (await regenerateContent({
      pathway: store.pathway,
      itemType: "activity",
      itemIndex: currentStepIndex,
      activityIndex: currentActivityIndex,
      regenerationPrompt: regeneratePrompt.value,
    })) as RegenerationResponse;

    if (response && response.success && response.regeneratedItem) {
      const regeneratedActivity = response.regeneratedItem;

      // Update local activity
      const updatedActivity = {
        ...currentActivity,
        name: regeneratedActivity.name,
        description: regeneratedActivity.description,
        readData: regeneratedActivity.readData,
        pdfUrls: regeneratedActivity.pdfUrls || [],
        videoUrls: regeneratedActivity.videoUrls || [],
        quiz: regeneratedActivity.quiz || [],
        isRegenerating: false,
      };

      localSteps.value[currentStepIndex].activities[currentActivityIndex] =
        updatedActivity;

      // Update store
      store.pathway.steps[currentStepIndex].activities[currentActivityIndex] = {
        name: regeneratedActivity.name,
        description: regeneratedActivity.description,
        readData: regeneratedActivity.readData,
        pdfUrls: regeneratedActivity.pdfUrls || [],
        videoUrls: regeneratedActivity.videoUrls || [],
        quiz: regeneratedActivity.quiz || [],
      };
    }
  } catch (error) {
    console.error("Error regenerating activity:", error);
  } finally {
    isRegenerating.value = false;
    currentActivity.isRegenerating = false;
    closeRegenerateActivityModal();
  }
}

// Add delete functionality
const stepToDelete = ref<ExtendedStep | null>(null);
const activityToDelete = ref<ExtendedActivity | null>(null);

// Step deletion
function confirmStepDeletion(step: ExtendedStep) {
  if (
    confirm(
      `Are you sure you want to delete step "${step.name}"?\n\nThis action cannot be undone.`
    )
  ) {
    const stepIndex = localSteps.value.findIndex((s) => s.id === step.id);
    if (stepIndex !== -1) {
      // Remove from local steps
      localSteps.value.splice(stepIndex, 1);

      // Remove from store
      store.pathway.steps.splice(stepIndex, 1);
    }
  }
}

// Activity deletion
function confirmDeleteActivity(step: ExtendedStep, activity: ExtendedActivity) {
  if (
    confirm(
      `Are you sure you want to delete activity "${activity.name}"?\n\nThis action cannot be undone.`
    )
  ) {
    const stepIndex = localSteps.value.findIndex((s) => s.id === step.id);
    if (stepIndex !== -1) {
      const activityIndex = localSteps.value[stepIndex].activities.findIndex(
        (a) => a.id === activity.id
      );

      if (activityIndex !== -1) {
        // Remove from local activities
        localSteps.value[stepIndex].activities.splice(activityIndex, 1);

        // Remove from store
        store.pathway.steps[stepIndex].activities.splice(activityIndex, 1);
      }
    }
  }
}

function isCorrectOption(question: QuizQuestion, option: string): boolean {
  return question.correctOptions
    ? question.correctOptions.includes(option)
    : false;
}

function toggleCorrectOption(question: QuizQuestion, option: string) {
  if (!question.correctOptions) {
    question.correctOptions = [];
  }

  const index = question.correctOptions.indexOf(option);
  if (index === -1) {
    question.correctOptions.push(option);
  } else {
    question.correctOptions.splice(index, 1);
  }
}

// New function to handle quiz question deletion in the main view
function confirmDeleteQuizQuestionInView(
  step: ExtendedStep,
  activity: ExtendedActivity,
  qIndex: number
) {
  if (!activity.quiz || !activity.quiz[qIndex]) return;

  const question = activity.quiz[qIndex].question;
  if (
    confirm(
      `Are you sure you want to delete question "${question}"?\n\nThis action cannot be undone.`
    )
  ) {
    // Remove from local activities
    activity.quiz.splice(qIndex, 1);

    // Find the step and activity indexes in the store
    const stepIndex = localSteps.value.findIndex((s) => s.id === step.id);
    if (stepIndex === -1) return;

    const activityIndex = step.activities.findIndex(
      (a) => a.id === activity.id
    );
    if (activityIndex === -1) return;

    // Make sure the quiz exists
    if (store.pathway.steps[stepIndex].activities[activityIndex].quiz) {
      // Remove from store
      store.pathway.steps[stepIndex].activities[activityIndex].quiz!.splice(
        qIndex,
        1
      );
    }
  }
}
</script>
