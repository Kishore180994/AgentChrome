import { SchemaType, Tool } from "@google/generative-ai";
import { DOMAction } from "../../types/actionType";

/**
 * HubSpot function tools for Gemini AI
 *
 * This file defines the function declarations that Gemini AI can use
 * to interact with HubSpot. When the user sends a command related to HubSpot,
 * Gemini AI will respond with the appropriate function call, which the extension
 * will then execute.
 */

// Define common filter structure for reusability
const filterSchema = {
  type: SchemaType.OBJECT,
  properties: {
    propertyName: {
      type: SchemaType.STRING,
      description: "The internal name of the property to filter on.",
    },
    operator: {
      type: SchemaType.STRING,
      description:
        "The filter operator (e.g., EQ, NEQ, LT, LTE, GT, GTE, BETWEEN, IN, NIN, HAS_PROPERTY, NOT_HAS_PROPERTY, CONTAINS_TOKEN, NOT_CONTAINS_TOKEN).",
    },
    value: {
      type: SchemaType.STRING,
      description: "The value to compare the property against.",
    },
    // Add values for operators like BETWEEN or IN
    values: {
      type: SchemaType.ARRAY,
      description: "A list of values for operators like IN or NIN.",
      items: { type: SchemaType.STRING },
    },
    highValue: {
      type: SchemaType.STRING,
      description: "The higher value for the BETWEEN operator.",
    },
  },
  required: ["propertyName", "operator"],
};

const filterGroupSchema = {
  type: SchemaType.OBJECT,
  properties: {
    filters: {
      type: SchemaType.ARRAY,
      description: "A list of filters to apply (ANDed together).",
      items: filterSchema,
    },
  },
  required: ["filters"],
};

const sortSchema = {
  type: SchemaType.OBJECT,
  properties: {
    propertyName: {
      type: SchemaType.STRING,
      description: "The internal name of the property to sort by.",
    },
    direction: {
      type: SchemaType.STRING,
      enum: ["ASCENDING", "DESCENDING"],
      description: "The sort direction.",
    },
  },
  required: ["propertyName", "direction"],
};

export const hubspotTools: Tool[] = [
  {
    functionDeclarations: [
      // --- Navigation ---
      {
        name: "hubspot_navigateTo",
        description: "Navigate to a specific section in HubSpot UI",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            section: {
              type: SchemaType.STRING,
              enum: [
                "contacts",
                "companies",
                "deals",
                "tickets",
                "marketing",
                "sales",
                "service",
                "automation",
                "reports",
                "settings",
                "dashboard", // Added common section
              ],
              description: "Required section to navigate to in HubSpot",
            },
            subsection: {
              type: SchemaType.STRING,
              description:
                "Optional subsection to navigate to (e.g., 'emails' under 'marketing', 'pipelines' under 'settings')",
            },
            recordId: {
              type: SchemaType.STRING,
              description:
                "Optional specific record ID to navigate to within a section (e.g., a specific contact ID within 'contacts')",
            },
          },
          required: ["section"],
        },
      },

      // --- Core Object CRUD ---
      // Contacts
      {
        name: "hubspot_createContact",
        description: "Create a new contact in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            email: {
              type: SchemaType.STRING,
              description: "Required email address for the contact",
            },
            firstName: {
              type: SchemaType.STRING,
              description: "Optional first name for the contact",
            },
            lastName: {
              type: SchemaType.STRING,
              description: "Optional last name for the contact",
            },
            phone: {
              type: SchemaType.STRING,
              description: "Optional phone number for the contact",
            },
            company: {
              type: SchemaType.STRING,
              description: "Optional company name for the contact",
            },
            jobTitle: {
              type: SchemaType.STRING,
              description: "Optional job title for the contact",
            },
            lifecycleStage: {
              type: SchemaType.STRING,
              enum: [
                "subscriber",
                "lead",
                "marketingqualifiedlead",
                "salesqualifiedlead",
                "opportunity",
                "customer",
                "evangelist",
                "other",
              ],
              description: "Optional lifecycle stage for the contact",
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties for the contact as key-value pairs (use internal property names). Example: {'custom_property': 'value'}",
            },
          },
          required: ["email"],
        },
      },
      {
        name: "hubspot_getContactById",
        description: "Get a single contact by its HubSpot ID",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            contactId: {
              type: SchemaType.STRING,
              description: "Required HubSpot ID of the contact to retrieve.",
            },
            properties: {
              type: SchemaType.ARRAY,
              description:
                "Optional list of specific internal property names to retrieve. If omitted, default properties are returned.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["contactId"],
        },
      },
      {
        name: "hubspot_updateContact",
        description: "Update an existing contact in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            contactId: {
              type: SchemaType.STRING,
              description: "Required contact ID to update",
            },
            email: {
              type: SchemaType.STRING,
              description: "Optional updated email address",
            },
            firstName: {
              type: SchemaType.STRING,
              description: "Optional updated first name",
            },
            lastName: {
              type: SchemaType.STRING,
              description: "Optional updated last name",
            },
            phone: {
              type: SchemaType.STRING,
              description: "Optional updated phone number",
            },
            company: {
              type: SchemaType.STRING,
              description: "Optional updated company name",
            },
            jobTitle: {
              type: SchemaType.STRING,
              description: "Optional updated job title",
            },
            lifecycleStage: {
              type: SchemaType.STRING,
              enum: [
                "subscriber",
                "lead",
                "marketingqualifiedlead",
                "salesqualifiedlead",
                "opportunity",
                "customer",
                "evangelist",
                "other",
              ],
              description: "Optional updated lifecycle stage",
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties to update as key-value pairs (use internal property names).",
            },
          },
          required: ["contactId"],
        },
      },
      {
        name: "hubspot_deleteContact",
        description:
          "Delete a contact in HubSpot by its ID (use with caution!)",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            contactId: {
              type: SchemaType.STRING,
              description: "Required HubSpot ID of the contact to delete.",
            },
          },
          required: ["contactId"],
        },
      },

      // Companies
      {
        name: "hubspot_createCompany",
        description: "Create a new company in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
              description: "Required company name",
            },
            domain: {
              type: SchemaType.STRING,
              description: "Optional company website domain",
            },
            industry: {
              type: SchemaType.STRING,
              description: "Optional company industry",
            },
            phone: {
              type: SchemaType.STRING,
              description: "Optional company phone number",
            },
            city: {
              type: SchemaType.STRING,
              description: "Optional company city",
            },
            state: {
              type: SchemaType.STRING,
              description: "Optional company state/region",
            },
            country: {
              type: SchemaType.STRING,
              description: "Optional company country",
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties for the company as key-value pairs (use internal property names).",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "hubspot_getCompanyById",
        description: "Get a single company by its HubSpot ID",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            companyId: {
              type: SchemaType.STRING,
              description: "Required HubSpot ID of the company to retrieve.",
            },
            properties: {
              type: SchemaType.ARRAY,
              description:
                "Optional list of specific internal property names to retrieve. If omitted, default properties are returned.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["companyId"],
        },
      },
      {
        name: "hubspot_updateCompany",
        description: "Update an existing company in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            companyId: {
              type: SchemaType.STRING,
              description: "Required company ID to update",
            },
            name: {
              type: SchemaType.STRING,
              description: "Optional updated company name",
            },
            domain: {
              type: SchemaType.STRING,
              description: "Optional updated company website domain",
            },
            industry: {
              type: SchemaType.STRING,
              description: "Optional updated company industry",
            },
            phone: {
              type: SchemaType.STRING,
              description: "Optional updated company phone number",
            },
            city: {
              type: SchemaType.STRING,
              description: "Optional updated company city",
            },
            state: {
              type: SchemaType.STRING,
              description: "Optional updated company state/region",
            },
            country: {
              type: SchemaType.STRING,
              description: "Optional updated company country",
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties to update as key-value pairs (use internal property names).",
            },
          },
          required: ["companyId"],
        },
      },
      {
        name: "hubspot_deleteCompany",
        description:
          "Delete a company in HubSpot by its ID (use with caution!)",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            companyId: {
              type: SchemaType.STRING,
              description: "Required HubSpot ID of the company to delete.",
            },
          },
          required: ["companyId"],
        },
      },

      // Deals
      {
        name: "hubspot_createDeal",
        description: "Create a new deal in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            dealName: {
              type: SchemaType.STRING,
              description: "Required name of the deal",
            },
            pipeline: {
              type: SchemaType.STRING,
              description: "Required pipeline ID or name for the deal", // Often required by API
            },
            stage: {
              type: SchemaType.STRING,
              description:
                "Required stage ID or name in the pipeline for the deal", // Often required by API
            },
            amount: {
              type: SchemaType.NUMBER,
              description: "Optional deal amount",
            },
            closeDate: {
              type: SchemaType.STRING,
              description:
                "Optional expected close date (ISO format: YYYY-MM-DD)",
            },
            dealType: {
              type: SchemaType.STRING,
              description: "Optional deal type",
            },
            associatedCompanyId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the company to associate with this deal",
            },
            associatedContactIds: {
              type: SchemaType.ARRAY,
              description:
                "Optional IDs of contacts to associate with this deal",
              items: {
                type: SchemaType.STRING,
              },
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties for the deal as key-value pairs (use internal property names).",
            },
          },
          // Making pipeline/stage required as they often are via API
          required: ["dealName", "pipeline", "stage"],
        },
      },
      {
        name: "hubspot_getDealById",
        description: "Get a single deal by its HubSpot ID",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            dealId: {
              type: SchemaType.STRING,
              description: "Required HubSpot ID of the deal to retrieve.",
            },
            properties: {
              type: SchemaType.ARRAY,
              description:
                "Optional list of specific internal property names to retrieve. If omitted, default properties are returned.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["dealId"],
        },
      },
      {
        name: "hubspot_updateDeal",
        description: "Update an existing deal in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            dealId: {
              type: SchemaType.STRING,
              description: "Required ID of the deal to update",
            },
            dealName: {
              type: SchemaType.STRING,
              description: "Optional updated name of the deal",
            },
            pipeline: {
              type: SchemaType.STRING,
              description: "Optional updated pipeline ID or name for the deal",
            },
            stage: {
              type: SchemaType.STRING,
              description:
                "Optional updated stage ID or name in the pipeline for the deal",
            },
            amount: {
              type: SchemaType.NUMBER,
              description: "Optional updated deal amount",
            },
            closeDate: {
              type: SchemaType.STRING,
              description:
                "Optional updated expected close date (ISO format: YYYY-MM-DD)",
            },
            dealType: {
              type: SchemaType.STRING,
              description: "Optional updated deal type",
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties to update as key-value pairs (use internal property names).",
            },
          },
          required: ["dealId"],
        },
      },
      // Note: hubspot_updateDealStage is kept for specific common use case
      {
        name: "hubspot_updateDealStage",
        description: "Update the stage of a specific deal in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            dealId: {
              type: SchemaType.STRING,
              description: "Required ID of the deal to update",
            },
            stage: {
              type: SchemaType.STRING,
              description: "Required new stage ID or name for the deal",
            },
            pipeline: {
              type: SchemaType.STRING,
              description:
                "Optional pipeline ID or name (needed if stage belongs to a different pipeline)",
            },
          },
          required: ["dealId", "stage"],
        },
      },
      {
        name: "hubspot_deleteDeal",
        description: "Delete a deal in HubSpot by its ID (use with caution!)",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            dealId: {
              type: SchemaType.STRING,
              description: "Required HubSpot ID of the deal to delete.",
            },
          },
          required: ["dealId"],
        },
      },

      // Tickets
      {
        name: "hubspot_createTicket",
        description: "Create a new support ticket in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            subject: {
              type: SchemaType.STRING,
              description: "Required subject (name) of the ticket",
            },
            content: {
              type: SchemaType.STRING,
              description: "Optional content/description of the ticket", // Made optional as API might not require
            },
            pipeline: {
              type: SchemaType.STRING,
              description: "Required pipeline ID or name for the ticket", // Often required by API
            },
            stage: {
              // Renamed from 'status' in original list to 'stage' to match API terminology (hs_pipeline_stage)
              type: SchemaType.STRING,
              description:
                "Required stage ID or name in the pipeline for the ticket", // Often required by API
            },
            priority: {
              type: SchemaType.STRING,
              // Enum values depend on portal settings, provide common examples
              description:
                "Optional priority of the ticket (e.g., 'high', 'medium', 'low')",
            },
            associatedCompanyId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the company to associate with this ticket",
            },
            associatedContactId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the contact to associate with this ticket",
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties for the ticket as key-value pairs (use internal property names).",
            },
          },
          // Making pipeline/stage required as they often are via API
          required: ["subject", "pipeline", "stage"],
        },
      },
      {
        name: "hubspot_getTicketById",
        description: "Get a single ticket by its HubSpot ID",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticketId: {
              type: SchemaType.STRING,
              description: "Required HubSpot ID of the ticket to retrieve.",
            },
            properties: {
              type: SchemaType.ARRAY,
              description:
                "Optional list of specific internal property names to retrieve. If omitted, default properties are returned.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["ticketId"],
        },
      },
      {
        name: "hubspot_updateTicket",
        description: "Update a support ticket in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticketId: {
              type: SchemaType.STRING,
              description: "Required ID of the ticket to update",
            },
            subject: {
              type: SchemaType.STRING,
              description: "Optional updated subject",
            },
            content: {
              type: SchemaType.STRING,
              description: "Optional updated content/description",
            },
            pipeline: {
              type: SchemaType.STRING,
              description:
                "Optional updated pipeline ID or name for the ticket",
            },
            stage: {
              type: SchemaType.STRING,
              description: "Optional updated stage ID or name",
            },
            priority: {
              type: SchemaType.STRING,
              description:
                "Optional updated priority (e.g., 'high', 'medium', 'low')",
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties to update as key-value pairs (use internal property names).",
            },
          },
          required: ["ticketId"],
        },
      },
      {
        name: "hubspot_deleteTicket",
        description: "Delete a ticket in HubSpot by its ID (use with caution!)",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ticketId: {
              type: SchemaType.STRING,
              description: "Required HubSpot ID of the ticket to delete.",
            },
          },
          required: ["ticketId"],
        },
      },

      // --- Search ---
      // Basic Search (kept for simpler queries)
      {
        name: "hubspot_searchContacts",
        description: "Search for contacts in HubSpot based on a general term.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              // Changed from searchTerm for clarity with HubSpot API
              type: SchemaType.STRING,
              description:
                "Required search query term to look for across default search fields.",
            },
            limit: {
              type: SchemaType.NUMBER,
              description:
                "Optional maximum number of contacts to return (default/max limit applies).",
            },
            after: {
              type: SchemaType.STRING,
              description:
                "Optional pagination cursor to retrieve the next page of results.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "hubspot_searchCompanies",
        description: "Search for companies in HubSpot based on a general term.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description:
                "Required search query term to look for across default search fields.",
            },
            limit: {
              type: SchemaType.NUMBER,
              description:
                "Optional maximum number of companies to return (default/max limit applies).",
            },
            after: {
              type: SchemaType.STRING,
              description:
                "Optional pagination cursor to retrieve the next page of results.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "hubspot_searchDeals",
        description: "Search for deals in HubSpot based on a general term.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description:
                "Required search query term to look for across default search fields.",
            },
            limit: {
              type: SchemaType.NUMBER,
              description:
                "Optional maximum number of deals to return (default/max limit applies).",
            },
            after: {
              type: SchemaType.STRING,
              description:
                "Optional pagination cursor to retrieve the next page of results.",
            },
          },
          required: ["query"],
        },
      },
      // Advanced Search
      {
        name: "hubspot_advancedSearch",
        description:
          "Perform an advanced search for CRM objects using complex filters and sorting.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            objectType: {
              type: SchemaType.STRING,
              enum: [
                "contacts",
                "companies",
                "deals",
                "tickets" /* Add others as needed: products, line_items, custom objects */,
              ],
              description: "Required type of object to search for.",
            },
            filterGroups: {
              type: SchemaType.ARRAY,
              description:
                "Required array of filter groups. Filters within a group are ANDed, groups are ORed.",
              items: filterGroupSchema,
            },
            sorts: {
              type: SchemaType.ARRAY,
              description: "Optional array of sorting rules.",
              items: sortSchema,
            },
            properties: {
              type: SchemaType.ARRAY,
              description:
                "Optional list of specific internal property names to return.",
              items: { type: SchemaType.STRING },
            },
            limit: {
              type: SchemaType.NUMBER,
              description:
                "Optional maximum number of results per page (default/max limit applies).",
            },
            after: {
              type: SchemaType.STRING,
              description:
                "Optional pagination cursor to retrieve the next page of results.",
            },
          },
          required: ["objectType", "filterGroups"],
        },
      },

      // --- Associations ---
      {
        name: "hubspot_associateRecords",
        description:
          "Associate two existing records in HubSpot (e.g., link a contact to a company).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            fromObjectType: {
              type: SchemaType.STRING,
              description:
                "Required object type of the primary record (e.g., 'contacts', 'deals').",
            },
            fromObjectId: {
              type: SchemaType.STRING,
              description: "Required ID of the primary record.",
            },
            toObjectType: {
              type: SchemaType.STRING,
              description:
                "Required object type of the record to associate to (e.g., 'companies', 'tickets').",
            },
            toObjectId: {
              type: SchemaType.STRING,
              description: "Required ID of the record to associate to.",
            },
            associationType: {
              type: SchemaType.STRING,
              description:
                "Optional type/label of the association (required for labeled associations, use internal ID or name). Default if omitted.",
            },
            associationCategory: {
              type: SchemaType.STRING,
              enum: ["HUBSPOT_DEFINED", "USER_DEFINED"],
              description:
                "Required category for labeled associations ('USER_DEFINED' for custom labels). Omit for default.",
            },
          },
          required: [
            "fromObjectType",
            "fromObjectId",
            "toObjectType",
            "toObjectId",
          ],
        },
      },
      {
        name: "hubspot_getAssociations",
        description: "Get records associated with a specific record.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            objectType: {
              type: SchemaType.STRING,
              description:
                "Required object type of the primary record (e.g., 'contacts', 'deals').",
            },
            objectId: {
              type: SchemaType.STRING,
              description: "Required ID of the primary record.",
            },
            associatedObjectType: {
              type: SchemaType.STRING,
              description:
                "Required object type of the associated records to retrieve (e.g., 'companies', 'tickets').",
            },
            after: {
              type: SchemaType.STRING,
              description:
                "Optional pagination cursor to retrieve the next page of results.",
            },
            limit: {
              type: SchemaType.NUMBER,
              description:
                "Optional maximum number of associated records to return per page.",
            },
          },
          required: ["objectType", "objectId", "associatedObjectType"],
        },
      },

      // --- Engagements (Activities) ---
      {
        name: "hubspot_addNote", // Renamed from addNoteToContact for consistency
        description: "Add a note engagement to one or more records.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            content: {
              type: SchemaType.STRING,
              description: "Required content/body of the note.",
            },
            associatedContactIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of contacts to associate the note with.",
            },
            associatedCompanyIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of companies to associate the note with.",
            },
            associatedDealIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Optional IDs of deals to associate the note with.",
            },
            associatedTicketIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of tickets to associate the note with.",
            },
            timestamp: {
              type: SchemaType.STRING,
              description:
                "Optional timestamp for the note (ISO format: YYYY-MM-DDTHH:MM:SSZ). Defaults to now.",
            },
          },
          required: ["content"],
        },
      },
      {
        name: "hubspot_scheduleMeeting", // Renamed from scheduleContactMeeting
        description: "Schedule a meeting engagement associated with records.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: {
              type: SchemaType.STRING,
              description: "Required title of the meeting.",
            },
            startTime: {
              type: SchemaType.STRING,
              description:
                "Required start time (ISO format: YYYY-MM-DDTHH:MM:SSZ).",
            },
            endTime: {
              type: SchemaType.STRING,
              description:
                "Required end time (ISO format: YYYY-MM-DDTHH:MM:SSZ).",
            },
            body: {
              // Changed from description to match API property 'hs_meeting_body'
              type: SchemaType.STRING,
              description: "Optional description/body of the meeting.",
            },
            location: {
              type: SchemaType.STRING,
              description:
                "Optional location of the meeting (hs_meeting_location).",
            },
            meetingOutcome: {
              type: SchemaType.STRING,
              description:
                "Optional outcome of the meeting (hs_meeting_outcome).",
            },
            associatedContactIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of contacts to associate the meeting with.",
            },
            associatedCompanyIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of companies to associate the meeting with.",
            },
            associatedDealIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of deals to associate the meeting with.",
            },
            associatedTicketIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of tickets to associate the meeting with.",
            },
          },
          required: ["title", "startTime", "endTime"],
        },
      },
      {
        name: "hubspot_createTask",
        description: "Create a task engagement associated with records.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            subject: {
              // hs_task_subject
              type: SchemaType.STRING,
              description: "Required subject/title of the task.",
            },
            body: {
              // hs_task_body
              type: SchemaType.STRING,
              description: "Optional body/description of the task.",
            },
            dueDate: {
              // hs_timestamp (due date)
              type: SchemaType.STRING,
              description:
                "Optional due date/time for the task (ISO format: YYYY-MM-DDTHH:MM:SSZ or YYYY-MM-DD).",
            },
            status: {
              // hs_task_status
              type: SchemaType.STRING,
              enum: [
                "NOT_STARTED",
                "IN_PROGRESS",
                "WAITING", // Waiting (on contact)
                "COMPLETED",
                "DEFERRED",
              ],
              description: "Optional status of the task.",
            },
            priority: {
              // hs_task_priority
              type: SchemaType.STRING,
              enum: ["HIGH", "MEDIUM", "LOW"],
              description: "Optional priority of the task.",
            },
            taskType: {
              // hs_task_type
              type: SchemaType.STRING,
              enum: ["EMAIL", "CALL", "TODO"],
              description: "Optional type of task.",
            },
            reminderDate: {
              // hs_task_reminders
              type: SchemaType.STRING,
              description:
                "Optional reminder date/time (ISO format: YYYY-MM-DDTHH:MM:SSZ).",
            },
            associatedContactIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of contacts to associate the task with.",
            },
            associatedCompanyIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of companies to associate the task with.",
            },
            associatedDealIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Optional IDs of deals to associate the task with.",
            },
            associatedTicketIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of tickets to associate the task with.",
            },
            ownerId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the HubSpot user to assign the task to.",
            },
          },
          required: ["subject"],
        },
      },
      {
        name: "hubspot_logCall",
        description: "Log a call engagement associated with records.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            subject: {
              // hs_call_title
              type: SchemaType.STRING,
              description: "Optional title/subject of the call log.",
            },
            startTime: {
              // hs_timestamp (start time of call)
              type: SchemaType.STRING,
              description:
                "Required start time of the call (ISO format: YYYY-MM-DDTHH:MM:SSZ).",
            },
            callDuration: {
              // hs_call_duration (milliseconds)
              type: SchemaType.NUMBER,
              description: "Optional duration of the call in milliseconds.",
            },
            callDirection: {
              // hs_call_direction
              type: SchemaType.STRING,
              enum: ["INBOUND", "OUTBOUND"],
              description: "Optional direction of the call.",
            },
            callStatus: {
              // hs_call_status
              type: SchemaType.STRING,
              enum: ["COMPLETED", "CANCELED", "BUSY", "NO_ANSWER", "FAILED"],
              description: "Required status of the call outcome.",
            },
            body: {
              // hs_call_body
              type: SchemaType.STRING,
              description: "Optional notes or description of the call.",
            },
            recordingUrl: {
              // hs_call_recording_url
              type: SchemaType.STRING,
              description: "Optional URL to the call recording.",
            },
            toNumber: {
              // hs_call_to_number
              type: SchemaType.STRING,
              description: "Optional 'to' phone number.",
            },
            fromNumber: {
              // hs_call_from_number
              type: SchemaType.STRING,
              description: "Optional 'from' phone number.",
            },
            disposition: {
              // hs_call_disposition
              type: SchemaType.STRING,
              description: "Optional call disposition/outcome ID.",
            },
            associatedContactIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of contacts to associate the call with.",
            },
            associatedCompanyIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of companies to associate the call with.",
            },
            associatedDealIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Optional IDs of deals to associate the call with.",
            },
            associatedTicketIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description:
                "Optional IDs of tickets to associate the call with.",
            },
            ownerId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the HubSpot user who made/received the call.",
            },
          },
          required: ["startTime", "callStatus"],
        },
      },
      {
        name: "hubspot_sendEmail", // Sending 1-to-1 email logged to contact
        description:
          "Send a one-to-one email, logged to a contact via HubSpot.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            // Note: This typically requires complex setup via API (e.g., using Single Send API)
            // Simplify for now assuming a basic communication logging scenario
            toContactId: {
              // Simplified concept - actual API might differ
              type: SchemaType.STRING,
              description:
                "Required ID of the primary contact recipient to log against.",
            },
            fromUserId: {
              // Specify which HubSpot user is sending
              type: SchemaType.STRING,
              description:
                "Optional ID of the HubSpot sending user (defaults may apply).",
            },
            subject: {
              type: SchemaType.STRING,
              description: "Required subject of the email.",
            },
            body: {
              type: SchemaType.STRING,
              description: "Required plain text body of the email.",
            },
            htmlBody: {
              type: SchemaType.STRING,
              description: "Optional HTML body of the email.",
            },
            ccContactIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Optional IDs of contacts to CC.",
            },
            bccContactIds: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Optional IDs of contacts to BCC.",
            },
            // Attachments are complex via API, omitting for simplicity
          },
          required: ["toContactId", "subject", "body"], // or htmlBody
        },
      },
      {
        name: "hubspot_updateTask",
        description: "Update an existing task engagement.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            taskId: {
              type: SchemaType.STRING,
              description: "Required ID of the task to update.",
            },
            subject: {
              type: SchemaType.STRING,
              description: "Optional updated subject.",
            },
            body: {
              type: SchemaType.STRING,
              description: "Optional updated body.",
            },
            dueDate: {
              type: SchemaType.STRING,
              description: "Optional updated due date (ISO format).",
            },
            status: {
              type: SchemaType.STRING,
              enum: [
                "NOT_STARTED",
                "IN_PROGRESS",
                "WAITING",
                "COMPLETED",
                "DEFERRED",
              ],
              description: "Optional updated status.",
            },
            priority: {
              type: SchemaType.STRING,
              enum: ["HIGH", "MEDIUM", "LOW"],
              description: "Optional updated priority.",
            },
            taskType: {
              type: SchemaType.STRING,
              enum: ["EMAIL", "CALL", "TODO"],
              description: "Optional updated task type.",
            },
            reminderDate: {
              type: SchemaType.STRING,
              description: "Optional updated reminder date (ISO format).",
            },
            ownerId: {
              type: SchemaType.STRING,
              description: "Optional updated owner ID.",
            },
          },
          required: ["taskId"],
        },
      },
      // Add similar update functions for Note, Meeting, Call if granular updates needed
      {
        name: "hubspot_deleteEngagement",
        description:
          "Delete an engagement (task, note, call, meeting, email) by its ID.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            engagementType: {
              type: SchemaType.STRING,
              // Use internal IDs or common names. Actual API uses numeric IDs.
              enum: ["tasks", "notes", "calls", "meetings", "emails"],
              description: "Required type of the engagement to delete.",
            },
            engagementId: {
              type: SchemaType.STRING,
              description: "Required ID of the engagement to delete.",
            },
          },
          required: ["engagementType", "engagementId"],
        },
      },
      // Simple search added here - Advanced search can also query engagements
      {
        name: "hubspot_searchEngagements",
        description:
          "Search for engagement records (tasks, notes, calls, meetings, emails).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            engagementType: {
              type: SchemaType.STRING,
              enum: ["tasks", "notes", "calls", "meetings", "emails"],
              description: "Optional type of engagement to filter by.",
            },
            associatedObjectType: {
              type: SchemaType.STRING,
              enum: ["CONTACT", "COMPANY", "DEAL", "TICKET"], // Case sensitive for API usually
              description: "Optional type of associated object to filter by.",
            },
            associatedObjectId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the associated object (used with associatedObjectType).",
            },
            limit: {
              type: SchemaType.NUMBER,
              description: "Optional maximum number of results per page.",
            },
            after: {
              type: SchemaType.STRING,
              description: "Optional pagination cursor.",
            },
            // Add basic property filters if needed, or rely on advancedSearch
          },
          required: [], // Allow searching all or filtering
        },
      },

      // --- Marketing (Lists, Forms) ---
      {
        name: "hubspot_createList",
        description: "Create a list of contacts in HubSpot.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
              description: "Required name of the list.",
            },
            listType: {
              // Changed from 'type' which can be a keyword
              type: SchemaType.STRING,
              enum: ["STATIC", "DYNAMIC"],
              description: "Required type of list (STATIC or DYNAMIC).",
            },
            // Filters are complex, use simplified structure or expect specific format
            filters: {
              type: SchemaType.ARRAY, // Represents the 'filters' property in API List definition
              description:
                "Required array of filter branches for DYNAMIC lists (complex structure, refer to API docs).",
              items: { type: SchemaType.OBJECT }, // Placeholder - actual structure is nested arrays/objects
            },
          },
          required: ["name", "listType"], // Filters required for DYNAMIC
        },
      },
      {
        name: "hubspot_addContactsToList",
        description: "Add existing contacts to a STATIC list.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            listId: {
              type: SchemaType.STRING,
              description: "Required ID of the static list.",
            },
            contactIds: {
              type: SchemaType.ARRAY,
              description: "Required array of contact IDs (vids) to add.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["listId", "contactIds"],
        },
      },
      {
        name: "hubspot_removeContactsFromList",
        description: "Remove contacts from a STATIC list.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            listId: {
              type: SchemaType.STRING,
              description: "Required ID of the static list.",
            },
            contactIds: {
              type: SchemaType.ARRAY,
              description: "Required array of contact IDs (vids) to remove.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["listId", "contactIds"],
        },
      },
      {
        name: "hubspot_getListMembers",
        description: "Get contacts belonging to a specific list.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            listId: {
              type: SchemaType.STRING,
              description: "Required ID of the list.",
            },
            limit: {
              type: SchemaType.NUMBER,
              description: "Optional number of contacts per page.",
            },
            offset: {
              // V1 API uses offset, V3 might use 'after' paging - check API version
              type: SchemaType.NUMBER, // Or string if it's a vidOffset
              description:
                "Optional offset for pagination (contact vid offset).",
            },
            includeProperties: {
              type: SchemaType.ARRAY,
              description:
                "Optional list of contact properties to include in the response.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["listId"],
        },
      },
      {
        name: "hubspot_deleteList",
        description: "Delete a contact list in HubSpot (use with caution!).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            listId: {
              type: SchemaType.STRING,
              description: "Required ID of the list to delete.",
            },
          },
          required: ["listId"],
        },
      },
      // Update List (Filters) is complex - might be better handled via Navigation or specific filter adjustments
      {
        name: "hubspot_submitForm",
        description: "Submit data to a HubSpot form.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            // portalId might be implicit in backend config
            formGuid: {
              type: SchemaType.STRING,
              description: "Required GUID of the HubSpot form.",
            },
            fields: {
              type: SchemaType.ARRAY,
              description: "Required array of field submissions.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description: "Internal name of the form field.",
                  },
                  value: {
                    type: SchemaType.STRING,
                    description: "Value submitted for the field.",
                  },
                },
                required: ["name", "value"],
              },
            },
            context: {
              type: SchemaType.OBJECT,
              description:
                "Optional context object (e.g., page URI, page name, HubSpot cookie).",
              properties: {
                hutk: {
                  type: SchemaType.STRING,
                  description: "HubSpot User Token (hsutk cookie value).",
                },
                pageUri: {
                  type: SchemaType.STRING,
                  description: "URL of the page where the form was submitted.",
                },
                pageName: {
                  type: SchemaType.STRING,
                  description:
                    "Title of the page where the form was submitted.",
                },
                // Other context fields as needed
              },
            },
            // legalConsentOptions omitted for simplicity - complex structure
          },
          required: ["formGuid", "fields"],
        },
      },

      // --- Automation ---
      {
        name: "hubspot_runWorkflow", // Enroll Objects into Workflow
        description: "Enroll records into a HubSpot workflow.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            workflowId: {
              type: SchemaType.STRING,
              description:
                "Required ID of the workflow to enroll records into.",
            },
            // Assuming contact-based workflow primarily
            emails: {
              // Use email for contact enrollment API
              type: SchemaType.ARRAY,
              description:
                "Required array of contact email addresses to enroll.",
              items: { type: SchemaType.STRING },
            },
            // Add support for objectId enrollment if using newer APIs
          },
          required: ["workflowId", "emails"],
        },
      },

      // --- Analytics ---
      {
        name: "hubspot_getAnalytics",
        description: "Get basic analytics data from HubSpot.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            // This is highly dependent on specific V3 Analytics API endpoints which are complex
            // Simplify to represent common concepts - actual implementation needs specific API mapping
            dataType: {
              type: SchemaType.STRING,
              enum: [
                "WEBSITE_VISITS",
                "CONTACT_CREATION",
                "DEAL_CREATION",
                "FORM_SUBMISSIONS",
                "EMAIL_PERFORMANCE", // Needs specific email campaign ID usually
                // Add more granular types based on available APIs
              ],
              description: "Required type of analytics data to retrieve.",
            },
            timePeriod: {
              type: SchemaType.STRING,
              enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
              description: "Optional aggregation time period.",
            },
            startDate: {
              type: SchemaType.STRING,
              description: "Optional start date (ISO format: YYYY-MM-DD).",
            },
            endDate: {
              type: SchemaType.STRING,
              description: "Optional end date (ISO format: YYYY-MM-DD).",
            },
            // Add specific filters relevant to dataType (e.g., formId, emailCampaignId)
          },
          required: ["dataType"],
        },
      },

      // --- Metadata (Properties) ---
      {
        name: "hubspot_getProperties",
        description: "Get property definitions for a specific object type.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            objectType: {
              type: SchemaType.STRING,
              description:
                "Required object type (e.g., 'contacts', 'deals', 'companies').",
            },
            archived: {
              type: SchemaType.BOOLEAN,
              description:
                "Optional: Whether to return archived properties (default: false).",
            },
          },
          required: ["objectType"],
        },
      },
      {
        name: "hubspot_createProperty",
        description: "Create a new custom property for an object type.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            objectType: {
              type: SchemaType.STRING,
              description:
                "Required object type (e.g., 'contacts', 'deals', 'companies').",
            },
            name: {
              type: SchemaType.STRING,
              description: "Required internal name (lowercase, underscores).",
            },
            label: {
              type: SchemaType.STRING,
              description: "Required display label shown in HubSpot UI.",
            },
            groupName: {
              type: SchemaType.STRING,
              description: "Required internal name of the property group.",
            },
            type: {
              // Corresponds to HubSpot API 'type'
              type: SchemaType.STRING,
              enum: [
                "string",
                "number",
                "date",
                "datetime",
                "enumeration",
                "bool",
              ],
              description: "Required data type (string, number, date, etc.).",
            },
            fieldType: {
              // Corresponds to HubSpot API 'fieldType'
              type: SchemaType.STRING,
              enum: [
                "text",
                "textarea",
                "select",
                "radio",
                "checkbox",
                "number",
                "date",
                "file",
                "booleancheckbox",
                "calculation_equation",
                // Add others as needed
              ],
              description:
                "Required UI field type (text, textarea, select, etc.).",
            },
            description: {
              type: SchemaType.STRING,
              description: "Optional description for the property.",
            },
            options: {
              // For enumeration type
              type: SchemaType.ARRAY,
              description:
                "Required for enumeration types (select, radio, checkbox). Array of options.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  label: {
                    type: SchemaType.STRING,
                    description: "Display label for the option.",
                  },
                  value: {
                    type: SchemaType.STRING,
                    description: "Internal value for the option.",
                  },
                  displayOrder: {
                    type: SchemaType.NUMBER,
                    description: "Optional display order.",
                  },
                  hidden: {
                    type: SchemaType.BOOLEAN,
                    description: "Optional flag if option is hidden.",
                  },
                },
                required: ["label", "value"],
              },
            },
            hasUniqueValue: {
              type: SchemaType.BOOLEAN,
              description:
                "Optional: Set to true to enforce unique values for this property.",
            },
            // Add calculation formula fields if type is calculation_equation
          },
          required: [
            "objectType",
            "name",
            "label",
            "groupName",
            "type",
            "fieldType",
          ],
        },
      },

      // --- Batch Operations ---
      // Contacts
      {
        name: "hubspot_batchCreateContacts",
        description: "Create multiple contacts in a single batch request.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            inputs: {
              type: SchemaType.ARRAY,
              description:
                "Required array of contact objects to create. Each object contains contact properties.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  // Reflects properties within each input object
                  email: { type: SchemaType.STRING },
                  firstName: { type: SchemaType.STRING },
                  lastName: { type: SchemaType.STRING },
                  // Include other optional properties as needed...
                  otherProperties: { type: SchemaType.OBJECT },
                },
                required: ["email"], // Typically email is required per contact
              },
            },
          },
          required: ["inputs"],
        },
      },
      {
        name: "hubspot_batchUpdateContacts",
        description: "Update multiple contacts in a single batch request.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            inputs: {
              type: SchemaType.ARRAY,
              description: "Required array of contact update objects.",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: {
                    type: SchemaType.STRING,
                    description: "HubSpot ID of the contact to update.",
                  },
                  properties: {
                    type: SchemaType.OBJECT,
                    description:
                      "Object containing properties to update (key-value pairs using internal names).",
                  },
                },
                required: ["id", "properties"],
              },
            },
          },
          required: ["inputs"],
        },
      },
      {
        name: "hubspot_batchReadContacts",
        description: "Read multiple contacts by ID in a single batch request.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ids: {
              // Simpler for read - just provide IDs
              type: SchemaType.ARRAY,
              description: "Required array of contact IDs to read.",
              items: { type: SchemaType.STRING },
            },
            properties: {
              type: SchemaType.ARRAY,
              description:
                "Optional list of specific internal property names to retrieve for each contact.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["ids"],
        },
      },
      {
        name: "hubspot_batchArchiveContacts",
        description:
          "Archive (soft delete) multiple contacts by ID in a single batch request.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ids: {
              // Simpler for archive - just provide IDs
              type: SchemaType.ARRAY,
              description: "Required array of contact IDs to archive.",
              items: { type: SchemaType.STRING },
            },
          },
          required: ["ids"],
        },
      },
      {
        name: DOMAction.reportCurrentState.name,
        description: DOMAction.reportCurrentState.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            current_state: {
              type: SchemaType.OBJECT,
              description:
                "Current state of the task, reflecting the context of other function calls in the response",
              properties: {
                page_summary: {
                  type: SchemaType.STRING,
                  description:
                    "Summary of the current page, reflecting actions taken or expected",
                },
                evaluation_previous_goal: {
                  type: SchemaType.STRING,
                  description:
                    "Evaluation of the previous goal based on prior actions",
                },
                memory: {
                  type: SchemaType.OBJECT,
                  description: "Memory context tracking task steps",
                  properties: {
                    steps: {
                      type: SchemaType.ARRAY,
                      description: "List of task steps with their status",
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          step_number: {
                            type: SchemaType.STRING,
                            description: "Step identifier, e.g., 'Step 1'",
                          },
                          description: {
                            type: SchemaType.STRING,
                            description: "Description of the step",
                          },
                          status: {
                            type: SchemaType.STRING,
                            enum: ["PENDING", "IN_PROGRESS", "PASS", "FAIL"],
                            description: "Status of the step",
                          },
                        },
                        required: ["step_number", "description", "status"],
                      },
                    },
                  },
                  required: ["steps"],
                },
                current_goal: {
                  type: SchemaType.STRING,
                  description:
                    "Current goal of the task, aligned with other function calls",
                },
              },
              required: [
                "page_summary",
                "evaluation_previous_goal",
                "memory",
                "current_goal",
              ],
            },
          },
          required: ["current_state"],
        },
      },
    ],
  },
];

// Note: The 'hubspot_loginToHubspot' tool has been removed due to security concerns
// with handling credentials like passwords/API keys directly via AI parameters.
// Authentication should be managed securely by the backend executor.
