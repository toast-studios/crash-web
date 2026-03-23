/**
 * Creates a promise that resolves after the specified delay in milliseconds
 * @param ms Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
