/**
 * HubSpot API Service
 *
 * This service provides methods for interacting with the HubSpot API.
 * It covers common CRM operations like contact, company, deal, and ticket management.
 */

import { storage } from "../../utils/storage";

// API endpoints
const BASE_URL = "https://api.hubspot.com/crm/v3";

/**
 * Interface for HubSpot API configuration
 */
export interface HubSpotConfig {
  apiKey: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Loads HubSpot configuration from storage
 */
export const loadHubSpotConfig = async (): Promise<HubSpotConfig> => {
  try {
    const config = await storage.get(["hubspotConfig"]);
    return config.hubspotConfig || { apiKey: "" };
  } catch (error) {
    console.error("Failed to load HubSpot config:", error);
    return { apiKey: "" };
  }
};

/**
 * Saves HubSpot configuration to storage
 */
export const saveHubSpotConfig = async (
  config: HubSpotConfig
): Promise<void> => {
  try {
    await storage.set({ hubspotConfig: config });
  } catch (error) {
    console.error("Failed to save HubSpot config:", error);
    throw error;
  }
};

/**
 * Creates the authorization headers for API requests
 */
const createHeaders = async (
  additionalHeaders: Record<string, string> = {}
): Promise<Headers> => {
  const config = await loadHubSpotConfig();
  const headers = new Headers({
    "Content-Type": "application/json",
    ...additionalHeaders,
  });

  if (config.accessToken) {
    headers.append("Authorization", `Bearer ${config.accessToken}`);
  } else if (config.apiKey) {
    headers.append("Authorization", `Bearer ${config.apiKey}`);
  } else {
    throw new Error("No HubSpot API key or access token found");
  }

  return headers;
};

/**
 * Makes an API request to HubSpot
 */
const makeRequest = async (
  endpoint: string,
  method: string = "GET",
  data?: any,
  additionalHeaders: Record<string, string> = {}
): Promise<any> => {
  try {
    const headers = await createHeaders(additionalHeaders);
    const url = `${BASE_URL}${endpoint}`;

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error (${response.status}): ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error in HubSpot API request to ${endpoint}:`, error);
    throw error;
  }
};

/**
 * CONTACT API CALLS
 */

/**
 * Get all contacts with pagination
 */
export const getAllContacts = async (
  limit: number = 100,
  after?: string
): Promise<any> => {
  let endpoint = `/objects/contacts?limit=${limit}`;
  if (after) {
    endpoint += `&after=${after}`;
  }

  return makeRequest(endpoint);
};

/**
 * Get a contact by ID
 */
export const getContactById = async (contactId: string): Promise<any> => {
  return makeRequest(`/objects/contacts/${contactId}`);
};

/**
 * Search for contacts
 */
export const searchContacts = async (query: any): Promise<any> => {
  return makeRequest("/objects/contacts/search", "POST", { query });
};

/**
 * Create a new contact
 */
export const createContact = async (
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest("/objects/contacts", "POST", { properties });
};

/**
 * Update a contact
 */
export const updateContact = async (
  contactId: string,
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest(`/objects/contacts/${contactId}`, "PATCH", { properties });
};

/**
 * Delete a contact
 */
export const deleteContact = async (contactId: string): Promise<void> => {
  await makeRequest(`/objects/contacts/${contactId}`, "DELETE");
};

/**
 * COMPANY API CALLS
 */

/**
 * Get all companies with pagination
 */
export const getAllCompanies = async (
  limit: number = 100,
  after?: string
): Promise<any> => {
  let endpoint = `/objects/companies?limit=${limit}`;
  if (after) {
    endpoint += `&after=${after}`;
  }

  return makeRequest(endpoint);
};

/**
 * Get a company by ID
 */
export const getCompanyById = async (companyId: string): Promise<any> => {
  return makeRequest(`/objects/companies/${companyId}`);
};

/**
 * Search for companies
 */
export const searchCompanies = async (query: any): Promise<any> => {
  return makeRequest("/objects/companies/search", "POST", { query });
};

/**
 * Create a new company
 */
export const createCompany = async (
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest("/objects/companies", "POST", { properties });
};

/**
 * Update a company
 */
export const updateCompany = async (
  companyId: string,
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest(`/objects/companies/${companyId}`, "PATCH", {
    properties,
  });
};

/**
 * Delete a company
 */
export const deleteCompany = async (companyId: string): Promise<void> => {
  await makeRequest(`/objects/companies/${companyId}`, "DELETE");
};

/**
 * DEAL API CALLS
 */

/**
 * Get all deals with pagination
 */
export const getAllDeals = async (
  limit: number = 100,
  after?: string
): Promise<any> => {
  let endpoint = `/objects/deals?limit=${limit}`;
  if (after) {
    endpoint += `&after=${after}`;
  }

  return makeRequest(endpoint);
};

/**
 * Get a deal by ID
 */
export const getDealById = async (dealId: string): Promise<any> => {
  return makeRequest(`/objects/deals/${dealId}`);
};

/**
 * Search for deals
 */
export const searchDeals = async (query: any): Promise<any> => {
  return makeRequest("/objects/deals/search", "POST", { query });
};

/**
 * Create a new deal
 */
export const createDeal = async (
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest("/objects/deals", "POST", { properties });
};

/**
 * Update a deal
 */
export const updateDeal = async (
  dealId: string,
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest(`/objects/deals/${dealId}`, "PATCH", { properties });
};

/**
 * Delete a deal
 */
export const deleteDeal = async (dealId: string): Promise<void> => {
  await makeRequest(`/objects/deals/${dealId}`, "DELETE");
};

/**
 * TICKET API CALLS
 */

/**
 * Get all tickets with pagination
 */
export const getAllTickets = async (
  limit: number = 100,
  after?: string
): Promise<any> => {
  let endpoint = `/objects/tickets?limit=${limit}`;
  if (after) {
    endpoint += `&after=${after}`;
  }

  return makeRequest(endpoint);
};

/**
 * Get a ticket by ID
 */
export const getTicketById = async (ticketId: string): Promise<any> => {
  return makeRequest(`/objects/tickets/${ticketId}`);
};

/**
 * Search for tickets
 */
export const searchTickets = async (query: any): Promise<any> => {
  return makeRequest("/objects/tickets/search", "POST", { query });
};

/**
 * Create a new ticket
 */
export const createTicket = async (
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest("/objects/tickets", "POST", { properties });
};

/**
 * Update a ticket
 */
export const updateTicket = async (
  ticketId: string,
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest(`/objects/tickets/${ticketId}`, "PATCH", { properties });
};

/**
 * FILE API CALLS
 */

/**
 * Upload a file to HubSpot
 */
export const uploadFile = async (
  file: File,
  folderPath: string = "/"
): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folderPath", folderPath);

  const headers = await createHeaders();
  // Remove content-type header as it will be set automatically for FormData
  headers.delete("Content-Type");

  const response = await fetch(`https://api.hubapi.com/files/v3/files`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HubSpot API error (${response.status}): ${errorText}`);
  }

  return response.json();
};

/**
 * OAUTH AUTHENTICATION
 */

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<any> => {
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("redirect_uri", redirectUri);
  params.append("code", code);

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HubSpot OAuth error (${response.status}): ${errorText}`);
  }

  const tokenData = await response.json();

  // Update storage with the new tokens
  const config = await loadHubSpotConfig();
  const updatedConfig: HubSpotConfig = {
    ...config,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  await saveHubSpotConfig(updatedConfig);

  return tokenData;
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (
  clientId: string,
  clientSecret: string
): Promise<any> => {
  const config = await loadHubSpotConfig();

  if (!config.refreshToken) {
    throw new Error("No refresh token available");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", config.refreshToken);

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HubSpot token refresh error (${response.status}): ${errorText}`
    );
  }

  const tokenData = await response.json();

  // Update storage with the new tokens
  const updatedConfig: HubSpotConfig = {
    ...config,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  await saveHubSpotConfig(updatedConfig);

  return tokenData;
};

/**
 * Check if token is expired and refresh if needed
 */
export const ensureValidToken = async (
  clientId: string,
  clientSecret: string
): Promise<string> => {
  const config = await loadHubSpotConfig();

  // If we don't have an access token or expiry time, can't proceed
  if (!config.accessToken || !config.expiresAt) {
    throw new Error("No access token available");
  }

  // If token is expired or about to expire (within 5 minutes), refresh it
  if (Date.now() + 300000 > config.expiresAt) {
    const tokenData = await refreshAccessToken(clientId, clientSecret);
    return tokenData.access_token;
  }

  return config.accessToken;
};
