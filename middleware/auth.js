export default defineNuxtRouteMiddleware((to) => {
  // If running on server or prerendering, allow the route
  if (process.server) return;

  // Skip middleware if on login page or index page
  if (to.path === "/login" || to.path === "/") {
    return;
  }

  try {
    // Check for token in localStorage - this only works client-side
    const token = localStorage.getItem("authToken");

    if (!token) {
      // Redirect to login if no token found
      return navigateTo("/login");
    }
  } catch (e) {
    // Handle any errors
    console.error("Auth middleware error:", e);
    return navigateTo("/login");
  }
});
