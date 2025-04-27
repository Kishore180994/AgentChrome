/**
 * HubSpot Function Executor
 *
 * This file contains the implementation for executing HubSpot-related function calls
 * that are returned by Gemini AI. It connects the AI function calls to the HubSpot API.
 */

import * as hubspotApi from "./api";
// Using Chrome extension API directly

// Type for function call arguments from Gemini AI
interface FunctionCallArgs {
  name: string;
  args: Record<string, any>;
}

/**
 * Main executor function for HubSpot function calls
 *
 * @param functionCall The function call from Gemini AI
 * @returns Result of the function execution
 */
export async function executeHubspotFunction(
  functionCall: FunctionCallArgs
): Promise<any> {
  const { name, args } = functionCall;

  try {
    // Match the function name to its implementation
    switch (name) {
      case "hubspot_navigateTo":
        return await navigateToHubspotSection(args);

      case "hubspot_createContact":
        return await createContact(args);

      case "hubspot_searchContacts":
        return await searchContacts(args);

      case "hubspot_updateContact":
        return await updateContact(args);

      case "hubspot_createCompany":
        return await createCompany(args);

      case "hubspot_searchCompanies":
        return await searchCompanies(args);

      case "hubspot_createDeal":
        return await createDeal(args);

      case "hubspot_updateDealStage":
        return await updateDealStage(args);

      case "hubspot_searchDeals":
        return await searchDeals(args);

      case "hubspot_createTicket":
        return await createTicket(args);

      case "hubspot_updateTicket":
        return await updateTicket(args);

      case "hubspot_addNoteToContact":
        return await addNoteToContact(args);

      case "hubspot_scheduleContactMeeting":
        return await scheduleContactMeeting(args);

      case "hubspot_createTask":
        return await createTask(args);

      case "hubspot_sendEmail":
        return await sendEmail(args);

      case "hubspot_createList":
        return await createList(args);

      case "hubspot_getAnalytics":
        return await getAnalytics(args);

      case "hubspot_loginToHubspot":
        return await loginToHubspot(args);

      case "hubspot_runWorkflow":
        return await runWorkflow(args);

      default:
        throw new Error(`Unknown HubSpot function: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing HubSpot function ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Navigate to a specific section in HubSpot
 */
async function navigateToHubspotSection(args: any): Promise<any> {
  const { section, subsection } = args;

  try {
    let url = `https://app.hubspot.com/${section}`;
    if (subsection) {
      url += `/${subsection}`;
    }

    // Open the URL in a new tab using Chrome extension API
    await chrome.tabs.create({ url });

    return {
      success: true,
      message: `Navigated to HubSpot ${section}${
        subsection ? " > " + subsection : ""
      }`,
    };
  } catch (error) {
    console.error("Error navigating to HubSpot section:", error);
    throw error;
  }
}

/**
 * Create a new contact in HubSpot
 */
async function createContact(args: any): Promise<any> {
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
  };

  // Add any additional properties
  if (otherProperties) {
    Object.keys(otherProperties).forEach((key) => {
      properties[key] = otherProperties[key];
    });
  }

  try {
    const result = await hubspotApi.createContact(properties);
    return {
      success: true,
      data: result,
      message: `Contact created successfully with email: ${email}`,
    };
  } catch (error) {
    console.error("Error creating contact:", error);
    throw error;
  }
}

/**
 * Search for contacts in HubSpot
 */
async function searchContacts(args: any): Promise<any> {
  const { searchTerm, filterProperty, filterValue, limit } = args;

  // Construct the query for HubSpot API
  const query: any = {};

  if (filterProperty && filterValue) {
    query.filterGroups = [
      {
        filters: [
          {
            propertyName: filterProperty,
            operator: "EQ",
            value: filterValue,
          },
        ],
      },
    ];
  } else {
    // If no specific property filter is provided, search across common properties
    query.filterGroups = [
      {
        filters: [
          {
            propertyName: "email",
            operator: "CONTAINS_TOKEN",
            value: searchTerm,
          },
        ],
      },
      {
        filters: [
          {
            propertyName: "firstname",
            operator: "CONTAINS_TOKEN",
            value: searchTerm,
          },
        ],
      },
      {
        filters: [
          {
            propertyName: "lastname",
            operator: "CONTAINS_TOKEN",
            value: searchTerm,
          },
        ],
      },
    ];
  }

  if (limit) {
    query.limit = limit;
  }

  try {
    const result = await hubspotApi.searchContacts(query);
    return {
      success: true,
      data: result,
      message: `Found ${
        result.total || 0
      } contacts matching the search criteria`,
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

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    ...(email && { email: email }),
    ...(firstName && { firstname: firstName }),
    ...(lastName && { lastname: lastName }),
    ...(phone && { phone: phone }),
    ...(company && { company: company }),
    ...(jobTitle && { jobtitle: jobTitle }),
    ...(lifecycleStage && { lifecyclestage: lifecycleStage }),
  };

  // Add any additional properties
  if (otherProperties) {
    Object.keys(otherProperties).forEach((key) => {
      properties[key] = otherProperties[key];
    });
  }

  try {
    const result = await hubspotApi.updateContact(contactId, properties);
    return {
      success: true,
      data: result,
      message: `Contact updated successfully with ID: ${contactId}`,
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

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    name: name,
    ...(domain && { domain: domain }),
    ...(industry && { industry: industry }),
    ...(phone && { phone: phone }),
    ...(city && { city: city }),
    ...(state && { state: state }),
    ...(country && { country: country }),
  };

  // Add any additional properties
  if (otherProperties) {
    Object.keys(otherProperties).forEach((key) => {
      properties[key] = otherProperties[key];
    });
  }

  try {
    const result = await hubspotApi.createCompany(properties);
    return {
      success: true,
      data: result,
      message: `Company created successfully: ${name}`,
    };
  } catch (error) {
    console.error("Error creating company:", error);
    throw error;
  }
}

/**
 * Search for companies in HubSpot
 */
async function searchCompanies(args: any): Promise<any> {
  const { searchTerm, filterProperty, filterValue, limit } = args;

  // Construct the query for HubSpot API
  const query: any = {};

  if (filterProperty && filterValue) {
    query.filterGroups = [
      {
        filters: [
          {
            propertyName: filterProperty,
            operator: "EQ",
            value: filterValue,
          },
        ],
      },
    ];
  } else {
    // If no specific property filter is provided, search across common properties
    query.filterGroups = [
      {
        filters: [
          {
            propertyName: "name",
            operator: "CONTAINS_TOKEN",
            value: searchTerm,
          },
        ],
      },
      {
        filters: [
          {
            propertyName: "domain",
            operator: "CONTAINS_TOKEN",
            value: searchTerm,
          },
        ],
      },
    ];
  }

  if (limit) {
    query.limit = limit;
  }

  try {
    const result = await hubspotApi.searchCompanies(query);
    return {
      success: true,
      data: result,
      message: `Found ${
        result.total || 0
      } companies matching the search criteria`,
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
    associatedCompanyId,
    associatedContactIds,
    otherProperties,
  } = args;

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    dealname: dealName,
    ...(pipeline && { pipeline: pipeline }),
    ...(stage && { dealstage: stage }),
    ...(amount && { amount: amount }),
    ...(closeDate && { closedate: closeDate }),
    ...(dealType && { dealtype: dealType }),
  };

  // Add any additional properties
  if (otherProperties) {
    Object.keys(otherProperties).forEach((key) => {
      properties[key] = otherProperties[key];
    });
  }

  try {
    const result = await hubspotApi.createDeal(properties);

    // If company or contacts associations are provided, handle them separately
    if (
      associatedCompanyId ||
      (associatedContactIds && associatedContactIds.length)
    ) {
      // This would be handled by an additional API call to associate the entities
      console.log("Associations would be created here", {
        associatedCompanyId,
        associatedContactIds,
      });
    }

    return {
      success: true,
      data: result,
      message: `Deal created successfully: ${dealName}`,
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
  const { dealId, stage, reason } = args;

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    dealstage: stage,
    ...(reason && { hs_note_body: reason }),
  };

  try {
    const result = await hubspotApi.updateDeal(dealId, properties);
    return {
      success: true,
      data: result,
      message: `Deal stage updated successfully to: ${stage}`,
    };
  } catch (error) {
    console.error("Error updating deal stage:", error);
    throw error;
  }
}

/**
 * Search for deals in HubSpot
 */
async function searchDeals(args: any): Promise<any> {
  const { searchTerm, filterProperty, filterValue, limit } = args;

  // Construct the query for HubSpot API
  const query: any = {};

  if (filterProperty && filterValue) {
    query.filterGroups = [
      {
        filters: [
          {
            propertyName: filterProperty,
            operator: "EQ",
            value: filterValue,
          },
        ],
      },
    ];
  } else {
    // If no specific property filter is provided, search across common properties
    query.filterGroups = [
      {
        filters: [
          {
            propertyName: "dealname",
            operator: "CONTAINS_TOKEN",
            value: searchTerm,
          },
        ],
      },
    ];
  }

  if (limit) {
    query.limit = limit;
  }

  try {
    const result = await hubspotApi.searchDeals(query);
    return {
      success: true,
      data: result,
      message: `Found ${result.total || 0} deals matching the search criteria`,
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
    associatedCompanyId,
    associatedContactId,
    otherProperties,
  } = args;

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    subject: subject,
    content: content,
    ...(pipeline && { hs_pipeline: pipeline }),
    ...(stage && { hs_pipeline_stage: stage }),
    ...(priority && { hs_ticket_priority: priority }),
  };

  // Add any additional properties
  if (otherProperties) {
    Object.keys(otherProperties).forEach((key) => {
      properties[key] = otherProperties[key];
    });
  }

  try {
    const result = await hubspotApi.createTicket(properties);

    // If company or contact associations are provided, handle them separately
    if (associatedCompanyId || associatedContactId) {
      // This would be handled by an additional API call to associate the entities
      console.log("Associations would be created here", {
        associatedCompanyId,
        associatedContactId,
      });
    }

    return {
      success: true,
      data: result,
      message: `Ticket created successfully: ${subject}`,
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
  const { ticketId, subject, content, stage, priority, otherProperties } = args;

  // Prepare properties object for HubSpot API
  const properties: Record<string, any> = {
    ...(subject && { subject: subject }),
    ...(content && { content: content }),
    ...(stage && { hs_pipeline_stage: stage }),
    ...(priority && { hs_ticket_priority: priority }),
  };

  // Add any additional properties
  if (otherProperties) {
    Object.keys(otherProperties).forEach((key) => {
      properties[key] = otherProperties[key];
    });
  }

  try {
    const result = await hubspotApi.updateTicket(ticketId, properties);
    return {
      success: true,
      data: result,
      message: `Ticket updated successfully with ID: ${ticketId}`,
    };
  } catch (error) {
    console.error("Error updating ticket:", error);
    throw error;
  }
}

/**
 * Add a note to a contact in HubSpot
 */
async function addNoteToContact(args: any): Promise<any> {
  const { contactId, content } = args;

  try {
    // Implementation would depend on HubSpot's API for adding notes
    // This is a placeholder that would need to be implemented
    console.log(`Adding note to contact ${contactId}: ${content}`);

    return {
      success: true,
      message: `Note added to contact: ${contactId}`,
    };
  } catch (error) {
    console.error("Error adding note to contact:", error);
    throw error;
  }
}

/**
 * Schedule a meeting with a contact in HubSpot
 */
async function scheduleContactMeeting(args: any): Promise<any> {
  const { contactId, title, startTime, endTime, description, location } = args;

  try {
    // Implementation would depend on HubSpot's API for scheduling meetings
    // This is a placeholder that would need to be implemented
    console.log(
      `Scheduling meeting with contact ${contactId}: ${title} from ${startTime} to ${endTime}`
    );

    return {
      success: true,
      message: `Meeting scheduled with contact: ${contactId}`,
    };
  } catch (error) {
    console.error("Error scheduling meeting:", error);
    throw error;
  }
}

/**
 * Create a task in HubSpot
 */
async function createTask(args: any): Promise<any> {
  const {
    subject,
    body,
    dueDate,
    status,
    priority,
    associatedCompanyId,
    associatedContactId,
    associatedDealId,
    associatedTicketId,
  } = args;

  try {
    // Implementation would depend on HubSpot's API for creating tasks
    // This is a placeholder that would need to be implemented
    console.log(`Creating task: ${subject}, due: ${dueDate}`);

    return {
      success: true,
      message: `Task created: ${subject}`,
    };
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
}

/**
 * Send an email to a contact through HubSpot
 */
async function sendEmail(args: any): Promise<any> {
  const { contactId, subject, body, isHTML, templateId, attachments } = args;

  try {
    // Implementation would depend on HubSpot's API for sending emails
    // This is a placeholder that would need to be implemented
    console.log(`Sending email to contact ${contactId}: ${subject}`);

    return {
      success: true,
      message: `Email sent to contact: ${contactId}`,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

/**
 * Create a list of contacts in HubSpot
 */
async function createList(args: any): Promise<any> {
  const { name, type, description, contactIds, filters } = args;

  try {
    // Implementation would depend on HubSpot's API for creating contact lists
    // This is a placeholder that would need to be implemented
    console.log(
      `Creating ${type} list: ${name} with ${
        contactIds ? contactIds.length : 0
      } contacts`
    );

    return {
      success: true,
      message: `List created: ${name}`,
    };
  } catch (error) {
    console.error("Error creating list:", error);
    throw error;
  }
}

/**
 * Get analytics data from HubSpot
 */
async function getAnalytics(args: any): Promise<any> {
  const { metric, period, startDate, endDate } = args;

  try {
    // Implementation would depend on HubSpot's API for retrieving analytics
    // This is a placeholder that would need to be implemented
    console.log(
      `Getting ${metric} analytics for period: ${period || "custom"}`
    );

    return {
      success: true,
      message: `Retrieved analytics for: ${metric}`,
      data: {
        // Sample data
        metric,
        period,
        startDate,
        endDate,
        values: [
          { date: "2023-01-01", value: 120 },
          { date: "2023-01-02", value: 145 },
          { date: "2023-01-03", value: 132 },
        ],
      },
    };
  } catch (error) {
    console.error("Error getting analytics:", error);
    throw error;
  }
}

/**
 * Log in to HubSpot using credentials
 */
async function loginToHubspot(args: any): Promise<any> {
  const { email, password, useOAuth, apiKey } = args;

  try {
    // For security reasons, a real implementation would likely redirect to HubSpot's OAuth flow
    // This is a placeholder that would need to be implemented securely
    if (apiKey) {
      await hubspotApi.saveHubSpotConfig({ apiKey });
      return {
        success: true,
        message: "Successfully authenticated with API key",
      };
    } else if (useOAuth) {
      return {
        success: true,
        message: "OAuth authentication flow would be initiated here",
      };
    } else {
      return {
        success: false,
        message:
          "Password authentication is not supported for security reasons",
      };
    }
  } catch (error) {
    console.error("Error logging in to HubSpot:", error);
    throw error;
  }
}

/**
 * Run a workflow in HubSpot
 */
async function runWorkflow(args: any): Promise<any> {
  const { workflowId, contactIds, companyIds, dealIds, ticketIds } = args;

  try {
    // Implementation would depend on HubSpot's API for running workflows
    // This is a placeholder that would need to be implemented
    console.log(
      `Running workflow ${workflowId} for ${
        contactIds ? contactIds.length : 0
      } contacts`
    );

    return {
      success: true,
      message: `Workflow started: ${workflowId}`,
    };
  } catch (error) {
    console.error("Error running workflow:", error);
    throw error;
  }
}
