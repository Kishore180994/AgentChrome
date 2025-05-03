/**
 * HubSpot Service Index
 *
 * This file exports all HubSpot functionality from one place.
 */

// Export API functions for direct use
export * from "./api";

// Export the executor for handling Gemini AI function calls
export { executeHubspotFunction } from "./executor";
