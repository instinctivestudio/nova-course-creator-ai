export const generatePathway = async (params) => {
  try {
    const { data, error } = await useFetch("/api/pathway", {
      params,
    });

    if (error.value) {
      throw new Error(error.value.message);
    }

    return data.value;
  } catch (err) {
    console.error("Error generating pathway:", err);
    throw err;
  }
};
