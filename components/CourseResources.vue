<script setup lang="ts">
import { computed, defineEmits, watch } from "vue";
import { useCourseStore } from "~/stores/courseStore";
import { BookOpenText, Video } from "lucide-vue-next";

// Emit the resource count to the parent
const emits = defineEmits<{
  (e: "countChanged", count: number): void;
}>();

// ---------------- TYPES ----------------
interface SourceItem {
  document: string;
  page: number;
}
interface VideoItem {
  title: string;
  url: string;
  description: string;
}

// ---------------- STORE ----------------
const store = useCourseStore();

// ---------------- UTILITIES ----------------
function transformFilenameToTitle(filename: string): string {
  // Remove extension
  let name = filename.replace(/\.pdf$/i, ""); // end-of-string .pdf
  // Replace underscores with spaces
  name = name.replace(/_/g, " ");
  // Example logic for known doc name...
  if (name.toLowerCase().includes("timothy keller center church")) {
    return "Center Church by Timothy Keller";
  }
  return name.trim();
}

/**
 * Group references by docTitle.
 * If you have multiple pages from the SAME document,
 * they’ll be combined under a single docTitle.
 */
function groupSources(sourcesArr: SourceItem[]) {
  const map = new Map<string, number[]>();
  for (const src of sourcesArr) {
    const docTitle = transformFilenameToTitle(src.document);
    if (!map.has(docTitle)) {
      map.set(docTitle, []);
    }
    map.get(docTitle)?.push(src.page);
  }

  // Build final array of distinct documents
  const grouped: Array<{ docTitle: string; pages: number[] }> = [];
  for (const [docTitle, pages] of map.entries()) {
    grouped.push({ docTitle, pages });
  }
  return grouped;
}

// ---------------- COMPUTED PROPERTIES ----------------
const groupedSources = computed(() => {
  const rawSources = store.pathway.metadata?.sources || [];
  return groupSources(rawSources);
});

const usedWatchVideos = computed<VideoItem[]>(() => {
  const videos: VideoItem[] = [];
  for (const step of store.pathway.steps) {
    for (const activity of step.activities) {
      if (activity.activityType === "Watch" && activity.videoUrl) {
        videos.push({
          title: activity.title,
          url: activity.videoUrl,
          description: activity.description,
        });
      }
    }
  }
  return videos;
});

watch(
  [groupedSources, usedWatchVideos],
  ([newGrouped, newVideos]) => {
    const count = newGrouped.length + newVideos.length;
    emits("countChanged", count);
  },
  { immediate: true }
);
</script>

<template>
  <div class="p-4 space-y-6">
    <!-- Header -->
    <div class="flex items-center space-x-2 mb-4">
      <h2 class="text-2xl font-bold">Resources</h2>
    </div>

    <!-- Cards side-by-side with "flat" design (no shadow, simple gray border) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Book References Card -->
      <section class="bg-white border border-gray-200 p-4">
        <div class="flex items-center space-x-2 mb-3">
          <BookOpenText class="w-6 h-6 text-gray-600" />
          <h3 class="text-lg font-semibold">Book References</h3>
        </div>

        <ul class="space-y-2">
          <li
            v-for="(group, idx) in groupedSources"
            :key="idx"
            class="border-b border-gray-200 pb-2 last:border-b-0"
          >
            <strong>{{ group.docTitle }}</strong>
            <div class="text-gray-500 text-sm">
              Pages: {{ group.pages.join(", ") }}
            </div>
          </li>
        </ul>
      </section>

      <!-- Videos Card -->
      <section class="bg-white border border-gray-200 p-4">
        <div class="flex items-center space-x-2 mb-3">
          <Video class="w-6 h-6 text-gray-600" />
          <h3 class="text-lg font-semibold">Videos</h3>
        </div>
        <ul class="space-y-4">
          <li
            v-for="(video, index) in usedWatchVideos"
            :key="index"
            class="border-b border-gray-200 pb-4 last:border-b-0"
          >
            <a
              :href="video.url"
              target="_blank"
              class="text-blue-600 underline font-medium"
            >
              {{ video.title }}
            </a>
            <p class="text-gray-700 mt-1 text-sm leading-snug">
              {{ video.description }}
            </p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
