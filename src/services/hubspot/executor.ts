/**
 * HubSpot Function Executor
 *
 * This file contains the implementation for executing HubSpot-related function calls
 * that are returned by Gemini AI. It connects the AI function calls to the HubSpot API.
 */

import * as hubspotApi from "./api"; // Assuming your core API calls are defined here
import { getIsHubspotMode } from "../../background";
// Using Chrome extension API directly

import { HubspotApiError } from "../../classes/ActionError";
import {
  HubSpotExecutionResult,
  HubSpotExecutorErrorResult,
  HubSpotExecutorSuccessResult,
} from "../ai/interfaces";

// Type for function call arguments from Gemini AI
interface FunctionCallArgs {
  name: string;
  args: Record<string, any>;
}

/**
 * Main executor function for HubSpot function calls
 *
 * @param functionCall The function call from Gemini AI
 * @returns Result of the function execution, conforming to HubSpotExecutionResult
 */
export async function executeHubspotFunction(
  functionCall: FunctionCallArgs
): Promise<HubSpotExecutionResult> {
  // Corrected Return Type Annotation
  const { name, args } = functionCall;

  console.log("[executor.ts] ENTRY executeHubspotFunction", { functionCall });

  try {
    // Only allow HubSpot API usage in HubSpot mode
    if (!(await getIsHubspotMode())) {
      console.warn("[executor.ts] HubSpot mode is not enabled");
      return {
        success: false,
        error: "HubSpot API is only available in HubSpot mode.",
        errorType: "mode",
        functionName: name, // Added functionName
      };
    }

    // Verify that we have valid HubSpot credentials before proceeding
    const hubspotConfig = await hubspotApi.loadHubSpotConfig();
    const token = hubspotConfig.accessToken || hubspotConfig.apiKey; // Check for either token

    if (!token) {
      console.warn("[executor.ts] No HubSpot Access Token or API Key found");
      return {
        success: false,
        error:
          "No HubSpot access token found. Please add your HubSpot Private App access token or authenticate via OAuth in Settings.",
        errorType: "authentication",
        functionName: name, // Added functionName
      };
    }

    // Match the function name to its implementation
    console.log("[executor.ts] Dispatching HubSpot function:", name, args);
    let result: any; // Keep as any initially, will be typed on return
    switch (name) {
      // --- Navigation ---
      case "hubspot_navigateTo":
        result = await navigateToHubspotSection(args);
        break;

      // --- Contacts ---
      case "hubspot_createContact":
        result = await createContact(args);
        break;
      case "hubspot_getContactById":
        result = await getContactById(args); // IMPLEMENTED
        break;
      case "hubspot_findContact":
        result = await findContact(args);
        break;
      case "hubspot_updateContact":
        result = await updateContact(args);
        break;
      case "hubspot_deleteContact":
        result = await deleteContact(args); // IMPLEMENTED
        break;
      case "hubspot_searchContacts": // Basic Search
        result = await searchContacts(args);
        break;

      // --- Companies ---
      case "hubspot_createCompany":
        result = await createCompany(args);
        break;
      case "hubspot_getCompanyById":
        result = await getCompanyById(args); // IMPLEMENTED
        break;
      case "hubspot_updateCompany":
        result = await updateCompany(args); // IMPLEMENTED
        break;
      case "hubspot_deleteCompany":
        result = await deleteCompany(args); // IMPLEMENTED
        break;
      case "hubspot_searchCompanies": // Basic Search
        result = await searchCompanies(args);
        break;

      // --- Deals ---
      case "hubspot_createDeal":
        result = await createDeal(args);
        break;
      case "hubspot_getDealById":
        result = await getDealById(args); // IMPLEMENTED
        break;
      case "hubspot_updateDeal": // Generic Update
        result = await updateDeal(args); // IMPLEMENTED
        break;
      case "hubspot_updateDealStage": // Specific Stage Update
        result = await updateDealStage(args);
        break;
      case "hubspot_deleteDeal":
        result = await deleteDeal(args); // IMPLEMENTED
        break;
      case "hubspot_searchDeals": // Basic Search
        result = await searchDeals(args);
        break;

      // --- Tickets ---
      case "hubspot_createTicket":
        result = await createTicket(args);
        break;
      case "hubspot_getTicketById":
        result = await getTicketById(args); // IMPLEMENTED
        break;
      case "hubspot_updateTicket":
        result = await updateTicket(args);
        break;
      case "hubspot_deleteTicket":
        result = await deleteTicket(args); // IMPLEMENTED
        break;

      // --- Search (Advanced) ---
      case "hubspot_advancedSearch":
        result = await advancedSearch(args); // IMPLEMENTED
        break;

      // --- Associations ---
      case "hubspot_associateRecords":
        result = await associateRecords(args); // IMPLEMENTED
        break;
      case "hubspot_getAssociations":
        result = await getAssociations(args); // IMPLEMENTED
        break;

      // --- Engagements ---
      case "hubspot_addNote": // Renamed
        result = await addNote(args);
        break;
      case "hubspot_scheduleMeeting": // Renamed
        result = await scheduleMeeting(args);
        break;
      case "hubspot_createTask":
        result = await createTask(args);
        break;
      case "hubspot_logCall":
        result = await logCall(args); // IMPLEMENTED
        break;
      case "hubspot_sendEmail": // Assumes 1-to-one send/log
        result = await sendEmail(args);
        break;
      case "hubspot_updateTask":
        result = await updateTask(args); // IMPLEMENTED
        break;
      case "hubspot_deleteEngagement":
        result = await deleteEngagement(args); // IMPLEMENTED
        break;
      case "hubspot_searchEngagements":
        result = await searchEngagements(args); // IMPLEMENTED
        break;

      // --- Marketing (Lists & Forms) ---
      case "hubspot_createList":
        result = await createList(args);
        break;
      case "hubspot_addContactsToList":
        result = await addContactsToList(args); // IMPLEMENTED
        break;
      case "hubspot_removeContactsFromList":
        result = await removeContactsFromList(args); // IMPLEMENTED
        break;
      case "hubspot_getListMembers":
        result = await getListMembers(args); // IMPLEMENTED
        break;
      case "hubspot_deleteList":
        result = await deleteList(args); // IMPLEMENTED
        break;
      case "hubspot_submitForm":
        result = await submitForm(args); // IMPLEMENTED
        break;

      // --- Automation ---
      case "hubspot_runWorkflow":
        result = await runWorkflow(args);
        break;

      // --- Analytics ---
      case "hubspot_getAnalytics":
        result = await getAnalytics(args);
        break;

      // --- Metadata (Properties) ---
      case "hubspot_getProperties":
        result = await getProperties(args); // IMPLEMENTED
        break;
      case "hubspot_createProperty":
        result = await createProperty(args); // IMPLEMENTED
        break;

      // --- Batch Operations ---
      case "hubspot_batchCreateContacts":
        result = await batchCreateContacts(args); // IMPLEMENTED
        break;
      case "hubspot_batchUpdateContacts":
        result = await batchUpdateContacts(args); // IMPLEMENTED
        break;
      case "hubspot_batchReadContacts":
        result = await batchReadContacts(args); // IMPLEMENTED
        break;
      case "hubspot_batchArchiveContacts":
        result = await batchArchiveContacts(args); // IMPLEMENTED
        break;
      case "hubspot_batchCreateCompanies":
        result = await batchCreateCompanies(args); // IMPLEMENTED
        break;
      case "hubspot_batchUpdateCompanies":
        result = await batchUpdateCompanies(args); // IMPLEMENTED
        break;
      case "hubspot_batchReadCompanies":
        result = await batchReadCompanies(args); // IMPLEMENTED
        break;
      case "hubspot_batchArchiveCompanies":
        result = await batchArchiveCompanies(args); // IMPLEMENTED
        break;
      case "hubspot_batchCreateDeals":
        result = await batchCreateDeals(args); // IMPLEMENTED
        break;
      case "hubspot_batchUpdateDeals":
        result = await batchUpdateDeals(args); // IMPLEMENTED
        break;
      case "hubspot_batchReadDeals":
        result = await batchReadDeals(args); // IMPLEMENTED
        break;
      case "hubspot_batchArchiveDeals":
        result = await batchArchiveDeals(args); // IMPLEMENTED
        break;
      case "hubspot_batchCreateTickets":
        result = await batchCreateTickets(args); // IMPLEMENTED
        break;
      case "hubspot_batchUpdateTickets":
        result = await batchUpdateTickets(args); // IMPLEMENTED
        break;
      case "hubspot_batchReadTickets":
        result = await batchReadTickets(args); // IMPLEMENTED
        break;
      case "hubspot_batchArchiveTickets":
        result = await batchArchiveTickets(args); // IMPLEMENTED
        break;
      // Added Batch Associate
      case "hubspot_batchAssociateRecords":
        result = await batchAssociateRecords(args); // IMPLEMENTED
        break;

      // --- Default ---
      default:
        console.warn(`[executor.ts] Unknown function name: ${name}`);
        // Explicitly return the error structure matching HubSpotExecutorErrorResult
        return {
          success: false,
          error: `Unknown HubSpot function: ${name}`,
          errorType: "unknown_function",
          functionName: name, // Added functionName
        };
      // No break needed after return
    }

    console.log("[executor.ts] HubSpot function result:", { name, result });

    // --- Standardize Success Response ---
    // Check if the result from the implementation function already fits the success structure
    if (
      typeof result === "object" &&
      result !== null &&
      result.success === true &&
      "message" in result
    ) {
      // It fits, just ensure functionName is present
      return {
        ...result,
        functionName: name, // Ensure functionName is added
      } as HubSpotExecutorSuccessResult; // Type assertion
    } else if (
      typeof result === "object" &&
      result !== null &&
      result.success === false
    ) {
      // It's an explicitly returned error from the implementation function
      return {
        ...result, // Spread existing error properties
        functionName: name, // Ensure functionName is added
      } as HubSpotExecutorErrorResult; // Type assertion
    } else {
      // If the underlying function returned non-standard success (e.g., just raw data)
      // Wrap it according to the defined success type
      return {
        success: true,
        message: `Function ${name} executed successfully.`, // Generic success message
        data: result, // Include the raw result as data
        functionName: name,
      } as HubSpotExecutorSuccessResult; // Type assertion
    }
    // --- End Standardize Success Response ---
  } catch (error) {
    console.error(
      `[executor.ts] Error executing HubSpot function ${name}:`,
      error
    );

    // Handle structured HubSpot API errors
    if (error instanceof HubspotApiError) {
      return {
        success: false,
        error: error.message,
        errorType: error.category || "hubspot_api",
        status: error.status,
        details: error.details,
        functionName: name, // <<< Added functionName HERE
      };
    }

    // Detect specific types of errors with more comprehensive checks
    let errorMsg = error instanceof Error ? error.message : String(error);
    let errorType: HubSpotExecutorErrorResult["errorType"] = "general"; // Use the defined type

    // --- Keep your error classification logic here ---
    if (
      errorMsg.includes("401") ||
      errorMsg.includes("403") ||
      errorMsg.includes("unauthorized") ||
      errorMsg.includes("token") ||
      errorMsg.includes("API key")
    ) {
      errorType = "authentication";
      errorMsg =
        "Authentication error with HubSpot. Please check your access token and ensure your Private App has the required scopes.";
    } else if (
      errorMsg.includes("Missing scopes") ||
      errorMsg.includes("permission") ||
      errorMsg.includes("forbidden")
    ) {
      errorType = "permissions";
      errorMsg =
        "Permission error. Your HubSpot Private App might be missing required scopes. Please update your app's scopes.";
    } else if (
      errorMsg.includes("429") ||
      errorMsg.includes("rate limit") ||
      errorMsg.includes("too many requests")
    ) {
      errorType = "rate_limit";
      errorMsg = "HubSpot API rate limit exceeded. Please try again later.";
    } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      errorType = "not_found";
      errorMsg =
        "The requested HubSpot resource (e.g., Contact, Deal ID) was not found. Please check the ID and try again.";
    } else if (
      errorMsg.includes("Function not implemented") // Catch placeholders
    ) {
      errorType = "not_implemented";
      // Keep original message from placeholder
    } else if (
      errorMsg.includes("network") ||
      errorMsg.includes("connection") ||
      errorMsg.includes("timeout") ||
      errorMsg.includes("fetch")
    ) {
      errorType = "network";
      errorMsg =
        "Network error connecting to HubSpot. Please check your internet connection and try again.";
    } else if (
      errorMsg.includes("400") ||
      errorMsg.includes("invalid") ||
      errorMsg.includes("validation") ||
      errorMsg.includes("required property")
    ) {
      errorType = "validation";
      // Use original error message for validation errors as it's often more specific
      // errorMsg = "Invalid request data. Please check the provided field values and ensure all required fields are present.";
    } else if (
      errorMsg.includes("PortalNotFound") ||
      errorMsg.includes("account not found")
    ) {
      errorType = "authentication"; // Often related to bad token/key
      errorMsg =
        "Your HubSpot account could not be found or accessed. Please verify your access token.";
    }
    // Add more specific checks as needed based on errors you encounter

    // Final return for generic errors
    return {
      success: false,
      error: errorMsg, // Return the classified or original message
      errorType: errorType,
      details: error instanceof Error ? error.message : String(error), // Keep original error for debugging
      functionName: name, // <<< Added functionName HERE
    };
  }
}
// ========================================================================== //
//               EXISTING IMPLEMENTATION FUNCTIONS (Keep These)              //
// ========================================================================== //

/**
 * Navigate to a specific section in HubSpot
 */
async function navigateToHubspotSection(
  args: Record<string, any>
): Promise<{ success: boolean; message?: string }> {
  const { section, subsection, recordId } = args;

  try {
    // Find the first open HubSpot tab to extract the portal ID
    const [tab] = await chrome.tabs.query({ url: "*://app.hubspot.com/*" });
    if (!tab || !tab.url) {
      return {
        success: false,
        message:
          "No open HubSpot tab found. Please open HubSpot in a browser tab.",
      };
    }

    // Try to extract the portal ID from the URL (e.g., https://app.hubspot.com/contacts/1234567/contact/...)
    const portalIdMatch = tab.url.match(/app\.hubspot\.com\/[^/]+\/(\d+)/);
    const portalId = portalIdMatch ? portalIdMatch[1] : null;

    if (!portalId) {
      return {
        success: false,
        message:
          "Could not determine HubSpot portal ID from the current tab URL.",
      };
    }

    // Build the navigation URL
    let url = `https://app.hubspot.com/`;
    if (section === "contacts" && recordId) {
      url += `contacts/${portalId}/contact/${recordId}`;
    } else if (section === "companies" && recordId) {
      url += `contacts/${portalId}/company/${recordId}`;
    } else if (section === "deals" && recordId) {
      url += `contacts/${portalId}/deal/${recordId}`;
    } else if (section === "tickets" && recordId) {
      url += `contacts/${portalId}/ticket/${recordId}`;
    } else if (section && subsection) {
      url += `${section}/${portalId}/${subsection}`;
    } else if (section) {
      url += `${section}/${portalId}/`;
    } else {
      url += `contacts/${portalId}/dashboard`;
    }

    // Open the URL in a new tab using Chrome extension API
    await chrome.tabs.create({ url });

    return {
      success: true,
      message: `Mapped to HubSpot section: ${url}`,
    };
  } catch (error) {
    console.error("Error navigating to HubSpot section:", error);
    throw new Error(
      `Failed to navigate: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Create a new contact in HubSpot
 */
async function createContact(
  args: Record<string, any>
): Promise<{ success: boolean; data?: any; message?: string }> {
  console.log("[executor.ts] ENTRY createContact", { args });
  const {
    email,
    firstName,
    lastName,
    phone,
    company,
    jobTitle,
    lifecycleStage,
    otherProperties,
  } = args;

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    email: email,
    ...(firstName && { firstname: firstName }),
    ...(lastName && { lastname: lastName }),
    ...(phone && { phone: phone }),
    ...(company && { company: company }),
    ...(jobTitle && { jobtitle: jobTitle }),
    ...(lifecycleStage && { lifecyclestage: lifecycleStage }),
    ...otherProperties, // Directly spread otherProperties assuming keys match HubSpot internal names
  };

  try {
    console.log("[executor.ts] createContact - calling HubSpot API", {
      properties,
    });
    const result = await hubspotApi.createContact(properties);
    console.log("[executor.ts] createContact SUCCESS", { result });

    // After creating the contact, fetch the full details using the returned ID
    const contactId = result.id;
    if (contactId) {
      console.log(
        "[executor.ts] createContact - Fetching full contact details for ID:",
        contactId
      );
      // Fetch the contact by ID, requesting the properties needed for the card
      // The list of properties to fetch should ideally be defined elsewhere or
      // match the displayProperties in HubspotCard.tsx. For now, hardcode common ones.
      const fetchedContact = await hubspotApi.getContactById(contactId, [
        "firstname",
        "lastname",
        "email",
        "phone",
        "company",
        "jobtitle",
        "lifecyclestage",
        "createdate", // Include creation date as it's often useful
      ]);
      console.log("[executor.ts] createContact - Fetched contact details:", {
        fetchedContact,
      });

      // Return a standard success structure with the fetched data
      return {
        success: true,
        data: fetchedContact, // Use the fetched data with full properties
        message: `Contact created and details fetched for ID ${contactId}`,
      };
    } else {
      // If for some reason the ID is not returned, still return success but with limited data
      console.warn(
        "[executor.ts] createContact - Contact ID not returned after creation."
      );
      return {
        success: true,
        data: result, // Return the original result if ID is missing
        message: `Contact created, but full details could not be fetched (ID missing).`,
      };
    }
  } catch (error) {
    console.error("[executor.ts] createContact ERROR", error);
    throw error; // Let the main catch block handle error formatting
  }
}

/**
 * Search for contacts in HubSpot (Basic Search)
 */
async function searchContacts(
  args: Record<string, any>
): Promise<{ success: boolean; data?: any; message?: string }> {
  const { query: searchQuery, limit, after } = args;

  // Construct the basic search request body for HubSpot API
  const searchRequest = {
    query: searchQuery,
    limit: limit || 10,
    after: after,
    properties: ["firstname", "lastname", "email", "phone", "company"],
  };

  try {
    const result = await hubspotApi.searchContacts(searchRequest);
    return {
      success: true,
      data: result,
      message: `Found ${result.total || 0} contacts matching '${searchQuery}'`,
    };
  } catch (error) {
    console.error("Error searching contacts:", error);
    throw error;
  }
}

/**
 * Update an existing contact in HubSpot
 */
async function updateContact(args: any): Promise<any> {
  const {
    contactId,
    email,
    firstName,
    lastName,
    phone,
    company,
    jobTitle,
    lifecycleStage,
    otherProperties,
  } = args;

  if (!contactId) {
    return {
      success: false,
      error: "Missing required argument: contactId",
      errorType: "validation",
    };
  }

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    ...(email && { email: email }),
    ...(firstName && { firstname: firstName }),
    ...(lastName && { lastname: lastName }),
    ...(phone && { phone: phone }),
    ...(company && { company: company }),
    ...(jobTitle && { jobtitle: jobTitle }),
    ...(lifecycleStage && { lifecyclestage: lifecycleStage }),
    ...otherProperties, // Directly spread
  };

  // Ensure properties object is not empty
  if (Object.keys(properties).length === 0) {
    return {
      success: false,
      error: "No properties provided to update.",
      errorType: "validation",
    };
  }

  try {
    const result = await hubspotApi.updateContact(contactId, properties);
    return {
      success: true,
      data: result,
      message: `Contact ${contactId} updated successfully.`,
    };
  } catch (error) {
    console.error("Error updating contact:", error);
    throw error;
  }
}

/**
 * Create a new company in HubSpot
 */
async function createCompany(args: any): Promise<any> {
  const {
    name,
    domain,
    industry,
    phone,
    city,
    state,
    country,
    otherProperties,
  } = args;

  if (!name) {
    return {
      success: false,
      error: "Missing required argument: name",
      errorType: "validation",
    };
  }

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    name: name,
    ...(domain && { domain: domain }),
    ...(industry && { industry: industry }),
    ...(phone && { phone: phone }),
    ...(city && { city: city }),
    ...(state && { state: state }),
    ...(country && { country: country }),
    ...otherProperties, // Directly spread
  };

  try {
    const result = await hubspotApi.createCompany(properties);
    return {
      success: true,
      data: result,
      message: `Company '${name}' created successfully with ID ${result.id}.`,
    };
  } catch (error) {
    console.error("Error creating company:", error);
    throw error;
  }
}

/**
 * Search for companies in HubSpot (Basic Search)
 */
async function searchCompanies(args: any): Promise<any> {
  const { query: searchQuery, limit, after } = args;

  const searchRequest = {
    query: searchQuery,
    limit: limit || 10,
    after: after,
    properties: ["name", "domain", "industry", "city", "phone"], // Request specific props
  };

  try {
    const result = await hubspotApi.searchCompanies(searchRequest);
    return {
      success: true,
      data: result,
      message: `Found ${result.total || 0} companies matching '${searchQuery}'`,
    };
  } catch (error) {
    console.error("Error searching companies:", error);
    throw error;
  }
}

/**
 * Create a new deal in HubSpot
 */
async function createDeal(args: any): Promise<any> {
  const {
    dealName,
    pipeline,
    stage,
    amount,
    closeDate,
    dealType,
    associatedCompanyId, // Associations handled separately now
    associatedContactIds, // Associations handled separately now
    otherProperties,
  } = args;

  if (!dealName || !pipeline || !stage) {
    return {
      success: false,
      error: "Missing required arguments: dealName, pipeline, stage",
      errorType: "validation",
    };
  }

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    dealname: dealName,
    pipeline: pipeline, // Required field
    dealstage: stage, // Required field
    ...(amount !== undefined && amount !== null && { amount: String(amount) }), // Ensure amount is string if required by API
    ...(closeDate && { closedate: closeDate }),
    ...(dealType && { dealtype: dealType }),
    ...otherProperties, // Directly spread
  };

  try {
    const result = await hubspotApi.createDeal(properties);
    const dealId = result.id;

    let associationMessages: string[] = [];

    // --- Handle Associations AFTER creating the deal ---
    if (dealId && associatedCompanyId) {
      try {
        // Use the single associateRecords function (ensure it exists in api.ts)
        await associateRecords({
          fromObjectType: "deals",
          fromObjectId: dealId,
          toObjectType: "companies",
          toObjectId: associatedCompanyId,
          associationType: "deal_to_company", // Example type, adjust if needed
        });

        associationMessages.push(
          `Associated with company ${associatedCompanyId}.`
        );
      } catch (assocError) {
        console.warn(
          `Failed to associate deal ${dealId} with company ${associatedCompanyId}:`,
          assocError
        );
        associationMessages.push(
          `Failed to associate with company ${associatedCompanyId}.`
        );
      }
    }
    if (dealId && associatedContactIds && associatedContactIds.length > 0) {
      try {
        // Use batch association (ensure it exists in api.ts)
        await batchAssociateRecords({
          fromObjectType: "deals",
          fromObjectId: dealId, // ID of the record we just created
          toObjectType: "contacts",
          toObjectIds: associatedContactIds, // Array of IDs to associate
          associationType: "deal_to_contact", // Example type, adjust if needed
        });
        associationMessages.push(
          `Associated with contacts: ${associatedContactIds.join(", ")}.`
        );
      } catch (assocError) {
        console.warn(
          `Failed to associate deal ${dealId} with contacts ${associatedContactIds.join(
            ", "
          )}:`,
          assocError
        );
        associationMessages.push(
          `Failed to associate with contacts: ${associatedContactIds.join(
            ", "
          )}.`
        );
      }
    }
    // --- End Association Handling ---

    return {
      success: true,
      data: result,
      message: `Deal '${dealName}' created successfully with ID ${dealId}. ${associationMessages.join(
        " "
      )}`,
    };
  } catch (error) {
    console.error("Error creating deal:", error);
    throw error;
  }
}

/**
 * Update the stage of a deal in HubSpot
 */
async function updateDealStage(args: any): Promise<any> {
  const { dealId, stage, pipeline } = args; // Added pipeline

  if (!dealId || !stage) {
    return {
      success: false,
      error: "Missing required arguments: dealId, stage",
      errorType: "validation",
    };
  }

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    dealstage: stage,
    ...(pipeline && { pipeline: pipeline }), // Include pipeline if changing stage requires it
  };

  try {
    // Use the generic updateDeal function assumed to be in api.ts
    const result = await hubspotApi.updateDeal(dealId, properties);
    return {
      success: true,
      data: result,
      message: `Deal ${dealId} stage updated successfully to: ${stage}${
        pipeline ? ` in pipeline ${pipeline}` : ""
      }.`,
    };
  } catch (error) {
    console.error("Error updating deal stage:", error);
    throw error;
  }
}

/**
 * Search for deals in HubSpot (Basic Search)
 */
async function searchDeals(args: any): Promise<any> {
  const { query: searchQuery, limit, after } = args;

  const searchRequest = {
    query: searchQuery,
    limit: limit || 10,
    after: after,
    properties: ["dealname", "pipeline", "dealstage", "amount", "closedate"], // Request specific props
  };

  try {
    const result = await hubspotApi.searchDeals(searchRequest);
    return {
      success: true,
      data: result,
      message: `Found ${result.total || 0} deals matching '${searchQuery}'`,
    };
  } catch (error) {
    console.error("Error searching deals:", error);
    throw error;
  }
}

/**
 * Create a new ticket in HubSpot
 */
async function createTicket(args: any): Promise<any> {
  const {
    subject,
    content,
    pipeline,
    stage,
    priority,
    associatedCompanyId, // Associations handled separately
    associatedContactId, // Associations handled separately
    otherProperties,
  } = args;

  if (!subject || !pipeline || !stage) {
    return {
      success: false,
      error: "Missing required arguments: subject, pipeline, stage",
      errorType: "validation",
    };
  }

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    subject: subject, // Required by API
    hs_pipeline: pipeline, // Required by API
    hs_pipeline_stage: stage, // Required by API
    ...(content && { content: content }),
    ...(priority && { hs_ticket_priority: priority }),
    ...otherProperties, // Directly spread
  };

  try {
    const result = await hubspotApi.createTicket(properties);
    const ticketId = result.id;
    let associationMessages: string[] = [];

    // --- Handle Associations AFTER creating the ticket ---
    if (ticketId && associatedCompanyId) {
      try {
        await associateRecords({
          fromObjectType: "tickets",
          fromObjectId: ticketId,
          toObjectType: "companies",
          toObjectId: associatedCompanyId,
          associationType: "ticket_to_company", // Example type
        });
        associationMessages.push(
          `Associated with company ${associatedCompanyId}.`
        );
      } catch (assocError) {
        console.warn(
          `Failed to associate ticket ${ticketId} with company ${associatedCompanyId}:`,
          assocError
        );
        associationMessages.push(
          `Failed to associate with company ${associatedCompanyId}.`
        );
      }
    }
    if (ticketId && associatedContactId) {
      try {
        await associateRecords({
          fromObjectType: "tickets",
          fromObjectId: ticketId,
          toObjectType: "contacts",
          toObjectId: associatedContactId,
          associationType: "ticket_to_contact", // Example type
        });
        associationMessages.push(
          `Associated with contact ${associatedContactId}.`
        );
      } catch (assocError) {
        console.warn(
          `Failed to associate ticket ${ticketId} with contact ${associatedContactId}:`,
          assocError
        );
        associationMessages.push(
          `Failed to associate with contact ${associatedContactId}.`
        );
      }
    }
    // --- End Association Handling ---

    return {
      success: true,
      data: result,
      message: `Ticket '${subject}' created successfully with ID ${ticketId}. ${associationMessages.join(
        " "
      )}`,
    };
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
}

/**
 * Update a ticket in HubSpot
 */
async function updateTicket(args: any): Promise<any> {
  const {
    ticketId,
    subject,
    content,
    pipeline,
    stage,
    priority,
    otherProperties,
  } = args;

  if (!ticketId) {
    return {
      success: false,
      error: "Missing required argument: ticketId",
      errorType: "validation",
    };
  }

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    ...(subject && { subject: subject }),
    ...(content && { content: content }),
    ...(pipeline && { hs_pipeline: pipeline }), // Allow changing pipeline
    ...(stage && { hs_pipeline_stage: stage }),
    ...(priority && { hs_ticket_priority: priority }),
    ...otherProperties, // Directly spread
  };

  // Ensure properties object is not empty
  if (Object.keys(properties).length === 0) {
    return {
      success: false,
      error: "No properties provided to update.",
      errorType: "validation",
    };
  }

  try {
    const result = await hubspotApi.updateTicket(ticketId, properties);
    return {
      success: true,
      data: result,
      message: `Ticket ${ticketId} updated successfully.`,
    };
  } catch (error) {
    console.error("Error updating ticket:", error);
    throw error;
  }
}

/**
 * Add a note engagement to records in HubSpot (Renamed)
 */
async function addNote(args: any): Promise<any> {
  const {
    content,
    associatedContactIds,
    associatedCompanyIds,
    associatedDealIds,
    associatedTicketIds,
    timestamp,
    ownerId, // Add ownerId if applicable
  } = args;

  if (!content) {
    return {
      success: false,
      error: "Missing required argument: content",
      errorType: "validation",
    };
  }

  const properties: Record<string, any> = {
    hs_note_body: content,
    hs_timestamp: timestamp || new Date().toISOString(), // Default to now if not provided
    ...(ownerId && { hubspot_owner_id: ownerId }),
  };

  const associations: hubspotApi.EngagementAssociations = {};
  if (associatedContactIds) associations.contactIds = associatedContactIds;
  if (associatedCompanyIds) associations.companyIds = associatedCompanyIds;
  if (associatedDealIds) associations.dealIds = associatedDealIds;
  if (associatedTicketIds) associations.ticketIds = associatedTicketIds;

  // Ensure at least one association exists if required by API/logic
  if (Object.values(associations).every((arr) => !arr || arr.length === 0)) {
    // Decide if note needs an association - maybe associate with user? Or throw error?
    console.warn("Adding note without any specific record associations.");
    // Depending on API requirements, you might need to uncomment this:
    // return { success: false, error: "At least one association (Contact, Company, Deal, or Ticket ID) is required to add a note.", errorType: "validation"};
  }

  try {
    const result = await hubspotApi.createEngagement(
      "notes",
      properties,
      associations
    );
    return {
      success: true,
      data: result,
      message: `Note added successfully with ID ${result.id}.`,
    };
  } catch (error) {
    console.error("Error adding note:", error);
    throw error;
  }
}

/**
 * Schedule a meeting engagement associated with records in HubSpot (Renamed)
 */
async function scheduleMeeting(args: any): Promise<any> {
  const {
    title,
    startTime,
    endTime,
    body,
    location,
    meetingOutcome,
    associatedContactIds,
    associatedCompanyIds,
    associatedDealIds,
    associatedTicketIds,
    ownerId, // Add ownerId if applicable
  } = args;

  if (!title || !startTime || !endTime) {
    return {
      success: false,
      error: "Missing required arguments: title, startTime, endTime",
      errorType: "validation",
    };
  }

  const properties: Record<string, any> = {
    hs_meeting_title: title,
    hs_timestamp: new Date(startTime).toISOString(), // API uses hs_timestamp for start time, ensure ISO
    hs_meeting_end_time: new Date(endTime).toISOString(), // Ensure ISO
    ...(body && { hs_meeting_body: body }),
    ...(location && { hs_meeting_location: location }),
    ...(meetingOutcome && { hs_meeting_outcome: meetingOutcome }),
    ...(ownerId && { hubspot_owner_id: ownerId }),
  };

  const associations: hubspotApi.EngagementAssociations = {};
  if (associatedContactIds) associations.contactIds = associatedContactIds;
  if (associatedCompanyIds) associations.companyIds = associatedCompanyIds;
  if (associatedDealIds) associations.dealIds = associatedDealIds;
  if (associatedTicketIds) associations.ticketIds = associatedTicketIds;

  if (Object.values(associations).every((arr) => !arr || arr.length === 0)) {
    console.warn(
      "Scheduling meeting without any specific record associations."
    );
    // Decide if association is required
  }

  try {
    const result = await hubspotApi.createEngagement(
      "meetings",
      properties,
      associations
    );
    return {
      success: true,
      data: result,
      message: `Meeting '${title}' scheduled successfully for ${startTime} with ID ${result.id}.`,
    };
  } catch (error) {
    console.error("Error scheduling meeting:", error);
    throw error;
  }
}

/**
 * Create a task engagement in HubSpot
 */
async function createTask(args: any): Promise<any> {
  const {
    subject,
    body,
    dueDate, // This maps to hs_timestamp in HubSpot API for tasks
    status,
    priority,
    taskType,
    reminderDate, // Needs specific handling for hs_task_reminders
    associatedContactIds,
    associatedCompanyIds,
    associatedDealIds,
    associatedTicketIds,
    ownerId,
  } = args;

  if (!subject) {
    return {
      success: false,
      error: "Missing required argument: subject",
      errorType: "validation",
    };
  }

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    hs_task_subject: subject,
    ...(body && { hs_task_body: body }),
    // hs_timestamp is the DUE DATE for tasks
    ...(dueDate && { hs_timestamp: new Date(dueDate).toISOString() }), // Ensure it's ISO format
    ...(status && { hs_task_status: status }),
    ...(priority && { hs_task_priority: priority }),
    ...(taskType && { hs_task_type: taskType }),
    ...(ownerId && { hubspot_owner_id: ownerId }),
    // Reminder handling is more complex (array object), omitted for simplicity here
  };
  if (reminderDate) {
    console.warn(
      "Task reminders via simple date are not directly supported, requires specific API structure."
    );
    // properties.hs_task_reminders = ???; // Needs array structure like [{ "minutesBefore": 15 }]
  }

  // Prepare associations object for the dedicated createTask function in api.ts
  // The api.ts createTask function expects this structure to handle post-creation associations
  const associations: hubspotApi.EngagementAssociations = {}; // Use the defined type if available in api.ts scope
  if (associatedContactIds) associations.contactIds = associatedContactIds;
  if (associatedCompanyIds) associations.companyIds = associatedCompanyIds;
  if (associatedDealIds) associations.dealIds = associatedDealIds;
  if (associatedTicketIds) associations.ticketIds = associatedTicketIds;
  // ownerId is handled in properties, not typically association for task creation itself

  // A task might not strictly need an association, but often useful
  if (Object.values(associations).every((arr) => !arr || arr.length === 0)) {
    console.warn("Creating task without any specific record associations.");
  }

  try {
    // --- CORRECTED LINE ---
    // Call the dedicated hubspotApi.createTask function from api.ts
    // This function handles creating the task and then associating it.
    const result = await hubspotApi.createTask(
      properties,
      associations // Pass the associations object for post-creation handling
    );
    // --- END CORRECTION ---

    // The result here is the direct response from the initial task creation API call
    return {
      success: true,
      data: result, // Contains the created task ID and properties
      message: `Task '${subject}' created successfully with ID ${result.id}${
        dueDate ? ` (Due: ${dueDate})` : ""
      }. Associations handled separately.`, // Updated message
    };
  } catch (error) {
    console.error("Error creating task:", error);
    throw error; // Let the main executor catch block handle formatting
  }
}

/**
 * Send a one-to-one email logged to a contact through HubSpot
 */
async function sendEmail(args: any): Promise<any> {
  const {
    toContactId,
    fromUserId, // This likely needs to map to a connected inbox or HubSpot user ID
    subject,
    body,
    htmlBody,
    ccContactIds,
    bccContactIds,
    // Potentially needed: sendTime, tracking options etc.
  } = args;

  if (!toContactId || !fromUserId || !subject || !(body || htmlBody)) {
    return {
      success: false,
      error:
        "Missing required arguments: toContactId, fromUserId, subject, and body/htmlBody",
      errorType: "validation",
    };
  }

  // This function is complex via API. Often uses the Single Send API.
  // The implementation below is a conceptual placeholder for *logging* an email engagement.
  // True sending requires the Single Send API or specific mail integration APIs.

  console.warn(
    "sendEmail function implementation logs an email engagement. Actual sending via API requires Single Send API or specific mail integrations and configuration."
  );

  try {
    // 1. Prepare Engagement properties (for logging)
    const properties: Record<string, any> = {
      hs_email_subject: subject,
      hs_email_status: "SENT", // Assume sent for logging purposes
      hs_timestamp: new Date().toISOString(), // Log time (actual send time might differ)
      hs_email_direction: "FORWARD", // Or "EMAIL". Check API docs for outbound 1:1
      hubspot_owner_id: fromUserId, // Log which user initiated it
      ...(htmlBody ? { hs_email_html: htmlBody } : { hs_email_text: body }),
      // Need hs_email_to_email, hs_email_from_email ? API might require these.
      // These would ideally be fetched or provided.
    };

    // 2. Prepare Associations
    const associations: hubspotApi.EngagementAssociations = {
      contactIds: [toContactId], // Primary recipient association
    };
    // The standard engagement associations might not directly support CC/BCC logging
    // in the way the Single Send API does. This logs association to the record.
    if (ccContactIds) associations.ccContactIds = ccContactIds;
    if (bccContactIds) associations.bccContactIds = bccContactIds;

    // 3. Create the Email Engagement record in HubSpot to log it
    const result = await hubspotApi.createEngagement(
      "emails",
      properties,
      associations
    );

    // **NOTE:** ACTUAL SENDING LOGIC would use a different API endpoint, likely the
    // Transactional Email > Single-Send API:
    // https://developers.hubspot.com/docs/api/marketing/transactional-email
    // It requires a different payload structure (`message`, `contactProperties`, etc.)

    return {
      success: true,
      data: result, // Engagement creation result
      message: `Email '${subject}' logged successfully for contact ${toContactId} (Engagement ID: ${result.id}). Actual send capability depends on API configuration.`,
    };
  } catch (error) {
    console.error("Error logging email engagement:", error);
    throw error;
  }
}

/**
 * Create a list of contacts in HubSpot (using V1 API via api.ts)
 * @param args - { name: string, listType: 'STATIC' | 'DYNAMIC', filters?: any[] }
 */
async function createList(args: any): Promise<any> {
  console.log("Executing: createList", args);
  const { name, listType, filters } = args; // Using 'listType', expecting 'filters' for dynamic

  // --- Basic Validation ---
  if (!name || !listType) {
    return {
      success: false,
      error:
        "Missing required arguments: name, listType ('STATIC' or 'DYNAMIC')",
      errorType: "validation",
    };
  }
  if (listType !== "STATIC" && listType !== "DYNAMIC") {
    return {
      success: false,
      error: "Invalid listType. Must be 'STATIC' or 'DYNAMIC'.",
      errorType: "validation",
    };
  }

  // Dynamic lists require filters
  if (listType === "DYNAMIC" && (!filters || !Array.isArray(filters))) {
    // Check if filters is an array
    return {
      success: false,
      error:
        "Dynamic lists require valid filter criteria passed in the 'filters' array argument.",
      errorType: "validation",
    };
  }

  try {
    // --- Construct listData CORRECTLY for V1 API ---
    const listData = {
      name: name,
      dynamic: listType === "DYNAMIC",
      // V1 API expects the key 'filters'. Provide it for dynamic lists, or an empty array for static.
      filters: listType === "DYNAMIC" ? filters : [],
    };

    console.log(
      "[executor.ts] createList - calling HubSpot API with data:",
      listData
    );
    // Call the api.ts function which expects { name, dynamic, filters }
    const result = await hubspotApi.createList(listData); // Pass the correctly structured object

    // Adjust key based on actual V1 API response (often contains 'listId')
    const listId = result?.listId || result?.id; // Handle potential variations

    return {
      success: true,
      data: result,
      message: `${listType} list '${name}' created successfully${
        listId ? ` with ID ${listId}` : ""
      }.`,
    };
  } catch (error) {
    console.error("Error creating list:", error);
    // Handle potential V1 API specific errors if needed
    if (error instanceof HubspotApiError && error.status === 409) {
      error.category = "conflict";
      error.message = `A list with the name '${name}' may already exist.`;
    }
    throw error;
  }
}

/**
 * Get analytics data from HubSpot
 */
async function getAnalytics(args: any): Promise<any> {
  const { dataType, timePeriod, startDate, endDate, filters, breakdowns } =
    args; // using dataType

  if (!dataType) {
    return {
      success: false,
      error: "Missing required argument: dataType",
      errorType: "validation",
    };
  }

  // This function is highly dependent on specific HubSpot Analytics APIs (v3 recommended).
  // The implementation requires mapping 'dataType' and other args to the correct API endpoint and parameters.
  console.warn(
    "getAnalytics function requires specific mapping to HubSpot Analytics API endpoints (e.g., web analytics, email campaigns) and correct payload structure."
  );

  try {
    // --- Placeholder ---
    // 1. Determine the correct HubSpot Analytics API endpoint based on 'dataType'.
    //    (e.g., /cms/v3/analytics/views, /cms/v3/analytics/events, /marketing/v3/emails/analytics)
    // 2. Construct the request payload with date ranges, aggregations (timePeriod), filters, breakdowns etc.
    //    Payload structure varies significantly between endpoints.
    // 3. Call the specific hubspotApi.getAnalyticsData(...) function, potentially needing different
    //    functions per data type (getWebAnalytics, getEmailAnalytics etc.)

    // Example: If hubspotApi had a generic analytics fetcher:
    /*
    const apiArgs = {
        endpointIdentifier: dataType, // Map 'dataType' to API path or identifier
        params: {
            start: startDate,
            end: endDate,
            period: timePeriod, // Map timePeriod to API expected value (e.g., 'daily', 'weekly')
            filter: filters, // Map filters if needed
            breakdown: breakdowns // Map breakdowns if needed
        }
    }
    const result = await hubspotApi.getGenericAnalytics(apiArgs);
    */

    // Using placeholder data since the API call is complex and specific
    const sampleData = {
      dataType,
      timePeriod,
      startDate,
      endDate,
      filters,
      breakdowns,
      // Example result structure (highly dependent on actual API)
      results: [
        { dimensions: ["2025-04-01"], metrics: { views: 100, sessions: 80 } },
        { dimensions: ["2025-04-02"], metrics: { views: 120, sessions: 95 } },
      ],
      total: { views: 220, sessions: 175 },
    };
    console.log("Placeholder for getAnalytics API call with args:", args);

    return {
      success: true,
      message: `Retrieved analytics data for: ${dataType} (Placeholder data)`,
      data: sampleData, // Return data from API call
    };
  } catch (error) {
    console.error("Error getting analytics:", error);
    throw error;
  }
}

/**
 * Enroll contacts (identified by email) into a specific HubSpot workflow.
 * It first looks up contact IDs for the emails, then enrolls the found contacts.
 * @param args - { workflowId: string, emails: string[] }
 */
async function runWorkflow(args: any): Promise<any> {
  const { workflowId, emails } = args; // Using emails as the input from the AI tool

  // --- 1. Input Validation ---
  if (!workflowId || !emails || !Array.isArray(emails) || emails.length === 0) {
    return {
      success: false,
      error:
        "Missing required arguments: workflowId and a non-empty array of emails.",
      errorType: "validation",
    };
  }

  console.log(
    `[executor.ts] runWorkflow: Starting enrollment process for ${emails.length} email(s) into workflow ${workflowId}`
  );

  try {
    // --- 2. Find Contact IDs for the given emails ---
    const contactIdsToEnroll: string[] = [];
    const emailLookupFailures: string[] = [];

    // Use Promise.all to perform lookups concurrently
    const searchPromises = emails.map(async (email) => {
      try {
        // Use Advanced Search (searchObjects)
        const searchPayload = {
          filterGroups: [
            {
              filters: [
                { propertyName: "email", operator: "EQ", value: email },
              ],
            },
          ],
          properties: ["hs_object_id"], // Only need the ID
          limit: 1, // We only need one match per email
        };
        // Use the generic searchObjects function from api.ts
        const searchResult = await hubspotApi.searchObjects(
          "contacts",
          searchPayload
        );

        if (searchResult?.results?.length > 0) {
          contactIdsToEnroll.push(searchResult.results[0].id);
        } else {
          console.warn(
            `[executor.ts] runWorkflow: Contact not found for email: ${email}`
          );
          emailLookupFailures.push(email);
        }
      } catch (searchError) {
        console.error(
          `[executor.ts] runWorkflow: Error searching for contact with email ${email}:`,
          searchError
        );
        // Treat search errors as lookup failures for this email
        emailLookupFailures.push(email);
      }
    });

    await Promise.all(searchPromises); // Wait for all email lookups to complete

    // --- 3. Handle Case Where No Contacts Were Found ---
    if (contactIdsToEnroll.length === 0) {
      return {
        success: false, // Indicate failure to find enrollable contacts
        error: `No existing contacts found for the provided email(s): ${emails.join(
          ", "
        )}. Cannot enroll.`,
        errorType: "not_found",
        details: { failedEmails: emailLookupFailures },
      };
    }

    console.log(
      `[executor.ts] runWorkflow: Found ${
        contactIdsToEnroll.length
      } contact ID(s) to enroll: ${contactIdsToEnroll.join(", ")}`
    );

    // --- 4. Enroll the Found Contact IDs using the Batch-Capable API Function ---
    let enrollmentResult: any = {};
    let enrollmentSuccessCount = 0;
    let enrollmentFailureCount = 0;
    let enrollmentErrorMessage: string | undefined = undefined;

    try {
      console.log(
        `[executor.ts] runWorkflow: Calling enrollObjectsInWorkflow for ${contactIdsToEnroll.length} contacts.`
      );
      // Directly call the modified function from api.ts that handles batch enrollment
      enrollmentResult = await hubspotApi.enrollObjectsInWorkflow(
        workflowId,
        contactIdsToEnroll
        // Optional: Specify objectTypeId if needed, e.g., 'CONTACT'
      );

      // Assuming the API call succeeded if it didn't throw an error.
      // HubSpot's batch enrollment API might return more detailed status in the response body,
      // which could be parsed here if needed for more granular success/failure counts.
      // For now, assume all attempted enrollments were accepted by the API if no error occurred.
      console.log(
        "[executor.ts] runWorkflow: Enrollment API call completed.",
        enrollmentResult
      );
      enrollmentSuccessCount = contactIdsToEnroll.length;
      enrollmentFailureCount = 0;
    } catch (enrollmentError) {
      // The API call itself failed (e.g., 4xx/5xx error)
      console.error(
        "[executor.ts] runWorkflow: Enrollment API call failed:",
        enrollmentError
      );
      enrollmentSuccessCount = 0;
      enrollmentFailureCount = contactIdsToEnroll.length; // Assume all failed if the batch call failed
      enrollmentErrorMessage =
        enrollmentError instanceof Error
          ? enrollmentError.message
          : String(enrollmentError);
      // Re-throw the error to be caught and formatted by the main executeHubspotFunction handler
      throw enrollmentError;
    }

    // --- 5. Construct Final Message and Result ---
    let message = `${enrollmentSuccessCount} contact(s) submitted for enrollment in workflow ${workflowId}.`;
    if (enrollmentFailureCount > 0) {
      // This message now reflects the outcome of the single API call attempt
      message += ` ${enrollmentFailureCount} enrollment(s) failed (API Call Error: ${
        enrollmentErrorMessage || "See details"
      }).`;
    }
    if (emailLookupFailures.length > 0) {
      message += ` Could not find contacts for emails: ${emailLookupFailures.join(
        ", "
      )}.`;
    }

    // Return success indicating the runWorkflow function executed,
    // details contain the outcome specifics.
    return {
      success: true,
      message: message,
      details: {
        successfulEnrollments: enrollmentSuccessCount,
        failedEnrollments: enrollmentFailureCount,
        notFoundEmails: emailLookupFailures,
        attemptedContactIds: contactIdsToEnroll, // Renamed for clarity
        apiResponse: enrollmentResult, // Optionally include raw API response
      },
    };
  } catch (error) {
    // Catch errors from the contact ID lookup phase or re-thrown enrollment errors
    console.error(
      `[executor.ts] Error during workflow enrollment process for workflow ${workflowId}:`,
      error
    );
    // Let the main executor catch block handle final formatting and return structure
    throw error;
  }
}

// ========================================================================== //
//           IMPLEMENTATIONS for NEW FUNCTIONS (Replaced Placeholders)       //
// ========================================================================== //

/**
 * Get a contact by its ID
 * @param args - { contactId: string, properties?: string[] }
 */
async function getContactById(args: any): Promise<any> {
  console.log("Executing: getContactById", args);
  const { contactId, properties } = args;
  if (!contactId) {
    return {
      success: false,
      error: "Missing required argument: contactId",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.getContactById(contactId, properties);
    return {
      success: true,
      message: `Retrieved contact ${contactId}.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error getting contact ${contactId}:`, error);
    throw error;
  }
}

/**
 * Delete (archive) a contact by its ID
 * @param args - { contactId: string }
 */
async function deleteContact(args: any): Promise<any> {
  console.log("Executing: deleteContact", args);
  const { contactId } = args;
  if (!contactId) {
    return {
      success: false,
      error: "Missing required argument: contactId",
      errorType: "validation",
    };
  }
  try {
    await hubspotApi.deleteContact(contactId); // Assumes API function handles archiving
    return {
      success: true,
      message: `Contact ${contactId} archived successfully.`,
    };
  } catch (error) {
    console.error(`Error deleting contact ${contactId}:`, error);
    throw error;
  }
}

/**
 * Get a company by its ID
 * @param args - { companyId: string, properties?: string[] }
 */
async function getCompanyById(args: any): Promise<any> {
  console.log("Executing: getCompanyById", args);
  const { companyId, properties } = args;
  if (!companyId) {
    return {
      success: false,
      error: "Missing required argument: companyId",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.getCompanyById(companyId, properties);
    return {
      success: true,
      message: `Retrieved company ${companyId}.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error getting company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Update an existing company
 * @param args - { companyId: string, name?: string, domain?: string, ...otherProperties }
 */
async function updateCompany(args: any): Promise<any> {
  console.log("Executing: updateCompany", args);
  const { companyId, ...properties } = args; // Destructure ID, rest are properties

  if (!companyId) {
    return {
      success: false,
      error: "Missing required argument: companyId",
      errorType: "validation",
    };
  }
  if (Object.keys(properties).length === 0) {
    return {
      success: false,
      error: "No properties provided to update.",
      errorType: "validation",
    };
  }

  try {
    const result = await hubspotApi.updateCompany(companyId, properties);
    return {
      success: true,
      message: `Company ${companyId} updated successfully.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error updating company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Delete (archive) a company by its ID
 * @param args - { companyId: string }
 */
async function deleteCompany(args: any): Promise<any> {
  console.log("Executing: deleteCompany", args);
  const { companyId } = args;
  if (!companyId) {
    return {
      success: false,
      error: "Missing required argument: companyId",
      errorType: "validation",
    };
  }
  try {
    await hubspotApi.deleteCompany(companyId); // Assumes API function handles archiving
    return {
      success: true,
      message: `Company ${companyId} archived successfully.`,
    };
  } catch (error) {
    console.error(`Error deleting company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Get a deal by its ID
 * @param args - { dealId: string, properties?: string[] }
 */
async function getDealById(args: any): Promise<any> {
  console.log("Executing: getDealById", args);
  const { dealId, properties } = args;
  if (!dealId) {
    return {
      success: false,
      error: "Missing required argument: dealId",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.getDealById(dealId, properties);
    return {
      success: true,
      message: `Retrieved deal ${dealId}.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error getting deal ${dealId}:`, error);
    throw error;
  }
}

/**
 * Update an existing deal (generic properties)
 * @param args - { dealId: string, dealname?: string, amount?: number, ...otherProperties }
 */
async function updateDeal(args: any): Promise<any> {
  console.log("Executing: updateDeal", args);
  const { dealId, ...properties } = args; // Destructure ID, rest are properties

  if (!dealId) {
    return {
      success: false,
      error: "Missing required argument: dealId",
      errorType: "validation",
    };
  }
  if (Object.keys(properties).length === 0) {
    return {
      success: false,
      error: "No properties provided to update.",
      errorType: "validation",
    };
  }

  // Ensure amount is handled correctly (e.g., converted to string if needed)
  if (properties.amount !== undefined && properties.amount !== null) {
    properties.amount = String(properties.amount);
  }

  try {
    const result = await hubspotApi.updateDeal(dealId, properties);
    return {
      success: true,
      message: `Deal ${dealId} updated successfully.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error updating deal ${dealId}:`, error);
    throw error;
  }
}

/**
 * Delete (archive) a deal by its ID
 * @param args - { dealId: string }
 */
async function deleteDeal(args: any): Promise<any> {
  console.log("Executing: deleteDeal", args);
  const { dealId } = args;
  if (!dealId) {
    return {
      success: false,
      error: "Missing required argument: dealId",
      errorType: "validation",
    };
  }
  try {
    await hubspotApi.deleteDeal(dealId); // Assumes API function handles archiving
    return { success: true, message: `Deal ${dealId} archived successfully.` };
  } catch (error) {
    console.error(`Error deleting deal ${dealId}:`, error);
    throw error;
  }
}

/**
 * Get a ticket by its ID
 * @param args - { ticketId: string, properties?: string[] }
 */
async function getTicketById(args: any): Promise<any> {
  console.log("Executing: getTicketById", args);
  const { ticketId, properties } = args;
  if (!ticketId) {
    return {
      success: false,
      error: "Missing required argument: ticketId",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.getTicketById(ticketId, properties);
    return {
      success: true,
      message: `Retrieved ticket ${ticketId}.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error getting ticket ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Delete (archive) a ticket by its ID
 * @param args - { ticketId: string }
 */
async function deleteTicket(args: any): Promise<any> {
  console.log("Executing: deleteTicket", args);
  const { ticketId } = args;
  if (!ticketId) {
    return {
      success: false,
      error: "Missing required argument: ticketId",
      errorType: "validation",
    };
  }
  try {
    await hubspotApi.deleteTicket(ticketId); // Assumes API function handles archiving
    return {
      success: true,
      message: `Ticket ${ticketId} archived successfully.`,
    };
  } catch (error) {
    console.error(`Error deleting ticket ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Perform an advanced search for CRM objects using filters
 * @param args - { objectType: string, filterGroups: any[], properties?: string[], limit?: number, after?: string, sorts?: any[] }
 */
async function advancedSearch(args: any): Promise<any> {
  console.log("Executing: advancedSearch", args);
  const {
    objectType,
    filterGroups,
    properties,
    limit = 10,
    after,
    sorts,
  } = args;

  if (!objectType || !filterGroups) {
    return {
      success: false,
      error: "Missing required arguments: objectType, filterGroups",
      errorType: "validation",
    };
  }

  // Default properties if none are provided, adjust per object type as needed
  let defaultProps: string[] = [];
  switch (objectType.toLowerCase()) {
    case "contacts":
      defaultProps = ["firstname", "lastname", "email"];
      break;
    case "companies":
      defaultProps = ["name", "domain"];
      break;
    case "deals":
      defaultProps = ["dealname", "dealstage", "amount"];
      break;
    case "tickets":
      defaultProps = ["subject", "hs_pipeline_stage"];
      break;
    // Add cases for other object types if needed
  }

  const searchPayload = {
    filterGroups: filterGroups,
    properties: properties || defaultProps,
    limit: limit,
    after: after,
    sorts: sorts || [{ propertyName: "createdate", direction: "DESCENDING" }], // Default sort
  };

  try {
    // Use the generic searchObjects function assumed to exist in api.ts
    const result = await hubspotApi.searchObjects(objectType, searchPayload);
    return {
      success: true,
      message: `Advanced search completed for ${objectType}. Found ${
        result.total || 0
      } results.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error performing advanced search for ${objectType}:`, error);
    throw error;
  }
}

/**
 * Associate two records
 * @param args - { fromObjectType: string, fromObjectId: string, toObjectType: string, toObjectId: string, associationType: string | number }
 * Note: associationType might be a predefined string label ("contact_to_company") or a numeric ID pair ("0-1")
 */
async function associateRecords(args: any): Promise<any> {
  console.log("Executing: associateRecords", args);
  const {
    fromObjectType,
    fromObjectId,
    toObjectType,
    toObjectId,
    associationType, // This is crucial, could be a label or ID
  } = args;

  if (
    !fromObjectType ||
    !fromObjectId ||
    !toObjectType ||
    !toObjectId ||
    !associationType
  ) {
    return {
      success: false,
      error:
        "Missing required arguments: fromObjectType, fromObjectId, toObjectType, toObjectId, associationType",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.associateRecords handles mapping the string type/label to the correct API format if needed
    const result = await hubspotApi.associateRecords(
      fromObjectType,
      fromObjectId,
      toObjectType,
      toObjectId,
      associationType // Pass the type/label directly
    );
    return {
      success: true,
      message: `Successfully associated ${fromObjectType} ${fromObjectId} with ${toObjectType} ${toObjectId} (Type: ${associationType}).`,
      data: result, // API might return the updated record or association details
    };
  } catch (error) {
    console.error(
      `Error associating ${fromObjectType} ${fromObjectId} with ${toObjectType} ${toObjectId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get associations for a record
 * @param args - { objectType: string, objectId: string, associatedObjectType: string, after?: string, limit?: number }
 */
async function getAssociations(args: any): Promise<any> {
  console.log("Executing: getAssociations", args);
  const {
    objectType,
    objectId,
    associatedObjectType,
    after,
    limit = 100, // Default limit, adjust as needed
  } = args;

  if (!objectType || !objectId || !associatedObjectType) {
    return {
      success: false,
      error:
        "Missing required arguments: objectType, objectId, associatedObjectType",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.getAssociations handles the API call
    const result = await hubspotApi.getAssociations(
      objectType,
      objectId,
      associatedObjectType,
      after,
      limit
    );
    return {
      success: true,
      message: `Retrieved associations between ${objectType} ${objectId} and ${associatedObjectType}. Found ${
        result?.results?.length || 0
      } associations.`,
      data: result, // API likely returns { results: [{ id, type }], paging: { next: { after } } }
    };
  } catch (error) {
    console.error(
      `Error getting associations for ${objectType} ${objectId} to ${associatedObjectType}:`,
      error
    );
    throw error;
  }
}

/**
 * Log a call engagement
 * @param args - { subject?: string, body?: string, timestamp?: string, durationMilliseconds?: number, status: string ('COMPLETED', 'BUSY' etc.), ownerId?: string, associatedContactIds?: string[], ... }
 */
async function logCall(args: any): Promise<any> {
  console.log("Executing: logCall", args);
  const {
    subject, // Recommended: hs_call_title
    body, // hs_call_body
    timestamp, // hs_timestamp (when the call occurred)
    durationMilliseconds, // hs_call_duration
    status, // hs_call_status (REQUIRED - e.g., COMPLETED, NO_ANSWER)
    ownerId, // hubspot_owner_id
    associatedContactIds,
    associatedCompanyIds,
    associatedDealIds,
    associatedTicketIds,
    // Potentially hs_call_disposition (REQUIRED if logging completed call)
    disposition, // hs_call_disposition
  } = args;

  if (!status) {
    return {
      success: false,
      error: "Missing required argument: status (e.g., 'COMPLETED')",
      errorType: "validation",
    };
  }
  if (status === "COMPLETED" && !disposition) {
    return {
      success: false,
      error:
        "Missing required argument: disposition (when status is 'COMPLETED')",
      errorType: "validation",
    };
  }

  const properties: Record<string, any> = {
    hs_timestamp: timestamp || new Date().toISOString(),
    hs_call_status: status,
    ...(subject && { hs_call_title: subject }), // Map to HubSpot property names
    ...(body && { hs_call_body: body }),
    ...(durationMilliseconds && { hs_call_duration: durationMilliseconds }),
    ...(ownerId && { hubspot_owner_id: ownerId }),
    ...(disposition && { hs_call_disposition: disposition }),
  };

  const associations: hubspotApi.EngagementAssociations = {};
  if (associatedContactIds) associations.contactIds = associatedContactIds;
  if (associatedCompanyIds) associations.companyIds = associatedCompanyIds;
  if (associatedDealIds) associations.dealIds = associatedDealIds;
  if (associatedTicketIds) associations.ticketIds = associatedTicketIds;

  if (Object.values(associations).every((arr) => !arr || arr.length === 0)) {
    console.warn("Logging call without specific record associations.");
  }

  try {
    const result = await hubspotApi.createEngagement(
      "calls",
      properties,
      associations
    );
    return {
      success: true,
      message: `Call logged successfully with ID ${result.id}.`,
      data: result,
    };
  } catch (error) {
    console.error("Error logging call:", error);
    throw error;
  }
}

/**
 * Update an existing task engagement
 * @param args - { taskId: string, subject?: string, body?: string, status?: string, ...otherProperties }
 */
async function updateTask(args: any): Promise<any> {
  console.log("Executing: updateTask", args);
  const {
    taskId,
    subject,
    body,
    status,
    dueDate,
    priority,
    ownerId,
    ...otherProperties
  } = args; // Destructure known task properties

  if (!taskId) {
    return {
      success: false,
      error: "Missing required argument: taskId",
      errorType: "validation",
    };
  }

  // Map friendly names to HubSpot internal names
  const properties: Record<string, any> = {
    ...(subject && { hs_task_subject: subject }),
    ...(body && { hs_task_body: body }),
    ...(status && { hs_task_status: status }),
    ...(dueDate && { hs_timestamp: new Date(dueDate).toISOString() }), // Due date maps to hs_timestamp
    ...(priority && { hs_task_priority: priority }),
    ...(ownerId && { hubspot_owner_id: ownerId }),
    ...otherProperties, // Pass through any other properties provided
  };

  if (Object.keys(properties).length === 0) {
    return {
      success: false,
      error: "No properties provided to update.",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.updateEngagement exists and takes type, id, properties
    const result = await hubspotApi.updateEngagement(
      "tasks",
      taskId,
      properties
    );
    return {
      success: true,
      message: `Task ${taskId} updated successfully.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Delete an engagement (Note, Task, Call, Meeting, Email)
 * @param args - { engagementId: string, engagementType: string ('notes', 'tasks', 'calls', 'meetings', 'emails') }
 */
async function deleteEngagement(args: any): Promise<any> {
  console.log("Executing: deleteEngagement", args);
  const { engagementId, engagementType } = args;

  if (!engagementId || !engagementType) {
    return {
      success: false,
      error: "Missing required arguments: engagementId, engagementType",
      errorType: "validation",
    };
  }

  // Optional: Validate engagementType is one of the allowed values
  const validTypes = ["notes", "tasks", "calls", "meetings", "emails"];
  if (!validTypes.includes(engagementType.toLowerCase())) {
    return {
      success: false,
      error: `Invalid engagementType: ${engagementType}. Must be one of: ${validTypes.join(
        ", "
      )}`,
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.deleteEngagement exists
    await hubspotApi.deleteEngagement(engagementType, engagementId);
    return {
      success: true,
      message: `Engagement (${engagementType}) ${engagementId} deleted successfully.`,
    };
  } catch (error) {
    console.error(
      `Error deleting engagement ${engagementType} ${engagementId}:`,
      error
    );
    throw error;
  }
}

/**
 * Search for engagements using filters
 * @param args - { filterGroups: any[], properties?: string[], limit?: number, after?: string, sorts?: any[] }
 * Note: Searching engagements might have different API endpoint/structure than CRM objects.
 */
async function searchEngagements(args: any): Promise<any> {
  console.log("Executing: searchEngagements", args);
  const { filterGroups, properties, limit = 10, after, sorts } = args;

  if (!filterGroups) {
    return {
      success: false,
      error: "Missing required argument: filterGroups",
      errorType: "validation",
    };
  }

  // Default properties for engagements (adjust as needed)
  const defaultProps = [
    "hs_engagement_type",
    "hs_timestamp",
    "hubspot_owner_id",
    // Add type-specific properties if useful (e.g., hs_task_subject, hs_note_body)
  ];

  const searchPayload = {
    filterGroups: filterGroups,
    properties: properties || defaultProps,
    limit: limit,
    after: after,
    sorts: sorts || [{ propertyName: "hs_timestamp", direction: "DESCENDING" }], // Default sort by creation/activity time
  };

  try {
    // Assuming hubspotApi.searchEngagements exists and handles the specific API call
    const result = await hubspotApi.searchEngagements(searchPayload);
    return {
      success: true,
      message: `Engagement search completed. Found ${
        result.total || 0
      } results.`,
      data: result,
    };
  } catch (error) {
    console.error("Error searching engagements:", error);
    throw error;
  }
}

/**
 * Add contacts to a static list
 * @param args - { listId: number | string, contactIds: string[] }
 */
async function addContactsToList(args: any): Promise<any> {
  console.log("Executing: addContactsToList", args);
  const { listId, contactIds } = args;

  if (
    !listId ||
    !contactIds ||
    !Array.isArray(contactIds) ||
    contactIds.length === 0
  ) {
    return {
      success: false,
      error:
        "Missing required arguments: listId and a non-empty array of contactIds",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.addContactsToList takes listId and an array of contact IDs
    await hubspotApi.addContactsToList(listId, contactIds);
    return {
      success: true,
      message: `Successfully added ${contactIds.length} contact(s) to list ${listId}.`,
    };
  } catch (error) {
    console.error(`Error adding contacts to list ${listId}:`, error);
    throw error;
  }
}

/**
 * Remove contacts from a static list
 * @param args - { listId: number | string, contactIds: string[] }
 */
async function removeContactsFromList(args: any): Promise<any> {
  console.log("Executing: removeContactsFromList", args);
  const { listId, contactIds } = args;

  if (
    !listId ||
    !contactIds ||
    !Array.isArray(contactIds) ||
    contactIds.length === 0
  ) {
    return {
      success: false,
      error:
        "Missing required arguments: listId and a non-empty array of contactIds",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.removeContactsFromList takes listId and an array of contact IDs
    await hubspotApi.removeContactsFromList(listId, contactIds);
    return {
      success: true,
      message: `Successfully removed ${contactIds.length} contact(s) from list ${listId}.`,
    };
  } catch (error) {
    console.error(`Error removing contacts from list ${listId}:`, error);
    throw error;
  }
}

/**
 * Get members (contacts) of a list
 * @param args - { listId: number | string, limit?: number, after?: string (or offset), includeProperties?: string[] }
 */
async function getListMembers(args: any): Promise<any> {
  console.log("Executing: getListMembers", args);
  const { listId, limit = 100, after, includeProperties } = args; // Use 'after' for V3 API paging

  if (!listId) {
    return {
      success: false,
      error: "Missing required argument: listId",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.getListMembers takes listId and optional params
    // Note: HubSpot API v3 uses 'after' for paging, v1 used 'offset'. Adapt hubspotApi function accordingly.
    const result = await hubspotApi.getListMembers(
      listId,
      limit,
      after, // Pass 'after' for paging
      includeProperties
    );
    return {
      success: true,
      message: `Retrieved members for list ${listId}. Found ${
        result?.contacts?.length || 0
      } members in this page.`, // Adjust based on actual response structure ('contacts' or 'vids')
      data: result, // Structure like { contacts: [...], paging: { next: { after } }, has-more: boolean }
    };
  } catch (error) {
    console.error(`Error getting members for list ${listId}:`, error);
    throw error;
  }
}

/**
 * Delete a list
 * @param args - { listId: number | string }
 */
async function deleteList(args: any): Promise<any> {
  console.log("Executing: deleteList", args);
  const { listId } = args;

  if (!listId) {
    return {
      success: false,
      error: "Missing required argument: listId",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.deleteList takes listId
    await hubspotApi.deleteList(listId);
    return {
      success: true,
      message: `List ${listId} deleted successfully.`,
    };
  } catch (error) {
    console.error(`Error deleting list ${listId}:`, error);
    throw error;
  }
}

/**
 * Submit data to a HubSpot form
 * @param args - { formGuid: string, fields: { name: string, value: any }[], context?: { pageUri?: string, pageName?: string, hutk?: string } }
 */
async function submitForm(args: any): Promise<any> {
  console.log("Executing: submitForm", args);
  const { formGuid, fields, context } = args;

  if (!formGuid || !fields || !Array.isArray(fields) || fields.length === 0) {
    return {
      success: false,
      error:
        "Missing required arguments: formGuid and a non-empty array of fields",
      errorType: "validation",
    };
  }

  // Optional: Validate fields structure if needed
  if (
    !fields.every(
      (f) => typeof f === "object" && f !== null && "name" in f && "value" in f
    )
  ) {
    return {
      success: false,
      error:
        "Invalid fields structure. Each field must be an object with 'name' and 'value'.",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.submitForm takes formGuid, fields array, and optional context object
    const result = await hubspotApi.submitForm(formGuid, fields, context);
    // Successful submissions often return 200 OK or 204 No Content, or sometimes an inline thank you message.
    let message = `Form ${formGuid} submitted successfully.`;
    if (result && result.inlineMessage) {
      // Check if API returns specific message
      message += ` Response: ${result.inlineMessage}`;
    }
    return {
      success: true,
      message: message,
      data: result, // Include response data if any (like redirect URL or message)
    };
  } catch (error) {
    // Handle specific form submission errors (e.g., validation errors on fields)
    console.error(`Error submitting form ${formGuid}:`, error);
    if (error instanceof HubspotApiError && error.status === 400) {
      // It's likely a validation error from HubSpot
      error.category = "validation"; // Re-categorize for better frontend handling
      error.message = `Form validation failed: ${error.message}`; // Enhance message
    } else if (error instanceof HubspotApiError && error.status === 404) {
      error.category = "not_found";
      error.message = `Form with GUID ${formGuid} not found.`;
    }
    throw error; // Propagate the potentially modified error
  }
}

/**
 * Get properties for a specific object type
 * @param args - { objectType: string, archived?: boolean }
 */
async function getProperties(args: any): Promise<any> {
  console.log("Executing: getProperties", args);
  const { objectType, archived = false } = args; // Default to not including archived

  if (!objectType) {
    return {
      success: false,
      error: "Missing required argument: objectType",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.getProperties takes objectType and optional archived flag
    const result = await hubspotApi.getProperties(objectType, archived);
    return {
      success: true,
      message: `Retrieved ${
        result?.length || 0
      } properties for object type ${objectType}.`,
      data: result, // API likely returns an array of property definitions
    };
  } catch (error) {
    console.error(`Error getting properties for ${objectType}:`, error);
    throw error;
  }
}

/**
 * Create a new custom property
 * @param args - { objectType: string, name: string, label: string, groupName: string, type: string ('string', 'number', 'date', 'enumeration' etc.), fieldType: string ('text', 'select', 'radio' etc.), options?: any[], ...otherDefinitionProps }
 */
async function createProperty(args: any): Promise<any> {
  console.log("Executing: createProperty", args);
  const {
    objectType,
    name,
    label,
    groupName,
    type,
    fieldType,
    // Extract other relevant definition properties from args
    ...propertyDefinitionArgs
  } = args;

  // Core requirements for creating a property
  if (!objectType || !name || !label || !groupName || !type || !fieldType) {
    return {
      success: false,
      error:
        "Missing required arguments: objectType, name, label, groupName, type, fieldType",
      errorType: "validation",
    };
  }

  // Construct the property definition object for the API
  const propertyDefinition = {
    name,
    label,
    groupName, // Internal name of the property group
    type, // Data type
    fieldType, // How it appears in UI
    ...propertyDefinitionArgs, // Include options, description, displayOrder etc. from args
  };

  // Validate options for enumeration types
  if (
    (type === "enumeration" || type === "bool") &&
    (!propertyDefinition.options ||
      !Array.isArray(propertyDefinition.options) ||
      propertyDefinition.options.length === 0)
  ) {
    return {
      success: false,
      error: `Properties of type '${type}' require a non-empty 'options' array.`,
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.createProperty takes objectType and the definition object
    const result = await hubspotApi.createProperty(
      objectType,
      propertyDefinition
    );
    return {
      success: true,
      message: `Custom property '${label}' (${name}) created successfully for ${objectType}.`,
      data: result, // API returns the full definition of the created property
    };
  } catch (error) {
    console.error(
      `Error creating property '${name}' for ${objectType}:`,
      error
    );
    // Handle potential naming conflicts (409 error)
    if (error instanceof HubspotApiError && error.status === 409) {
      error.category = "conflict";
      error.message = `A property with the name '${name}' already exists for ${objectType}.`;
    }
    throw error;
  }
}

// --- Batch Implementations ---

/**
 * Batch create contacts
 * @param args - { inputs: { properties: Record<string, any> }[] }
 */
async function batchCreateContacts(args: any): Promise<any> {
  console.log("Executing: batchCreateContacts", args);
  const { inputs } = args;

  if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      error: "Missing required argument: inputs (non-empty array)",
      errorType: "validation",
    };
  }
  // Optional: Add validation for the structure of each item in inputs

  try {
    const result = await hubspotApi.batchCreateContacts(inputs);
    // Batch API results often have 'results', 'status', 'errors' fields
    const createdCount = result?.results?.length || 0; // Adjust based on actual API response
    const status = result?.status || "UNKNOWN";
    return {
      success: status === "COMPLETE", // Consider it success if the batch job completed, even with errors
      message: `Batch create contacts request completed with status: ${status}. Processed ${createdCount} records.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch create contacts:", error);
    throw error;
  }
}

/**
 * Batch update contacts
 * @param args - { inputs: { id: string, properties: Record<string, any> }[] }
 */
async function batchUpdateContacts(args: any): Promise<any> {
  console.log("Executing: batchUpdateContacts", args);
  const { inputs } = args;

  if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      error: "Missing required argument: inputs (non-empty array)",
      errorType: "validation",
    };
  }
  // Optional: Add validation for the structure of each item in inputs (must have 'id' and 'properties')

  try {
    const result = await hubspotApi.batchUpdateContacts(inputs);
    const updatedCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status === "COMPLETE",
      message: `Batch update contacts request completed with status: ${status}. Processed ${updatedCount} records.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch update contacts:", error);
    throw error;
  }
}

/**
 * Batch read contacts by ID
 * @param args - { ids: string[], properties?: string[] }
 */
async function batchReadContacts(args: any): Promise<any> {
  console.log("Executing: batchReadContacts", args);
  const { ids, properties } = args;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      error: "Missing required argument: ids (non-empty array)",
      errorType: "validation",
    };
  }

  try {
    const result = await hubspotApi.batchReadContacts(ids, properties);
    const foundCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN"; // May or may not have status
    return {
      success: status !== "FAILED", // Adjust logic based on API response
      message: `Batch read contacts request completed. Found ${foundCount} of ${ids.length} requested contacts.`,
      data: result, // Contains 'results' array with contact data
    };
  } catch (error) {
    console.error("Error in batch read contacts:", error);
    throw error;
  }
}

/**
 * Batch archive (delete) contacts by ID
 * @param args - { ids: string[] }
 */
async function batchArchiveContacts(args: any): Promise<any> {
  console.log("Executing: batchArchiveContacts", args);
  const { ids } = args;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      error: "Missing required argument: ids (non-empty array)",
      errorType: "validation",
    };
  }

  try {
    // Batch archive usually returns 204 No Content on success
    await hubspotApi.batchArchiveContacts(ids);
    return {
      success: true,
      message: `Batch archive contacts request completed successfully for ${ids.length} IDs.`,
    };
  } catch (error) {
    console.error("Error in batch archive contacts:", error);
    throw error;
  }
}

/**
 * Batch create companies
 * @param args - { inputs: { properties: Record<string, any> }[] }
 */
async function batchCreateCompanies(args: any): Promise<any> {
  console.log("Executing: batchCreateCompanies", args);
  const { inputs } = args;

  if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      error: "Missing required argument: inputs (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchCreateCompanies(inputs);
    const createdCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status === "COMPLETE",
      message: `Batch create companies request completed with status: ${status}. Processed ${createdCount} records.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch create companies:", error);
    throw error;
  }
}

/**
 * Batch update companies
 * @param args - { inputs: { id: string, properties: Record<string, any> }[] }
 */
async function batchUpdateCompanies(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchUpdateCompanies", args);
  const { inputs } = args;

  if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      error: "Missing required argument: inputs (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchUpdateCompanies(inputs);
    const updatedCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status === "COMPLETE",
      message: `Batch update companies request completed with status: ${status}. Processed ${updatedCount} records.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch update companies:", error);
    throw error;
  }
}

/**
 * Batch read companies by ID
 * @param args - { ids: string[], properties?: string[] }
 */
async function batchReadCompanies(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchReadCompanies", args);
  const { ids, properties } = args;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      error: "Missing required argument: ids (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchReadCompanies(ids, properties);
    const foundCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status !== "FAILED",
      message: `Batch read companies request completed. Found ${foundCount} of ${ids.length} requested companies.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch read companies:", error);
    throw error;
  }
}

/**
 * Batch archive (delete) companies by ID
 * @param args - { ids: string[] }
 */
async function batchArchiveCompanies(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchArchiveCompanies", args);
  const { ids } = args;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      error: "Missing required argument: ids (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    await hubspotApi.batchArchiveCompanies(ids);
    return {
      success: true,
      message: `Batch archive companies request completed successfully for ${ids.length} IDs.`,
    };
  } catch (error) {
    console.error("Error in batch archive companies:", error);
    throw error;
  }
}

/**
 * Batch create deals
 * @param args - { inputs: { properties: Record<string, any> }[] }
 */
async function batchCreateDeals(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchCreateDeals", args);
  const { inputs } = args;

  if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      error: "Missing required argument: inputs (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchCreateDeals(inputs);
    const createdCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status === "COMPLETE",
      message: `Batch create deals request completed with status: ${status}. Processed ${createdCount} records.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch create deals:", error);
    throw error;
  }
}

/**
 * Batch update deals
 * @param args - { inputs: { id: string, properties: Record<string, any> }[] }
 */
async function batchUpdateDeals(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchUpdateDeals", args);
  const { inputs } = args;

  if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      error: "Missing required argument: inputs (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchUpdateDeals(inputs);
    const updatedCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status === "COMPLETE",
      message: `Batch update deals request completed with status: ${status}. Processed ${updatedCount} records.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch update deals:", error);
    throw error;
  }
}

/**
 * Batch read deals by ID
 * @param args - { ids: string[], properties?: string[] }
 */
async function batchReadDeals(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchReadDeals", args);
  const { ids, properties } = args;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      error: "Missing required argument: ids (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchReadDeals(ids, properties);
    const foundCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status !== "FAILED",
      message: `Batch read deals request completed. Found ${foundCount} of ${ids.length} requested deals.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch read deals:", error);
    throw error;
  }
}

/**
 * Batch archive (delete) deals by ID
 * @param args - { ids: string[] }
 */
async function batchArchiveDeals(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchArchiveDeals", args);
  const { ids } = args;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      error: "Missing required argument: ids (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    await hubspotApi.batchArchiveDeals(ids);
    return {
      success: true,
      message: `Batch archive deals request completed successfully for ${ids.length} IDs.`,
    };
  } catch (error) {
    console.error("Error in batch archive deals:", error);
    throw error;
  }
}

/**
 * Batch create tickets
 * @param args - { inputs: { properties: Record<string, any> }[] }
 */
async function batchCreateTickets(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchCreateTickets", args);
  const { inputs } = args;

  if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      error: "Missing required argument: inputs (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchCreateTickets(inputs);
    const createdCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status === "COMPLETE",
      message: `Batch create tickets request completed with status: ${status}. Processed ${createdCount} records.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch create tickets:", error);
    throw error;
  }
}

/**
 * Batch update tickets
 * @param args - { inputs: { id: string, properties: Record<string, any> }[] }
 */
async function batchUpdateTickets(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchUpdateTickets", args);
  const { inputs } = args;

  if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      error: "Missing required argument: inputs (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchUpdateTickets(inputs);
    const updatedCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status === "COMPLETE",
      message: `Batch update tickets request completed with status: ${status}. Processed ${updatedCount} records.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch update tickets:", error);
    throw error;
  }
}

/**
 * Batch read tickets by ID
 * @param args - { ids: string[], properties?: string[] }
 */
async function batchReadTickets(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchReadTickets", args);
  const { ids, properties } = args;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      error: "Missing required argument: ids (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    const result = await hubspotApi.batchReadTickets(ids, properties);
    const foundCount = result?.results?.length || 0;
    const status = result?.status || "UNKNOWN";
    return {
      success: status !== "FAILED",
      message: `Batch read tickets request completed. Found ${foundCount} of ${ids.length} requested tickets.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in batch read tickets:", error);
    throw error;
  }
}

/**
 * Batch archive (delete) tickets by ID
 * @param args - { ids: string[] }
 */
async function batchArchiveTickets(args: Record<string, any>): Promise<any> {
  console.log("Executing: batchArchiveTickets", args);
  const { ids } = args;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      error: "Missing required argument: ids (non-empty array)",
      errorType: "validation",
    };
  }
  try {
    await hubspotApi.batchArchiveTickets(ids);
    return {
      success: true,
      message: `Batch archive tickets request completed successfully for ${ids.length} IDs.`,
    };
  } catch (error) {
    console.error("Error in batch archive tickets:", error);
    throw error;
  }
}

/**
 * Batch associate multiple records to a single source record.
 * Used within createDeal/createTicket.
 * @param args - { fromObjectType: string, fromObjectId: string, toObjectType: string, toObjectIds: string[], associationType: string | number }
 */
async function batchAssociateRecords(args: Record<string, any>): Promise<any> {
  console.log(
    "Executing: batchAssociateRecords (helper for create flows)",
    args
  );
  const {
    fromObjectType,
    fromObjectId,
    toObjectType,
    toObjectIds,
    associationType,
  } = args;

  if (
    !fromObjectType ||
    !fromObjectId ||
    !toObjectType ||
    !toObjectIds ||
    !Array.isArray(toObjectIds) ||
    toObjectIds.length === 0 ||
    !associationType
  ) {
    return {
      success: false,
      error:
        "Missing required arguments for batch association: fromObjectType, fromObjectId, toObjectType, toObjectIds (array), associationType",
      errorType: "validation",
    };
  }

  try {
    // Assuming hubspotApi.batchAssociateRecords exists and handles mapping the associationType if needed
    // It likely takes the source object details and an array of target IDs
    const result = await hubspotApi.batchAssociateRecords(
      fromObjectType,
      fromObjectId,
      toObjectType,
      toObjectIds,
      associationType
    );

    // Batch association API might return detailed results or just success/failure
    return {
      success: true, // Assume success if no error is thrown; adjust based on API response
      message: `Batch association requested for ${fromObjectType} ${fromObjectId} to ${toObjectIds.length} ${toObjectType}(s) with type ${associationType}.`,
      data: result, // Include API response if available
    };
  } catch (error) {
    console.error(
      `Error in batch associating ${fromObjectType} ${fromObjectId} to ${toObjectType}s:`,
      error
    );
    throw error; // Propagate the error
  }
}

/**
 * Find contacts in HubSpot by name or email
 * @param args - { name?: string, email?: string, limit?: number, after?: string }
 */
async function findContact(args: any): Promise<any> {
  console.log("Executing: findContact", args);
  const { name, email, limit = 10, after } = args;

  if (!name && !email) {
    return {
      success: false,
      error:
        "Missing required arguments: either name or email must be provided.",
      errorType: "validation",
    };
  }

  const filterGroups: any[] = [];

  if (email) {
    filterGroups.push({
      filters: [{ propertyName: "email", operator: "EQ", value: email }],
    });
  }

  if (name) {
    // Assuming a simple search by name might involve searching across name properties
    // This is a basic implementation; a more robust search might use multiple filters or a dedicated search endpoint
    filterGroups.push({
      filters: [
        { propertyName: "firstname", operator: "CONTAINS_TOKEN", value: name },
        { propertyName: "lastname", operator: "CONTAINS_TOKEN", value: name },
      ],
    });
  }

  const searchPayload = {
    filterGroups: filterGroups,
    properties: ["firstname", "lastname", "email", "phone", "company"], // Default properties to return
    limit: limit,
    after: after,
    sorts: [{ propertyName: "createdate", direction: "DESCENDING" }], // Default sort
  };

  try {
    // Use the generic searchObjects function for contacts
    const result = await hubspotApi.searchObjects("contacts", searchPayload);
    return {
      success: true,
      message: `Found ${result.total || 0} contacts matching the criteria.`,
      data: result,
    };
  } catch (error) {
    console.error(`Error finding contacts by name/email:`, error);
    throw error;
  }
}
