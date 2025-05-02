import { SchemaType, Tool, FunctionDeclaration } from "@google/generative-ai";

// --- Reusable Schemas ---
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

// --- Master List of ALL Function Declarations ---
// (Contains the full definition for every possible function)
const allHubspotFunctionDeclarations: FunctionDeclaration[] = [
  // --- Contacts ---
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
          description: "Optional first name",
        },
        lastName: {
          type: SchemaType.STRING,
          description: "Optional last name",
        },
        phone: {
          type: SchemaType.STRING,
          description: "Optional phone number",
        },
        company: {
          type: SchemaType.STRING,
          description: "Optional company name",
        },
        jobTitle: {
          type: SchemaType.STRING,
          description: "Optional job title",
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
          description: "Optional lifecycle stage",
        },
        otherProperties: {
          type: SchemaType.OBJECT,
          description:
            "Optional additional properties as key-value pairs (use internal names). Example: {'custom_property': 'value'}",
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
          description: "Required HubSpot ID of the contact",
        },
        properties: {
          type: SchemaType.ARRAY,
          description:
            "Optional list of specific internal property names to retrieve",
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
            "Optional additional properties to update as key-value pairs",
        },
      },
      required: ["contactId"],
    },
  },
  {
    name: "hubspot_deleteContact",
    description: "Delete a contact in HubSpot by its ID (use with caution!)",
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
  // --- Companies ---
  {
    name: "hubspot_createCompany",
    description: "Create a new company in HubSpot",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Required company name" },
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
        city: { type: SchemaType.STRING, description: "Optional company city" },
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
          description: "Optional additional properties as key-value pairs",
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
          description: "Required HubSpot ID of the company",
        },
        properties: {
          type: SchemaType.ARRAY,
          description:
            "Optional list of specific internal property names to retrieve",
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
          description: "Optional updated domain",
        },
        industry: {
          type: SchemaType.STRING,
          description: "Optional updated industry",
        },
        phone: {
          type: SchemaType.STRING,
          description: "Optional updated phone",
        },
        city: { type: SchemaType.STRING, description: "Optional updated city" },
        state: {
          type: SchemaType.STRING,
          description: "Optional updated state/region",
        },
        country: {
          type: SchemaType.STRING,
          description: "Optional updated country",
        },
        otherProperties: {
          type: SchemaType.OBJECT,
          description: "Optional additional properties to update",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "hubspot_deleteCompany",
    description: "Delete a company in HubSpot by its ID (use with caution!)",
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
  // --- Deals ---
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
          description: "Required pipeline ID or name",
        },
        stage: {
          type: SchemaType.STRING,
          description: "Required stage ID or name",
        },
        amount: {
          type: SchemaType.NUMBER,
          description: "Optional deal amount",
        },
        closeDate: {
          type: SchemaType.STRING,
          description: "Optional close date (ISO: YYYY-MM-DD)",
        },
        dealType: {
          type: SchemaType.STRING,
          description: "Optional deal type",
        },
        associatedCompanyId: {
          type: SchemaType.STRING,
          description: "Optional associated company ID",
        },
        associatedContactIds: {
          type: SchemaType.ARRAY,
          description: "Optional IDs of contacts to associate",
          items: { type: SchemaType.STRING },
        },
        otherProperties: {
          type: SchemaType.OBJECT,
          description: "Optional additional properties",
        },
      },
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
          description: "Required HubSpot ID of the deal",
        },
        properties: {
          type: SchemaType.ARRAY,
          description: "Optional list of property names to retrieve",
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
          description: "Optional updated name",
        },
        pipeline: {
          type: SchemaType.STRING,
          description: "Optional updated pipeline ID/name",
        },
        stage: {
          type: SchemaType.STRING,
          description: "Optional updated stage ID/name",
        },
        amount: {
          type: SchemaType.NUMBER,
          description: "Optional updated amount",
        },
        closeDate: {
          type: SchemaType.STRING,
          description: "Optional updated close date (ISO: YYYY-MM-DD)",
        },
        dealType: {
          type: SchemaType.STRING,
          description: "Optional updated deal type",
        },
        otherProperties: {
          type: SchemaType.OBJECT,
          description: "Optional additional properties to update",
        },
      },
      required: ["dealId"],
    },
  },
  {
    name: "hubspot_updateDealStage",
    description: "Update the stage of a specific deal in HubSpot",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        dealId: {
          type: SchemaType.STRING,
          description: "Required ID of the deal",
        },
        stage: {
          type: SchemaType.STRING,
          description: "Required new stage ID or name",
        },
        pipeline: {
          type: SchemaType.STRING,
          description:
            "Optional pipeline ID/name (if stage is in different pipeline)",
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
  // --- Tickets ---
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
          description: "Optional content/description",
        },
        pipeline: {
          type: SchemaType.STRING,
          description: "Required pipeline ID or name",
        },
        stage: {
          type: SchemaType.STRING,
          description: "Required stage ID or name in the pipeline",
        },
        priority: {
          type: SchemaType.STRING,
          description: "Optional priority (e.g., 'high', 'medium', 'low')",
        },
        associatedCompanyId: {
          type: SchemaType.STRING,
          description: "Optional associated company ID",
        },
        associatedContactId: {
          type: SchemaType.STRING,
          description: "Optional associated contact ID",
        },
        otherProperties: {
          type: SchemaType.OBJECT,
          description: "Optional additional properties",
        },
      },
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
          description: "Required HubSpot ID of the ticket",
        },
        properties: {
          type: SchemaType.ARRAY,
          description: "Optional list of property names to retrieve",
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
          description: "Optional updated content",
        },
        pipeline: {
          type: SchemaType.STRING,
          description: "Optional updated pipeline ID/name",
        },
        stage: {
          type: SchemaType.STRING,
          description: "Optional updated stage ID/name",
        },
        priority: {
          type: SchemaType.STRING,
          description: "Optional updated priority",
        },
        otherProperties: {
          type: SchemaType.OBJECT,
          description: "Optional additional properties to update",
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
  {
    name: "hubspot_searchContacts",
    description: "Search for contacts in HubSpot based on a general term.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Required search query term",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Optional max number of results",
        },
        after: {
          type: SchemaType.STRING,
          description: "Optional pagination cursor",
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
          description: "Required search query term",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Optional max number of results",
        },
        after: {
          type: SchemaType.STRING,
          description: "Optional pagination cursor",
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
          description: "Required search query term",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Optional max number of results",
        },
        after: {
          type: SchemaType.STRING,
          description: "Optional pagination cursor",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "hubspot_advancedSearch",
    description:
      "Perform an advanced search for CRM objects using complex filters and sorting.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        objectType: {
          type: SchemaType.STRING,
          enum: ["contacts", "companies", "deals", "tickets"],
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
          description: "Optional max number of results per page",
        },
        after: {
          type: SchemaType.STRING,
          description: "Optional pagination cursor",
        },
      },
      required: ["objectType", "filterGroups"],
    },
  },
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
          enum: ["CONTACT", "COMPANY", "DEAL", "TICKET"],
          description: "Optional type of associated object to filter by.",
        },
        associatedObjectId: {
          type: SchemaType.STRING,
          description: "Optional ID of the associated object",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Optional max number of results",
        },
        after: {
          type: SchemaType.STRING,
          description: "Optional pagination cursor",
        },
      },
      required: [],
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
          description: "Required object type of the primary record",
        },
        fromObjectId: {
          type: SchemaType.STRING,
          description: "Required ID of the primary record",
        },
        toObjectType: {
          type: SchemaType.STRING,
          description: "Required object type of the record to associate to",
        },
        toObjectId: {
          type: SchemaType.STRING,
          description: "Required ID of the record to associate to",
        },
        associationType: {
          type: SchemaType.STRING,
          description: "Optional type/label of the association",
        },
        associationCategory: {
          type: SchemaType.STRING,
          enum: ["HUBSPOT_DEFINED", "USER_DEFINED"],
          description:
            "Required category for labeled associations ('USER_DEFINED' for custom). Omit for default.",
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
          description: "Required object type of the primary record",
        },
        objectId: {
          type: SchemaType.STRING,
          description: "Required ID of the primary record",
        },
        associatedObjectType: {
          type: SchemaType.STRING,
          description:
            "Required object type of the associated records to retrieve",
        },
        after: {
          type: SchemaType.STRING,
          description: "Optional pagination cursor",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Optional max number of associated records",
        },
      },
      required: ["objectType", "objectId", "associatedObjectType"],
    },
  },
  // --- Engagements (Activities) ---
  {
    name: "hubspot_addNote",
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
          description: "Optional IDs of contacts",
        },
        associatedCompanyIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of companies",
        },
        associatedDealIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of deals",
        },
        associatedTicketIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of tickets",
        },
        timestamp: {
          type: SchemaType.STRING,
          description:
            "Optional timestamp (ISO: YYYY-MM-DDTHH:MM:SSZ). Defaults to now.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "hubspot_scheduleMeeting",
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
          description: "Required start time (ISO: YYYY-MM-DDTHH:MM:SSZ).",
        },
        endTime: {
          type: SchemaType.STRING,
          description: "Required end time (ISO: YYYY-MM-DDTHH:MM:SSZ).",
        },
        body: {
          type: SchemaType.STRING,
          description: "Optional description/body (hs_meeting_body).",
        },
        location: {
          type: SchemaType.STRING,
          description: "Optional location (hs_meeting_location).",
        },
        meetingOutcome: {
          type: SchemaType.STRING,
          description: "Optional outcome (hs_meeting_outcome).",
        },
        associatedContactIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of contacts",
        },
        associatedCompanyIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of companies",
        },
        associatedDealIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of deals",
        },
        associatedTicketIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of tickets",
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
          type: SchemaType.STRING,
          description: "Required subject/title (hs_task_subject).",
        },
        body: {
          type: SchemaType.STRING,
          description: "Optional body/description (hs_task_body).",
        },
        dueDate: {
          type: SchemaType.STRING,
          description:
            "Optional due date/time (hs_timestamp) (ISO: YYYY-MM-DDTHH:MM:SSZ or YYYY-MM-DD).",
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
          description: "Optional status (hs_task_status).",
        },
        priority: {
          type: SchemaType.STRING,
          enum: ["HIGH", "MEDIUM", "LOW"],
          description: "Optional priority (hs_task_priority).",
        },
        taskType: {
          type: SchemaType.STRING,
          enum: ["EMAIL", "CALL", "TODO"],
          description: "Optional type (hs_task_type).",
        },
        reminderDate: {
          type: SchemaType.STRING,
          description:
            "Optional reminder date/time (hs_task_reminders) (ISO format).",
        },
        associatedContactIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of contacts",
        },
        associatedCompanyIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of companies",
        },
        associatedDealIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of deals",
        },
        associatedTicketIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of tickets",
        },
        ownerId: {
          type: SchemaType.STRING,
          description: "Optional ID of the HubSpot user to assign the task to.",
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
          type: SchemaType.STRING,
          description: "Optional title/subject (hs_call_title).",
        },
        startTime: {
          type: SchemaType.STRING,
          description:
            "Required start time (hs_timestamp) (ISO: YYYY-MM-DDTHH:MM:SSZ).",
        },
        callDuration: {
          type: SchemaType.NUMBER,
          description: "Optional duration in milliseconds (hs_call_duration).",
        },
        callDirection: {
          type: SchemaType.STRING,
          enum: ["INBOUND", "OUTBOUND"],
          description: "Optional direction (hs_call_direction).",
        },
        callStatus: {
          type: SchemaType.STRING,
          enum: ["COMPLETED", "CANCELED", "BUSY", "NO_ANSWER", "FAILED"],
          description: "Required status (hs_call_status).",
        },
        body: {
          type: SchemaType.STRING,
          description: "Optional notes/description (hs_call_body).",
        },
        recordingUrl: {
          type: SchemaType.STRING,
          description: "Optional URL to recording (hs_call_recording_url).",
        },
        toNumber: {
          type: SchemaType.STRING,
          description: "Optional 'to' number (hs_call_to_number).",
        },
        fromNumber: {
          type: SchemaType.STRING,
          description: "Optional 'from' number (hs_call_from_number).",
        },
        disposition: {
          type: SchemaType.STRING,
          description: "Optional call disposition ID (hs_call_disposition).",
        },
        associatedContactIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of contacts",
        },
        associatedCompanyIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of companies",
        },
        associatedDealIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of deals",
        },
        associatedTicketIds: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Optional IDs of tickets",
        },
        ownerId: {
          type: SchemaType.STRING,
          description: "Optional ID of the user who made/received call.",
        },
      },
      required: ["startTime", "callStatus"],
    },
  },
  {
    name: "hubspot_sendEmail",
    description: "Send a one-to-one email, logged to a contact via HubSpot.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        toContactId: {
          type: SchemaType.STRING,
          description:
            "Required ID of the primary contact recipient to log against.",
        },
        fromUserId: {
          type: SchemaType.STRING,
          description: "Optional ID of the HubSpot sending user.",
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
      },
      required: ["toContactId", "subject", "body"],
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
  {
    name: "hubspot_deleteEngagement",
    description:
      "Delete an engagement (task, note, call, meeting, email) by its ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        engagementType: {
          type: SchemaType.STRING,
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
          type: SchemaType.STRING,
          enum: ["STATIC", "DYNAMIC"],
          description: "Required type of list (STATIC or DYNAMIC).",
        },
        filters: {
          type: SchemaType.ARRAY,
          description:
            "Required array of filter branches for DYNAMIC lists (complex structure).",
          items: { type: SchemaType.OBJECT },
        },
      },
      required: ["name", "listType"],
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
          type: SchemaType.NUMBER,
          description: "Optional offset for pagination (vid offset).",
        },
        includeProperties: {
          type: SchemaType.ARRAY,
          description: "Optional list of contact properties to include.",
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
  {
    name: "hubspot_submitForm",
    description: "Submit data to a HubSpot form.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
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
              description: "URL of the page where form was submitted.",
            },
            pageName: {
              type: SchemaType.STRING,
              description: "Title of the page where form was submitted.",
            },
          },
        },
      },
      required: ["formGuid", "fields"],
    },
  },
  // --- Automation ---
  {
    name: "hubspot_runWorkflow",
    description: "Enroll records into a HubSpot workflow.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        workflowId: {
          type: SchemaType.STRING,
          description: "Required ID of the workflow.",
        },
        emails: {
          type: SchemaType.ARRAY,
          description: "Required array of contact email addresses to enroll.",
          items: { type: SchemaType.STRING },
        },
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
        dataType: {
          type: SchemaType.STRING,
          enum: [
            "WEBSITE_VISITS",
            "CONTACT_CREATION",
            "DEAL_CREATION",
            "FORM_SUBMISSIONS",
            "EMAIL_PERFORMANCE",
          ],
          description: "Required type of analytics data.",
        },
        timePeriod: {
          type: SchemaType.STRING,
          enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
          description: "Optional aggregation time period.",
        },
        startDate: {
          type: SchemaType.STRING,
          description: "Optional start date (ISO: YYYY-MM-DD).",
        },
        endDate: {
          type: SchemaType.STRING,
          description: "Optional end date (ISO: YYYY-MM-DD).",
        },
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
          description: "Required object type (e.g., 'contacts', 'deals').",
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
          description: "Required object type.",
        },
        name: {
          type: SchemaType.STRING,
          description: "Required internal name (lowercase, underscores).",
        },
        label: {
          type: SchemaType.STRING,
          description: "Required display label.",
        },
        groupName: {
          type: SchemaType.STRING,
          description: "Required internal name of property group.",
        },
        type: {
          type: SchemaType.STRING,
          enum: ["string", "number", "date", "datetime", "enumeration", "bool"],
          description: "Required data type.",
        },
        fieldType: {
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
          ],
          description: "Required UI field type.",
        },
        description: {
          type: SchemaType.STRING,
          description: "Optional description.",
        },
        options: {
          type: SchemaType.ARRAY,
          description: "Required for enumeration types. Array of options.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              label: {
                type: SchemaType.STRING,
                description: "Display label for option.",
              },
              value: {
                type: SchemaType.STRING,
                description: "Internal value for option.",
              },
              displayOrder: {
                type: SchemaType.NUMBER,
                description: "Optional display order.",
              },
              hidden: {
                type: SchemaType.BOOLEAN,
                description: "Optional flag if hidden.",
              },
            },
            required: ["label", "value"],
          },
        },
        hasUniqueValue: {
          type: SchemaType.BOOLEAN,
          description: "Optional: Set true to enforce unique values.",
        },
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
  {
    name: "hubspot_batchCreateContacts",
    description: "Create multiple contacts in a single batch request.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        inputs: {
          type: SchemaType.ARRAY,
          description: "Required array of contact objects to create.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              email: { type: SchemaType.STRING },
              firstName: { type: SchemaType.STRING },
              lastName: { type: SchemaType.STRING },
              otherProperties: { type: SchemaType.OBJECT },
            },
            required: ["email"],
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
                description: "HubSpot ID of contact.",
              },
              properties: {
                type: SchemaType.OBJECT,
                description: "Object of properties to update.",
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
          type: SchemaType.ARRAY,
          description: "Required array of contact IDs.",
          items: { type: SchemaType.STRING },
        },
        properties: {
          type: SchemaType.ARRAY,
          description: "Optional list of property names.",
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
          type: SchemaType.ARRAY,
          description: "Required array of contact IDs to archive.",
          items: { type: SchemaType.STRING },
        },
      },
      required: ["ids"],
    },
  },
  // --- Add other missing full parameter definitions if any ---
]; // End of master list

// --- Helper to find declarations by name from the master list ---
const findDecl = (name: string): FunctionDeclaration | undefined =>
  allHubspotFunctionDeclarations.find((fd) => fd.name === name);

// --- Define the names for each group, using keys matching slash commands ---
const toolGroups: { [key: string]: string[] } = {
  // Keys match the 'command' from hubspotSlashCommands
  contact: [
    "hubspot_createContact",
    "hubspot_getContactById",
    "hubspot_updateContact",
    "hubspot_deleteContact",
    "hubspot_sendEmail",
  ],
  company: [
    "hubspot_createCompany",
    "hubspot_getCompanyById",
    "hubspot_updateCompany",
    "hubspot_deleteCompany",
  ],
  deal: [
    "hubspot_createDeal",
    "hubspot_getDealById",
    "hubspot_updateDeal",
    "hubspot_updateDealStage",
    "hubspot_deleteDeal",
  ],
  ticket: [
    "hubspot_createTicket",
    "hubspot_getTicketById",
    "hubspot_updateTicket",
    "hubspot_deleteTicket",
  ],
  task: [
    // Grouping task-related + general engagement delete
    "hubspot_createTask",
    "hubspot_updateTask",
    "hubspot_deleteEngagement",
  ],
  note: ["hubspot_addNote"],
  meeting: ["hubspot_scheduleMeeting"],
  call: ["hubspot_logCall"],
  search: [
    // All search functions
    "hubspot_searchContacts",
    "hubspot_searchCompanies",
    "hubspot_searchDeals",
    "hubspot_advancedSearch",
    "hubspot_searchEngagements",
  ],
  list: [
    // Marketing lists & forms
    "hubspot_createList",
    "hubspot_addContactsToList",
    "hubspot_removeContactsFromList",
    "hubspot_getListMembers",
    "hubspot_deleteList",
    "hubspot_submitForm",
  ],
  workflow: ["hubspot_runWorkflow"],
  associate: ["hubspot_associateRecords", "hubspot_getAssociations"],
  utility: [
    "hubspot_getAnalytics",
    "hubspot_getProperties",
    "hubspot_createProperty",
    "hubspot_batchCreateContacts",
    "hubspot_batchUpdateContacts",
    "hubspot_batchReadContacts",
    "hubspot_batchArchiveContacts",
  ],
};

// --- Create the final array of distinct Tool objects, ready for selection ---
// Each object in this array represents a potential toolset to provide to the AI
export const hubspotModularTools: (Tool & { toolGroupName: string })[] =
  Object.entries(toolGroups)
    .map(([groupName, functionNames]) => {
      // Retrieve the full declarations for the names in this group
      const declarations = functionNames
        .map((name) => findDecl(name)) // Find the full object from the master list
        .filter((decl): decl is FunctionDeclaration => decl !== undefined); // Ensure it's found and satisfy TypeScript

      // Safety check: If for some reason no functions were found, warn and return null
      if (declarations.length === 0) {
        console.warn(
          `No function declarations found for tool group: ${groupName}`
        );
        return null;
      }

      // Create the Tool object for this specific group
      return {
        // Store the group name (matching the slash command or 'utility')
        // on the tool object itself for easier lookup based on user selection
        toolGroupName: groupName,
        functionDeclarations: declarations, // The array of functions for THIS group only
      };
    })
    .filter(
      (
        tool
      ): tool is Tool & {
        toolGroupName: string;
        functionDeclarations: FunctionDeclaration[];
      } => tool !== null && tool.functionDeclarations !== undefined
    );

/*
// Somewhere in your application logic where you handle the user's command:

let userSelectedCommand = "deal"; // Example: User typed '/deal' or selected it

// Find the specific Tool object from the pre-built array using the command name
const selectedTool = hubspotModularTools.find(tool => tool.toolGroupName === userSelectedCommand);

// Prepare the tools array for the AI model
// Important: The model expects an array of Tool objects.
const toolsForAI: Tool[] = selectedTool ? [selectedTool] : [];

// --- Initialize the Generative Model ---
// const generativeModel = vertex_ai.getGenerativeModel({ // Replace with your actual model initialization
//    model: 'gemini-1.5-flash-001', // Or your desired model
//    tools: toolsForAI, // Pass the array containing ONLY the selected tool object
// });

// console.log(`AI will be initialized with tool group: ${userSelectedCommand}`);
// console.log("Functions available to AI:", toolsForAI[0]?.functionDeclarations.map(f => f.name));

// Now the AI instance (`generativeModel`) will only be aware of and able to call
// functions within the 'deal' group (createDeal, getDealById, updateDeal, etc.).

*/
