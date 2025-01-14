import { defineStore } from 'pinia'

export const useCourseStore = defineStore('course', {
  state: () => ({
    title: '',
    description: '',
    learningOutcomes: '',
    targetAudience: '',
    whyTakeIt: ''
  }),
  actions: {
    setTitle(title: string) {
      this.title = title
    },
    setDescription(description: string) {
      this.description = description
    },
    setLearningOutcomes(outcomes: string) {
      this.learningOutcomes = outcomes
    },
    setTargetAudience(audience: string) {
      this.targetAudience = audience
    },
    setWhyTakeIt(reason: string) {
      this.whyTakeIt = reason
    }
  }
})