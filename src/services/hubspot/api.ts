/**
 * HubSpot API Service
 *
 * This service provides methods for interacting with the HubSpot API.
 * It covers common CRM operations like contact, company, deal, and ticket management,
 * as well as engagements, lists, properties, batch operations, and more.
 */

import { storage } from "../../utils/storage"; // Assuming your storage utility
import { HubspotApiError } from "../../classes/ActionError"; // Assuming your custom error class

// API endpoints
const BASE_URL_V3 = "https://api.hubspot.com/crm/v3";
const BASE_URL_V1 = "https://api.hubapi.com"; // For some older APIs like lists, forms

/**
 * Interface for HubSpot API configuration
 */
export interface HubSpotConfig {
  apiKey: string; // Kept for potential legacy use / Private App Token storage
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  portalId?: string; // Added portalId if needed
}

/**
 * Interface for Engagement Associations (Helper Type)
 */
export interface EngagementAssociations {
  contactIds?: string[];
  companyIds?: string[];
  dealIds?: string[];
  ticketIds?: string[];
  ownerIds?: string[]; // Sometimes relevant
  // Add other object types if needed (e.g., quoteIds)
  ccContactIds?: string[]; // For email logging
  bccContactIds?: string[]; // For email logging
}

/**
 * Loads HubSpot configuration from storage
 */
export const loadHubSpotConfig = async (): Promise<HubSpotConfig> => {
  try {
    const config = await storage.get(["hubspotConfig"]);
    // Provide default values if config or apiKey is missing
    return config.hubspotConfig || { apiKey: "" };
  } catch (error) {
    console.error("Failed to load HubSpot config:", error);
    return { apiKey: "" }; // Return default empty config on error
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
    throw error; // Re-throw to indicate save failure
  }
};

/**
 * Gets Portal ID (Helper - Adjust based on where you store/get it)
 */
export const getPortalId = async (): Promise<string | undefined> => {
  const config = await loadHubSpotConfig();
  // Try to get from config, or fetch from API if needed/possible (e.g. /account-info/v3/details)
  // This is a placeholder implementation
  if (config.portalId) {
    return config.portalId;
  }
  // Maybe fetch from 'https://api.hubapi.com/integrations/v1/me' ? Requires specific scope.
  console.warn("Portal ID not found in config. Form submissions might fail.");
  return undefined;
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

  // Prioritize Access Token (OAuth 2.0 / Private Apps recommend Bearer token)
  const token = config.accessToken || config.apiKey; // Use apiKey as fallback if it holds the Private App token

  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }

  return headers;
};

/**
 * Makes an API request to HubSpot (Handles V3 and V1 Base URLs)
 */
const makeRequest = async (
  endpoint: string, // Full endpoint starting with /
  method: string = "GET",
  data?: any,
  additionalHeaders: Record<string, string> = {},
  apiVersion: "v1" | "v3" = "v3" // Default to v3
): Promise<any> => {
  try {
    const config = await loadHubSpotConfig();
    const headers = await createHeaders(additionalHeaders);
    const baseUrl = apiVersion === "v1" ? BASE_URL_V1 : BASE_URL_V3;
    const url = `${baseUrl}${endpoint}`;

    // Check if we have any authentication method
    const token = config.accessToken || config.apiKey;
    if (!token) {
      // Throw specific authentication error
      throw new HubspotApiError(
        "No HubSpot access token or API key found in configuration.",
        401, // Unauthorized
        "AUTHENTICATION_ERROR"
      );
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    // Handle No Content response (e.g., DELETE)
    if (response.status === 204) {
      return { success: true, status: 204 }; // Indicate success for No Content
    }

    // Read response body - needs to be done before checking response.ok for potential error details
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `HubSpot API Error (${response.status})`;
      let category: string | undefined = undefined;
      let details: any = undefined;

      // Try to parse the error response as JSON
      try {
        const errorJson = JSON.parse(responseText);
        details = errorJson; // Store full details
        // Extract message based on common HubSpot error structures
        if (errorJson.message) {
          errorMessage += `: ${errorJson.message}`;
        } else if (errorJson.error && errorJson.error.message) {
          // OAuth error structure
          errorMessage += `: ${errorJson.error.message}`;
        } else if (errorJson.error && typeof errorJson.error === "string") {
          // OAuth error structure
          errorMessage += `: ${errorJson.error}`;
        }
        // Extract category
        if (errorJson.category) {
          category = errorJson.category;
          errorMessage += ` (Category: ${errorJson.category})`;
        }
        // Add correlationId if present
        if (errorJson.correlationId) {
          errorMessage += ` (Trace ID: ${errorJson.correlationId})`;
        }
        // Add validation results if present
        if (errorJson.errors && Array.isArray(errorJson.errors)) {
          errorMessage += ` Details: ${errorJson.errors
            .map((e: any) => e.message || JSON.stringify(e))
            .join(", ")}`;
        }
      } catch {
        // If parsing failed, use the raw text if it's not empty
        if (responseText.trim()) {
          errorMessage += `: ${responseText.trim()}`;
        }
      }

      // Throw a structured HubspotApiError for all error cases
      throw new HubspotApiError(
        errorMessage,
        response.status,
        category,
        details // Pass full parsed details if available
      );
    }

    // If response is OK and has content, parse as JSON
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      // Handle cases where response is OK but not valid JSON (should be rare for HubSpot)
      console.warn(
        `HubSpot response for ${method} ${endpoint} was OK but not valid JSON:`,
        responseText
      );
      return {
        success: true,
        status: response.status,
        rawResponse: responseText,
      };
    }
  } catch (error) {
    // Catch network errors, config errors, or re-throw HubspotApiErrors
    console.error(`Error during HubSpot API request to ${endpoint}:`, error);
    // If it's already our structured error, re-throw it
    if (error instanceof HubspotApiError) {
      throw error;
    }
    // Otherwise, wrap it in a generic HubspotApiError
    throw new HubspotApiError(
      error instanceof Error ? error.message : String(error),
      500, // Assume internal server error if not specified
      "REQUEST_FAILED",
      error // Pass original error as details
    );
  }
};

// ========================================================================== //
//                      GENERIC OBJECT & SEARCH API                          //
// ========================================================================== //

/**
 * Generic Search for CRM Objects (Contacts, Companies, Deals, Tickets, etc.)
 */
export const searchObjects = async (
  objectType: string,
  searchPayload: any
): Promise<any> => {
  // searchPayload should conform to HubSpot's search API structure:
  // { query?, filterGroups?, sorts?, properties?, limit?, after? }
  return makeRequest(`/objects/${objectType}/search`, "POST", searchPayload);
};

/**
 * Generic Get Object by ID
 */
export const getObjectById = async (
  objectType: string,
  objectId: string,
  properties?: string[]
): Promise<any> => {
  let endpoint = `/objects/${objectType}/${objectId}`;
  if (properties && properties.length > 0) {
    endpoint += `?properties=${properties.join(",")}`;
  }
  return makeRequest(endpoint);
};

/**
 * Generic Create Object
 */
export const createObject = async (
  objectType: string,
  properties: Record<string, any>,
  associations?: any[]
): Promise<any> => {
  const payload: { properties: Record<string, any>; associations?: any[] } = {
    properties,
  };
  if (associations) {
    payload.associations = associations;
  }
  return makeRequest(`/objects/${objectType}`, "POST", payload);
};

/**
 * Generic Update Object
 */
export const updateObject = async (
  objectType: string,
  objectId: string,
  properties: Record<string, any>
): Promise<any> => {
  return makeRequest(`/objects/${objectType}/${objectId}`, "PATCH", {
    properties,
  });
};

/**
 * Generic Delete Object
 */
export const deleteObject = async (
  objectType: string,
  objectId: string
): Promise<void> => {
  await makeRequest(`/objects/${objectType}/${objectId}`, "DELETE");
};

// ========================================================================== //
//                            CONTACT API CALLS                              //
// ========================================================================== //

/** Get all contacts - Deprecated in V3, use search */
// export const getAllContacts ... (use searchObjects instead)

/** Get a contact by ID */
export const getContactById = async (
  contactId: string,
  properties?: string[]
): Promise<any> => {
  return getObjectById("contacts", contactId, properties);
};

/** Search for contacts (basic search wrapper - assumes executor builds basic payload) */
export const searchContacts = async (searchPayload: any): Promise<any> => {
  return searchObjects("contacts", searchPayload);
};

/** Create a new contact */
export const createContact = async (
  properties: Record<string, any>
): Promise<any> => {
  return createObject("contacts", properties);
};

/** Update a contact */
export const updateContact = async (
  contactId: string,
  properties: Record<string, any>
): Promise<any> => {
  return updateObject("contacts", contactId, properties);
};

/** Delete a contact */
export const deleteContact = async (contactId: string): Promise<void> => {
  await deleteObject("contacts", contactId);
};

// ========================================================================== //
//                            COMPANY API CALLS                              //
// ========================================================================== //

/** Get all companies - Deprecated in V3, use search */
// export const getAllCompanies ... (use searchObjects instead)

/** Get a company by ID */
export const getCompanyById = async (
  companyId: string,
  properties?: string[]
): Promise<any> => {
  return getObjectById("companies", companyId, properties);
};

/** Search for companies (basic search wrapper) */
export const searchCompanies = async (searchPayload: any): Promise<any> => {
  return searchObjects("companies", searchPayload);
};

/** Create a new company */
export const createCompany = async (
  properties: Record<string, any>
): Promise<any> => {
  return createObject("companies", properties);
};

/** Update a company */
export const updateCompany = async (
  companyId: string,
  properties: Record<string, any>
): Promise<any> => {
  return updateObject("companies", companyId, properties);
};

/** Delete a company */
export const deleteCompany = async (companyId: string): Promise<void> => {
  await deleteObject("companies", companyId);
};

// ========================================================================== //
//                              DEAL API CALLS                               //
// ========================================================================== //

/** Get all deals - Deprecated in V3, use search */
// export const getAllDeals ... (use searchObjects instead)

/** Get a deal by ID */
export const getDealById = async (
  dealId: string,
  properties?: string[]
): Promise<any> => {
  return getObjectById("deals", dealId, properties);
};

/** Search for deals (basic search wrapper) */
export const searchDeals = async (searchPayload: any): Promise<any> => {
  return searchObjects("deals", searchPayload);
};

/** Create a new deal */
export const createDeal = async (
  properties: Record<string, any>
): Promise<any> => {
  return createObject("deals", properties);
};

/** Update a deal */
export const updateDeal = async (
  dealId: string,
  properties: Record<string, any>
): Promise<any> => {
  return updateObject("deals", dealId, properties);
};

/** Delete a deal */
export const deleteDeal = async (dealId: string): Promise<void> => {
  await deleteObject("deals", dealId);
};

// ========================================================================== //
//                             TICKET API CALLS                              //
// ========================================================================== //

/** Get all tickets - Deprecated in V3, use search */
// export const getAllTickets ... (use searchObjects instead)

/** Get a ticket by ID */
export const getTicketById = async (
  ticketId: string,
  properties?: string[]
): Promise<any> => {
  return getObjectById("tickets", ticketId, properties);
};

/** Search for tickets (basic search wrapper) */
export const searchTickets = async (searchPayload: any): Promise<any> => {
  return searchObjects("tickets", searchPayload);
};

/** Create a new ticket */
export const createTicket = async (
  properties: Record<string, any>
): Promise<any> => {
  return createObject("tickets", properties);
};

/** Update a ticket */
export const updateTicket = async (
  ticketId: string,
  properties: Record<string, any>
): Promise<any> => {
  return updateObject("tickets", ticketId, properties);
};

/** Delete a ticket */
export const deleteTicket = async (ticketId: string): Promise<void> => {
  // Added
  await deleteObject("tickets", ticketId);
};

// ========================================================================== //
//                         ASSOCIATION API CALLS                             //
// ========================================================================== //

/**
 * Associate two records using the default association type.
 * For labeled associations, use batchAssociateRecords with defined type.
 */
export const associateRecords = async (
  fromObjectType: string,
  fromObjectId: string,
  toObjectType: string,
  toObjectId: string,
  associationType: string // HubSpot default type name or custom ID
): Promise<any> => {
  // V4 API format using PUT with type in URL path
  const endpoint = `/objects/${fromObjectType}/${fromObjectId}/associations/default/${toObjectType}/${toObjectId}`;
  // The V4 PUT doesn't take a body for default associations
  // If using custom labeled associations, the PUT request needs a body:
  // body: [{ associationCategory: "USER_DEFINED" | "HUBSPOT_DEFINED", associationTypeId: number }]
  // For simplicity, this function assumes default or pre-defined types passed in `associationType`
  // A more robust implementation might fetch the type ID first if needed.
  // Using V3 batch endpoint for wider compatibility / default types:
  const v3Payload = [
    {
      from: { id: fromObjectId },
      to: { id: toObjectId },
      type: associationType,
    },
  ];
  return makeRequest(
    `/associations/${fromObjectType}/${toObjectType}/batch/create`,
    "POST",
    { inputs: v3Payload }
  );
};

/**
 * Batch associate one 'from' record to multiple 'to' records.
 */
export const batchAssociateRecords = async (
  fromObjectType: string,
  fromObjectId: string,
  toObjectType: string,
  toObjectIds: string[],
  associationType: string
): Promise<any> => {
  const inputs = toObjectIds.map((toId) => ({
    from: { id: fromObjectId },
    to: { id: toId },
    type: associationType,
  }));
  return makeRequest(
    `/associations/${fromObjectType}/${toObjectType}/batch/create`,
    "POST",
    { inputs }
  );
};

/**
 * Get associations for a record
 */
export const getAssociations = async (
  objectType: string,
  objectId: string,
  associatedObjectType: string,
  after?: string,
  limit: number = 100
): Promise<any> => {
  // V4 API Format
  let endpoint = `/objects/${objectType}/${objectId}/associations/${associatedObjectType}?limit=${limit}`;
  if (after) {
    endpoint += `&after=${after}`;
  }
  return makeRequest(endpoint);
};

// ========================================================================== //
//                         ENGAGEMENT API CALLS                            //
// ========================================================================== //
// Note: Engagements (Notes, Emails, Meetings, Calls, Tasks*) share endpoints

/**
 * Create an Engagement (Note, Meeting, Call)
 * Task creation uses a separate function due to specific association handling in example.
 */
export const createEngagement = async (
  engagementType: "notes" | "meetings" | "calls" | "emails", // Map to internal API types if needed
  properties: Record<string, any>,
  associations?: EngagementAssociations
): Promise<any> => {
  const payload: { properties: Record<string, any>; associations?: any[] } = {
    properties,
  };

  // Build V3 associations array if provided
  if (associations) {
    const v3Associations = [];
    const mapIds = (
      ids: string[] | undefined,
      category: string,
      typeId: number
    ) => {
      return (ids || []).map((id) => ({
        to: { id },
        types: [{ associationCategory: category, associationTypeId: typeId }],
      }));
    };

    // Default HubSpot Association Type IDs (Confirm these in HubSpot Docs/API)
    // These may vary slightly or need fetching via schemas API
    const typeIds = {
      contact: {
        notes: 192,
        meetings: 196,
        calls: 198,
        emails: 194,
        tasks: 190,
      },
      company: {
        notes: 204,
        meetings: 208,
        calls: 210,
        emails: 206,
        tasks: 202,
      },
      deal: { notes: 216, meetings: 220, calls: 222, emails: 218, tasks: 214 },
      ticket: {
        notes: 228,
        meetings: 232,
        calls: 234,
        emails: 230,
        tasks: 226,
      },
      owner: { notes: 17, meetings: 16, calls: 18, emails: 15, tasks: 6 }, // Owner ID to Engagement
    };

    // Simplified engagement type mapping - adjust if API uses numbers
    const eType = engagementType; // 'notes', 'meetings', etc.

    // Map Associations
    if (associations.contactIds)
      v3Associations.push(
        ...mapIds(
          associations.contactIds,
          "HUBSPOT_DEFINED",
          typeIds.contact[eType]
        )
      );
    if (associations.companyIds)
      v3Associations.push(
        ...mapIds(
          associations.companyIds,
          "HUBSPOT_DEFINED",
          typeIds.company[eType]
        )
      );
    if (associations.dealIds)
      v3Associations.push(
        ...mapIds(associations.dealIds, "HUBSPOT_DEFINED", typeIds.deal[eType])
      );
    if (associations.ticketIds)
      v3Associations.push(
        ...mapIds(
          associations.ticketIds,
          "HUBSPOT_DEFINED",
          typeIds.ticket[eType]
        )
      );
    if (associations.ownerIds)
      v3Associations.push(
        ...mapIds(
          associations.ownerIds,
          "HUBSPOT_DEFINED",
          typeIds.owner[eType]
        )
      );

    // CC/BCC for Emails (Specific association types - IDs might differ)
    if (eType === "emails") {
      // Example Type IDs - VERIFY THESE!
      const ccTypeId = 3; // Example
      const bccTypeId = 4; // Example
      if (associations.ccContactIds)
        v3Associations.push(
          ...mapIds(associations.ccContactIds, "HUBSPOT_DEFINED", ccTypeId)
        );
      if (associations.bccContactIds)
        v3Associations.push(
          ...mapIds(associations.bccContactIds, "HUBSPOT_DEFINED", bccTypeId)
        );
    }

    if (v3Associations.length > 0) {
      payload.associations = v3Associations;
    }
  }

  // Use V3 Object API for engagements
  return makeRequest(`/objects/${engagementType}`, "POST", payload);
};

export const enrollObjectInWorkflow = async (
  workflowId: string,
  objectId: string // <<< Accepts only ONE objectId
): Promise<any> => {
  const endpoint = `/automation/v3/workflows/${workflowId}/enrollments`;
  // V3 enrollment endpoint expects object ID in the payload
  const payload = {
    inputs: [
      // <<< BUT the payload structure is an ARRAY OF INPUTS
      {
        objectId: objectId,
      },
    ],
  };
  return makeRequest(endpoint, "POST", payload);
};

/**
 * Update an Engagement (Note, Meeting, Call, Task, Email Metadata)
 */
export const updateEngagement = async (
  engagementType: string, // e.g., 'tasks', 'notes'
  engagementId: string,
  properties: Record<string, any>
): Promise<any> => {
  // Use V3 Object API
  return makeRequest(`/objects/${engagementType}/${engagementId}`, "PATCH", {
    properties,
  });
};

/**
 * Delete an Engagement
 */
export const deleteEngagement = async (
  engagementType: string,
  engagementId: string
): Promise<void> => {
  // Use V3 Object API
  await makeRequest(`/objects/${engagementType}/${engagementId}`, "DELETE");
};

/**
 * Search for Engagements
 */
export const searchEngagements = async (searchPayload: any): Promise<any> => {
  // Use V3 Object Search API for engagements - Requires specific setup
  // The payload needs filters, sorts, properties for engagements
  // Example: Search for tasks associated with a contact
  // POST /crm/v3/objects/tasks/search
  // { filterGroups: [{ filters: [{ propertyName: 'associations.contact', operator: 'EQ', value: 'contactId' }]}] }
  console.warn(
    "searchEngagements requires specific filter construction for engagement properties and associations."
  );
  // This is a basic placeholder call - needs proper payload construction in executor
  return makeRequest(`/objects/engagements/search`, "POST", searchPayload);
};

// ========================================================================== //
//                              TASK API CALLS                               //
// ========================================================================== //
// Kept separate due to specific association handling in executor example

/** Get all tasks - Deprecated in V3, use search */
// export const getAllTasks ...

/** Get a task by ID */
export const getTaskById = async (
  taskId: string,
  properties?: string[]
): Promise<any> => {
  return getObjectById("tasks", taskId, properties);
};

/** Search for tasks (basic search wrapper) */
export const searchTasks = async (searchPayload: any): Promise<any> => {
  return searchObjects("tasks", searchPayload);
};

/** Create a new task (with specific association handling example) */
export const createTask = async (
  properties: Record<string, any>,
  associations?: EngagementAssociations // Use the helper type
): Promise<any> => {
  // Create the task properties
  const createResponse = await makeRequest("/objects/tasks", "POST", {
    properties,
  });
  const taskId = createResponse?.id;

  // If associations are provided and the task was created successfully
  if (associations && taskId) {
    // Handle associations using the batch endpoint for efficiency
    const associationInputs: any[] = [];
    const mapAssoc = (
      ids: string[] | undefined,
      toObjectType: string,
      type: string
    ) => {
      (ids || []).forEach((toId) =>
        associationInputs.push({ from: { id: taskId }, to: { id: toId }, type })
      );
    };

    // Define association types (confirm these are correct for Task V3)
    mapAssoc(associations.contactIds, "contacts", "task_to_contact");
    mapAssoc(associations.companyIds, "companies", "task_to_company");
    mapAssoc(associations.dealIds, "deals", "task_to_deal");
    mapAssoc(associations.ticketIds, "tickets", "task_to_ticket");
    // mapAssoc(associations.ownerIds, 'owners', 'task_to_owner'); // Association to owner might be different

    if (associationInputs.length > 0) {
      // Need to call batch association endpoint PER object type associated TO
      // Example: Associate contacts
      if (associations.contactIds && associations.contactIds.length > 0) {
        try {
          await makeRequest(
            `/associations/tasks/contacts/batch/create`,
            "POST",
            {
              inputs: associationInputs.filter(
                (a) => a.type === "task_to_contact"
              ),
            }
          );
        } catch (e) {
          console.error("Failed task-contact association", e);
        }
      }
      // Repeat for company, deal, ticket...
      if (associations.companyIds && associations.companyIds.length > 0) {
        try {
          await makeRequest(
            `/associations/tasks/companies/batch/create`,
            "POST",
            {
              inputs: associationInputs.filter(
                (a) => a.type === "task_to_company"
              ),
            }
          );
        } catch (e) {
          console.error("Failed task-company association", e);
        }
      }
      if (associations.dealIds && associations.dealIds.length > 0) {
        try {
          await makeRequest(`/associations/tasks/deals/batch/create`, "POST", {
            inputs: associationInputs.filter((a) => a.type === "task_to_deal"),
          });
        } catch (e) {
          console.error("Failed task-deal association", e);
        }
      }
      if (associations.ticketIds && associations.ticketIds.length > 0) {
        try {
          await makeRequest(
            `/associations/tasks/tickets/batch/create`,
            "POST",
            {
              inputs: associationInputs.filter(
                (a) => a.type === "task_to_ticket"
              ),
            }
          );
        } catch (e) {
          console.error("Failed task-ticket association", e);
        }
      }
    }
  }

  return createResponse; // Return the initial task creation response
};

/** Update a task */
export const updateTask = async (
  taskId: string,
  properties: Record<string, any>
): Promise<any> => {
  return updateObject("tasks", taskId, properties);
};

/** Delete a task */
export const deleteTask = async (taskId: string): Promise<void> => {
  await deleteObject("tasks", taskId);
};

// ========================================================================== //
//                              LIST API CALLS                               //
// ========================================================================== //
// Note: These often use the older V1 Contacts API endpoints

/** Create a Contact List */
export const createList = async (listData: {
  name: string;
  dynamic: boolean;
  filters: any[];
}): Promise<any> => {
  // V1 Endpoint
  return makeRequest("/contacts/v1/lists", "POST", listData, {}, "v1");
};

/** Add Contacts to a Static List */
export const addContactsToList = async (
  listId: string,
  contactIds: string[]
): Promise<any> => {
  // V1 Endpoint
  // Note: API expects contact VIDs (numeric IDs), not emails or object IDs directly
  const payload = { vids: contactIds.map((id) => parseInt(id, 10)) }; // Attempt to parse IDs as numbers
  return makeRequest(
    `/contacts/v1/lists/${listId}/add`,
    "POST",
    payload,
    {},
    "v1"
  );
};

/** Remove Contacts from a Static List */
export const removeContactsFromList = async (
  listId: string,
  contactIds: string[]
): Promise<any> => {
  // V1 Endpoint
  const payload = { vids: contactIds.map((id) => parseInt(id, 10)) };
  return makeRequest(
    `/contacts/v1/lists/${listId}/remove`,
    "POST",
    payload,
    {},
    "v1"
  );
};

/** Get Contacts in a List */
export const getListMembers = async (
  listId: string,
  limit: number = 100,
  offset?: number, // vidOffset
  properties?: string[]
): Promise<any> => {
  // V1 Endpoint
  let endpoint = `/contacts/v1/lists/${listId}/contacts/all?count=${limit}`;
  if (offset !== undefined) {
    endpoint += `&vidOffset=${offset}`;
  }
  if (properties && properties.length > 0) {
    // V1 uses 'property=' parameter repeatedly
    properties.forEach((prop) => {
      endpoint += `&property=${encodeURIComponent(prop)}`;
    });
  }
  return makeRequest(endpoint, "GET", undefined, {}, "v1");
};

/** Delete a List */
export const deleteList = async (listId: string): Promise<void> => {
  // V1 Endpoint
  await makeRequest(
    `/contacts/v1/lists/${listId}`,
    "DELETE",
    undefined,
    {},
    "v1"
  );
};

// ========================================================================== //
//                              FORM API CALLS                               //
// ========================================================================== //

/** Submit data to a HubSpot Form */
export const submitForm = async (
  formGuid: string,
  fields: Array<{ name: string; value: any }>,
  context?: any
): Promise<any> => {
  const portalId = await getPortalId();
  if (!portalId) {
    throw new HubspotApiError(
      "HubSpot Portal ID not found, cannot submit form.",
      400,
      "CONFIGURATION_ERROR"
    );
  }
  const endpoint = `/submissions/v3/integration/submit/${portalId}/${formGuid}`;
  const payload = {
    fields: fields,
    ...(context && { context: context }),
    // legalConsentOptions can be added here if needed
  };
  // Uses V1 Base URL despite being a V3 path structure in documentation
  return makeRequest(
    endpoint,
    "POST",
    payload,
    { "Content-Type": "application/json" },
    "v1"
  );
};

// ========================================================================== //
//                         PROPERTIES API CALLS                              //
// ========================================================================== //

/** Get all properties for an object type */
export const getProperties = async (
  objectType: string,
  archived: boolean = false
): Promise<any> => {
  // V3 Properties API (under CRM namespace)
  const endpoint = `/properties/${objectType}?archived=${archived}`;
  return makeRequest(endpoint, "GET", undefined, {}, "v3"); // Explicitly v3 base
};

/** Create a new property */
export const createProperty = async (
  objectType: string,
  propertyData: Record<string, any>
): Promise<any> => {
  // V3 Properties API
  const endpoint = `/properties/${objectType}`;
  return makeRequest(endpoint, "POST", propertyData, {}, "v3");
};

// ========================================================================== //
//                         BATCH API OPERATIONS                              //
// ========================================================================== //

/** Batch Read Objects */
export const batchReadObjects = async (
  objectType: string,
  ids: string[],
  properties?: string[]
): Promise<any> => {
  const payload: { inputs: Array<{ id: string }>; properties?: string[] } = {
    inputs: ids.map((id) => ({ id })),
  };
  if (properties) {
    payload.properties = properties;
  }
  return makeRequest(`/objects/${objectType}/batch/read`, "POST", payload);
};

/** Batch Create Objects */
export const batchCreateObjects = async (
  objectType: string,
  inputs: Array<{ properties: Record<string, any> }>
): Promise<any> => {
  return makeRequest(`/objects/${objectType}/batch/create`, "POST", { inputs });
};

/** Batch Update Objects */
export const batchUpdateObjects = async (
  objectType: string,
  inputs: Array<{ id: string; properties: Record<string, any> }>
): Promise<any> => {
  return makeRequest(`/objects/${objectType}/batch/update`, "POST", { inputs });
};

/** Batch Archive Objects */
export const batchArchiveObjects = async (
  objectType: string,
  ids: string[]
): Promise<any> => {
  const payload = { inputs: ids.map((id) => ({ id })) };
  return makeRequest(`/objects/${objectType}/batch/archive`, "POST", payload);
};

// --- Specific Batch Wrappers ---
// Contacts
export const batchReadContacts = (ids: string[], properties?: string[]) =>
  batchReadObjects("contacts", ids, properties);
export const batchCreateContacts = (
  inputs: Array<{ properties: Record<string, any> }>
) => batchCreateObjects("contacts", inputs);
export const batchUpdateContacts = (
  inputs: Array<{ id: string; properties: Record<string, any> }>
) => batchUpdateObjects("contacts", inputs);
export const batchArchiveContacts = (ids: string[]) =>
  batchArchiveObjects("contacts", ids);
// Companies
export const batchReadCompanies = (ids: string[], properties?: string[]) =>
  batchReadObjects("companies", ids, properties);
export const batchCreateCompanies = (
  inputs: Array<{ properties: Record<string, any> }>
) => batchCreateObjects("companies", inputs);
export const batchUpdateCompanies = (
  inputs: Array<{ id: string; properties: Record<string, any> }>
) => batchUpdateObjects("companies", inputs);
export const batchArchiveCompanies = (ids: string[]) =>
  batchArchiveObjects("companies", ids);
// Deals
export const batchReadDeals = (ids: string[], properties?: string[]) =>
  batchReadObjects("deals", ids, properties);
export const batchCreateDeals = (
  inputs: Array<{ properties: Record<string, any> }>
) => batchCreateObjects("deals", inputs);
export const batchUpdateDeals = (
  inputs: Array<{ id: string; properties: Record<string, any> }>
) => batchUpdateObjects("deals", inputs);
export const batchArchiveDeals = (ids: string[]) =>
  batchArchiveObjects("deals", ids);
// Tickets
export const batchReadTickets = (ids: string[], properties?: string[]) =>
  batchReadObjects("tickets", ids, properties);
export const batchCreateTickets = (
  inputs: Array<{ properties: Record<string, any> }>
) => batchCreateObjects("tickets", inputs);
export const batchUpdateTickets = (
  inputs: Array<{ id: string; properties: Record<string, any> }>
) => batchUpdateObjects("tickets", inputs);
export const batchArchiveTickets = (ids: string[]) =>
  batchArchiveObjects("tickets", ids);

// ========================================================================== //
//                       OTHER / UTILITY API CALLS                           //
// ========================================================================== //

/** Get details about the current token/API key */
export const getTokenInfo = async (): Promise<any> => {
  // Requires OAuth specific endpoint
  const config = await loadHubSpotConfig();
  if (!config.accessToken)
    throw new Error("Access token required for token info.");
  return makeRequest(
    `/oauth/v1/access-tokens/${config.accessToken}`,
    "GET",
    undefined,
    {},
    "v1"
  );
};

/** Get info about the HubSpot account */
export const getAccountDetails = async (): Promise<any> => {
  // Requires specific scope usually
  return makeRequest("/account-info/v3/details", "GET");
};

/** Get details about available pipelines for an object type */
export const getPipelines = async (
  objectType: "deals" | "tickets"
): Promise<any> => {
  return makeRequest(`/pipelines/${objectType}`);
};

/** Get stages within a specific pipeline */
export const getPipelineStages = async (
  objectType: "deals" | "tickets",
  pipelineId: string
): Promise<any> => {
  return makeRequest(`/pipelines/${objectType}/${pipelineId}/stages`);
};

/** Get HubSpot Owners */
export const getOwners = async (
  email?: string,
  userId?: string,
  limit: number = 100,
  after?: string
): Promise<any> => {
  let endpoint = `/owners/?limit=${limit}`;
  if (email) endpoint += `&email=${encodeURIComponent(email)}`;
  if (userId) endpoint += `&userId=${encodeURIComponent(userId)}`;
  if (after) endpoint += `&after=${after}`;
  return makeRequest(endpoint);
};

// ========================================================================== //
//                         EMAIL API CALLS (Existing)                        //
// ========================================================================== //
// Kept from original file, may need review/integration with Engagement logging

/** Send a transactional email */
export const sendTransactionalEmail = async (emailProps: {
  to: string[]; // Should be email address strings
  from?: string;
  fromName?: string;
  subject: string;
  body: string; // Either text or HTML based on isHtml
  isHtml?: boolean;
  attachments?: Array<{
    name: string;
    content: string; // Assuming base64 encoded content
    contentType?: string;
  }>;
  replyTo?: string; // Email address string
  cc?: string[]; // Email address strings
  bcc?: string[]; // Email address strings
  // Other HubSpot specific options...
}): Promise<any> => {
  const payload = {
    // emailId: null, // Use null for custom content, not required in v3 send
    message: {
      to: emailProps.to.join(","), // API expects comma-separated string for 'to'
      from: emailProps.from, // Optional sender email
      sendId: undefined, // Optional idempotency key
      replyTo: emailProps.replyTo ? [emailProps.replyTo] : undefined, // Expects array
      cc: emailProps.cc, // Expects array
      bcc: emailProps.bcc, // Expects array
      subject: emailProps.subject,
      textBody: emailProps.isHtml ? undefined : emailProps.body,
      htmlBody: emailProps.isHtml ? emailProps.body : undefined,
      // attachments: emailProps.attachments, // Attachments need careful formatting (base64 content)
    },
    contactProperties: {}, // Optional - properties to update on contact if matched
    customProperties: {
      // Custom properties for email itself
      ...(emailProps.fromName && { from_name: emailProps.fromName }),
    },
    // Other options like tracking...
  };

  // Use Marketing transactional endpoint (ensure correct scopes)
  return makeRequest(
    "/marketing/v3/transactional/single-email/send",
    "POST",
    payload
  );
};

/** Get all email templates - Likely needs Marketing scope */
export const getEmailTemplates = async (
  limit: number = 100,
  offset?: number
): Promise<any> => {
  console.warn(
    "getEmailTemplates might require specific Marketing Email API scopes."
  );
  let endpoint = `/content/email/v3/templates?limit=${limit}`; // Check correct endpoint
  if (offset !== undefined) {
    endpoint += `&offset=${offset}`;
  }
  return makeRequest(endpoint); // Adjust API version if needed
};

/** Get email template by ID - Likely needs Marketing scope */
export const getEmailTemplateById = async (
  templateId: string
): Promise<any> => {
  console.warn(
    "getEmailTemplateById might require specific Marketing Email API scopes."
  );
  return makeRequest(`/content/email/v3/templates/${templateId}`); // Check correct endpoint
};

/** Send an email using a template - Requires Marketing scope */
export const sendEmailWithTemplate = async (
  templateId: string,
  recipientEmail: string, // Use email address for transactional send
  customProperties?: Record<string, any>,
  contactProperties?: Record<string, any>
): Promise<any> => {
  console.warn(
    "sendEmailWithTemplate requires specific Marketing Email API scopes."
  );
  const payload = {
    emailId: templateId, // ID of the template in HubSpot
    message: {
      to: recipientEmail, // Recipient's email address
    },
    contactProperties: contactProperties || {}, // Properties to update on the contact record (use internal names)
    customProperties: customProperties || {}, // Custom properties to merge into the email template
  };
  return makeRequest(
    "/marketing/v3/transactional/single-email/send",
    "POST",
    payload
  );
};

// ========================================================================== //
//                         FILE API CALLS (Existing)                         //
// ========================================================================== //

/** Upload a file to HubSpot */
export const uploadFile = async (
  file: File,
  options?: {
    fileName?: string;
    folderPath?: string;
    folderId?: string;
    duplicateValidationStrategy?: "NONE" | "REJECT" | "RETURN_EXISTING";
    duplicateValidationScope?: "ENTIRE_PORTAL" | "EXACT_FOLDER";
  }
): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file, options?.fileName || file.name);
  // Options need to be passed as a JSON string in a field named 'options'
  const jsonOptions = JSON.stringify({
    access: "PRIVATE", // Default to PRIVATE, can be PUBLIC_INDEXABLE, etc.
    ttl: "P3M", // Example: Time To Live - 3 months
    overwrite: false, // Default to not overwrite
    duplicateValidationStrategy: options?.duplicateValidationStrategy || "NONE",
    duplicateValidationScope:
      options?.duplicateValidationScope || "ENTIRE_PORTAL",
  });
  formData.append("options", jsonOptions);

  // Add folder info if provided
  if (options?.folderId) {
    formData.append("folderId", options.folderId);
  } else if (options?.folderPath) {
    formData.append("folderPath", options.folderPath);
  }

  const headers = await createHeaders();
  // Let the browser set the Content-Type for FormData
  headers.delete("Content-Type");

  // Files API v3 endpoint
  const url = `https://api.hubapi.com/files/v3/files`; // Uses V1 base but V3 path structure

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  // Handle response similar to makeRequest (needed because fetch is used directly)
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HubSpot File Upload Error (${response.status})`;
    let category: string | undefined = undefined;
    let details: any = undefined;
    try {
      details = JSON.parse(errorText);
      errorMessage += details.message ? `: ${details.message}` : "";
      category = details.category;
    } catch {
      errorMessage += errorText.trim() ? `: ${errorText.trim()}` : "";
    }

    throw new HubspotApiError(errorMessage, response.status, category, details);
  }

  return response.json(); // Return parsed JSON response
};

// ========================================================================== //
//                      OAUTH AUTHENTICATION (Existing)                      //
// ========================================================================== //
// These functions likely need your specific clientId, clientSecret, redirectUri

/** Exchange authorization code for access token */
export const exchangeCodeForToken = async (
  code: string,
  // Pass these in or retrieve from secure config
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

  // Simplified error handling for OAuth - makeRequest handles general cases better
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "Unknown OAuth Error",
      error_description: "Failed to exchange code.",
    }));
    throw new Error(
      `OAuth Error (${response.status}): ${errorData.error} - ${errorData.error_description}`
    );
  }

  const tokenData = await response.json();

  // Update storage with the new tokens
  const config = await loadHubSpotConfig();
  const updatedConfig: HubSpotConfig = {
    ...config,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000, // Calculate expiry time
    apiKey: "", // Clear old API key if using OAuth
  };
  await saveHubSpotConfig(updatedConfig);
  return tokenData;
};

/** Refresh access token */
export const refreshAccessToken = async (
  // Pass these in or retrieve from secure config
  clientId: string,
  clientSecret: string
): Promise<any> => {
  const config = await loadHubSpotConfig();
  if (!config.refreshToken) {
    throw new HubspotApiError(
      "No refresh token available for refresh.",
      401,
      "AUTHENTICATION_ERROR"
    );
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", config.refreshToken);

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "Token Refresh Error",
      error_description: "Failed to refresh token.",
    }));
    console.error("Token refresh failed:", errorData);
    // If refresh fails, clear expired tokens and throw
    await saveHubSpotConfig({
      ...config,
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined,
    });
    throw new HubspotApiError(
      `Token Refresh Failed (${response.status}): ${errorData.error} - ${errorData.error_description}. Please re-authenticate.`,
      response.status,
      "AUTHENTICATION_ERROR"
    );
  }

  const tokenData = await response.json();

  // Update storage with the new tokens
  const updatedConfig: HubSpotConfig = {
    ...config,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token, // HubSpot might return a new refresh token
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };
  await saveHubSpotConfig(updatedConfig);
  console.log("HubSpot token refreshed successfully.");
  return tokenData;
};

/**
 * Enroll one or more objects (by ID) into a specific workflow using the V3 batch endpoint.
 * @param workflowId The ID of the workflow.
 * @param objectIds An array of object IDs (e.g., Contact IDs) to enroll.
 * @param objectTypeId Optional - specify if enrolling objects other than contacts (e.g., 'COMPANY', 'DEAL'). Defaults typically work for contacts.
 * @returns The API response.
 */
export const enrollObjectsInWorkflow = async (
  // Renamed for clarity
  workflowId: string,
  objectIds: string[], // Changed to accept an array
  objectTypeId?: string // Optional parameter for non-contact objects
): Promise<any> => {
  if (!objectIds || objectIds.length === 0) {
    // Avoid making an API call with no objects
    return Promise.resolve({
      message: "No object IDs provided for enrollment.",
    });
  }

  const endpoint = `/automation/v3/workflows/${workflowId}/enrollments`;
  // Build the inputs array from the objectIds array
  const payload = {
    inputs: objectIds.map((id) => ({
      objectId: id,
      ...(objectTypeId && { objectTypeId: objectTypeId }), // Add objectTypeId if provided
    })),
  };

  // makeRequest uses BASE_URL_V3 by default
  console.log(
    `[api.ts] Enrolling ${objectIds.length} objects into workflow ${workflowId}`
  );
  return makeRequest(endpoint, "POST", payload);
};

/** Check if token is expired and refresh if needed - simplified */
export const ensureValidToken = async (
  clientId: string,
  clientSecret: string
): Promise<string> => {
  const config = await loadHubSpotConfig();
  const token = config.accessToken || config.apiKey;

  if (!token) {
    throw new HubspotApiError(
      "No access token or API key available.",
      401,
      "AUTHENTICATION_ERROR"
    );
  }

  // If using OAuth token with expiry and refresh token
  if (config.accessToken && config.expiresAt && config.refreshToken) {
    // Check if expired or nearing expiry (e.g., 5 minutes buffer)
    if (Date.now() + 5 * 60 * 1000 >= config.expiresAt) {
      console.log(
        "HubSpot token expired or nearing expiry, attempting refresh..."
      );
      try {
        const refreshedTokenData = await refreshAccessToken(
          clientId,
          clientSecret
        );
        return refreshedTokenData.access_token; // Return the new token
      } catch (refreshError) {
        console.error("Failed to refresh HubSpot token:", refreshError);
        throw refreshError; // Re-throw refresh error
      }
    } else {
      return config.accessToken; // Token is still valid
    }
  } else if (token) {
    // If using API Key / non-expiring token, just return it
    return token;
  } else {
    // Should not happen if initial check passed, but included for safety
    throw new HubspotApiError(
      "No valid authentication method found.",
      401,
      "AUTHENTICATION_ERROR"
    );
  }
};
