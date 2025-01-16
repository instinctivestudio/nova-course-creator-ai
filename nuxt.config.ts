// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"], // Remove '@nuxtjs/axios'
  runtimeConfig: {
    public: {
      apiBaseURL: "http://localhost:3000/api", // Adjust for production
    },
  },
});
