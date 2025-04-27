import { SchemaType, Tool } from "@google/generative-ai";

/**
 * HubSpot function tools for Gemini AI
 *
 * This file defines the function declarations that Gemini AI can use
 * to interact with HubSpot. When the user sends a command related to HubSpot,
 * Gemini AI will respond with the appropriate function call, which the extension
 * will then execute.
 */

export const hubspotTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "hubspot_navigateTo",
        description: "Navigate to a specific section in HubSpot",
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
              ],
              description: "Required section to navigate to in HubSpot",
            },
            subsection: {
              type: SchemaType.STRING,
              description: "Optional subsection to navigate to",
            },
          },
          required: ["section"],
        },
      },
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
                "Optional additional properties for the contact as key-value pairs",
            },
          },
          required: ["email"],
        },
      },
      {
        name: "hubspot_searchContacts",
        description: "Search for contacts in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            searchTerm: {
              type: SchemaType.STRING,
              description: "Required search term to look for in contacts",
            },
            filterProperty: {
              type: SchemaType.STRING,
              description:
                "Optional property to filter by (e.g., 'email', 'firstname', 'lastname')",
            },
            filterValue: {
              type: SchemaType.STRING,
              description:
                "Optional value to filter by, used with filterProperty",
            },
            limit: {
              type: SchemaType.NUMBER,
              description: "Optional maximum number of contacts to return",
            },
          },
          required: ["searchTerm"],
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
                "Optional additional properties for the company as key-value pairs",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "hubspot_searchCompanies",
        description: "Search for companies in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            searchTerm: {
              type: SchemaType.STRING,
              description: "Required search term to look for in companies",
            },
            filterProperty: {
              type: SchemaType.STRING,
              description:
                "Optional property to filter by (e.g., 'name', 'domain', 'industry')",
            },
            filterValue: {
              type: SchemaType.STRING,
              description:
                "Optional value to filter by, used with filterProperty",
            },
            limit: {
              type: SchemaType.NUMBER,
              description: "Optional maximum number of companies to return",
            },
          },
          required: ["searchTerm"],
        },
      },
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
              description: "Optional pipeline name for the deal",
            },
            stage: {
              type: SchemaType.STRING,
              description: "Optional stage in the pipeline for the deal",
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
                "Optional additional properties for the deal as key-value pairs",
            },
          },
          required: ["dealName"],
        },
      },
      {
        name: "hubspot_updateDealStage",
        description: "Update the stage of a deal in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            dealId: {
              type: SchemaType.STRING,
              description: "Required ID of the deal to update",
            },
            stage: {
              type: SchemaType.STRING,
              description: "Required new stage for the deal",
            },
            reason: {
              type: SchemaType.STRING,
              description: "Optional reason for the stage update",
            },
          },
          required: ["dealId", "stage"],
        },
      },
      {
        name: "hubspot_searchDeals",
        description: "Search for deals in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            searchTerm: {
              type: SchemaType.STRING,
              description: "Required search term to look for in deals",
            },
            filterProperty: {
              type: SchemaType.STRING,
              description:
                "Optional property to filter by (e.g., 'dealname', 'amount', 'pipeline')",
            },
            filterValue: {
              type: SchemaType.STRING,
              description:
                "Optional value to filter by, used with filterProperty",
            },
            limit: {
              type: SchemaType.NUMBER,
              description: "Optional maximum number of deals to return",
            },
          },
          required: ["searchTerm"],
        },
      },
      {
        name: "hubspot_createTicket",
        description: "Create a new support ticket in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            subject: {
              type: SchemaType.STRING,
              description: "Required subject of the ticket",
            },
            content: {
              type: SchemaType.STRING,
              description: "Required content/description of the ticket",
            },
            pipeline: {
              type: SchemaType.STRING,
              description: "Optional pipeline name for the ticket",
            },
            stage: {
              type: SchemaType.STRING,
              description: "Optional stage in the pipeline for the ticket",
            },
            priority: {
              type: SchemaType.STRING,
              enum: ["low", "medium", "high", "critical"],
              description: "Optional priority of the ticket",
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
                "Optional additional properties for the ticket as key-value pairs",
            },
          },
          required: ["subject", "content"],
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
            stage: {
              type: SchemaType.STRING,
              description: "Optional updated stage",
            },
            priority: {
              type: SchemaType.STRING,
              enum: ["low", "medium", "high", "critical"],
              description: "Optional updated priority",
            },
            otherProperties: {
              type: SchemaType.OBJECT,
              description:
                "Optional additional properties to update as key-value pairs",
            },
          },
          required: ["ticketId"],
        },
      },
      {
        name: "hubspot_addNoteToContact",
        description: "Add a note to a contact in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            contactId: {
              type: SchemaType.STRING,
              description: "Required ID of the contact to add a note to",
            },
            content: {
              type: SchemaType.STRING,
              description: "Required content of the note",
            },
          },
          required: ["contactId", "content"],
        },
      },
      {
        name: "hubspot_scheduleContactMeeting",
        description: "Schedule a meeting with a contact in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            contactId: {
              type: SchemaType.STRING,
              description:
                "Required ID of the contact to schedule a meeting with",
            },
            title: {
              type: SchemaType.STRING,
              description: "Required title of the meeting",
            },
            startTime: {
              type: SchemaType.STRING,
              description:
                "Required start time of the meeting (ISO format: YYYY-MM-DDTHH:MM:SS)",
            },
            endTime: {
              type: SchemaType.STRING,
              description:
                "Required end time of the meeting (ISO format: YYYY-MM-DDTHH:MM:SS)",
            },
            description: {
              type: SchemaType.STRING,
              description: "Optional description of the meeting",
            },
            location: {
              type: SchemaType.STRING,
              description: "Optional location of the meeting",
            },
          },
          required: ["contactId", "title", "startTime", "endTime"],
        },
      },
      {
        name: "hubspot_createTask",
        description: "Create a task in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            subject: {
              type: SchemaType.STRING,
              description: "Required subject of the task",
            },
            body: {
              type: SchemaType.STRING,
              description: "Optional body/description of the task",
            },
            dueDate: {
              type: SchemaType.STRING,
              description:
                "Optional due date for the task (ISO format: YYYY-MM-DD)",
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
              description: "Optional status of the task",
            },
            priority: {
              type: SchemaType.STRING,
              enum: ["HIGH", "MEDIUM", "LOW"],
              description: "Optional priority of the task",
            },
            associatedCompanyId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the company to associate with this task",
            },
            associatedContactId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the contact to associate with this task",
            },
            associatedDealId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the deal to associate with this task",
            },
            associatedTicketId: {
              type: SchemaType.STRING,
              description:
                "Optional ID of the ticket to associate with this task",
            },
          },
          required: ["subject"],
        },
      },
      {
        name: "hubspot_sendEmail",
        description: "Send an email to a contact through HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            contactId: {
              type: SchemaType.STRING,
              description: "Required ID of the contact to email",
            },
            subject: {
              type: SchemaType.STRING,
              description: "Required subject of the email",
            },
            body: {
              type: SchemaType.STRING,
              description: "Required body of the email",
            },
            isHTML: {
              type: SchemaType.BOOLEAN,
              description:
                "Optional flag indicating if the body is HTML (default: false)",
            },
            templateId: {
              type: SchemaType.STRING,
              description: "Optional template ID to use for the email",
            },
            attachments: {
              type: SchemaType.ARRAY,
              description: "Optional array of file URLs to attach to the email",
              items: {
                type: SchemaType.STRING,
              },
            },
          },
          required: ["contactId", "subject", "body"],
        },
      },
      {
        name: "hubspot_createList",
        description: "Create a list of contacts in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
              description: "Required name of the list",
            },
            type: {
              type: SchemaType.STRING,
              enum: ["STATIC", "DYNAMIC"],
              description: "Required type of list",
            },
            description: {
              type: SchemaType.STRING,
              description: "Optional description of the list",
            },
            contactIds: {
              type: SchemaType.ARRAY,
              description:
                "Optional array of contact IDs to add to the list (for STATIC lists)",
              items: {
                type: SchemaType.STRING,
              },
            },
            filters: {
              type: SchemaType.ARRAY,
              description:
                "Optional array of filter objects (for DYNAMIC lists)",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  property: {
                    type: SchemaType.STRING,
                    description: "Property to filter by",
                  },
                  operator: {
                    type: SchemaType.STRING,
                    description: "Operator for the filter",
                  },
                  value: {
                    type: SchemaType.STRING,
                    description: "Value for the filter",
                  },
                },
                required: ["property", "operator"],
              },
            },
          },
          required: ["name", "type"],
        },
      },
      {
        name: "hubspot_getAnalytics",
        description: "Get analytics data from HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            metric: {
              type: SchemaType.STRING,
              enum: [
                "visits",
                "contacts",
                "deals",
                "emails",
                "forms",
                "social",
                "workflows",
              ],
              description: "Required metric type to retrieve",
            },
            period: {
              type: SchemaType.STRING,
              enum: ["day", "week", "month", "quarter", "year"],
              description: "Optional time period for the analytics",
            },
            startDate: {
              type: SchemaType.STRING,
              description:
                "Optional start date for the analytics (ISO format: YYYY-MM-DD)",
            },
            endDate: {
              type: SchemaType.STRING,
              description:
                "Optional end date for the analytics (ISO format: YYYY-MM-DD)",
            },
          },
          required: ["metric"],
        },
      },
      {
        name: "hubspot_loginToHubspot",
        description: "Log in to HubSpot using provided credentials",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            email: {
              type: SchemaType.STRING,
              description: "Required email address for HubSpot login",
            },
            password: {
              type: SchemaType.STRING,
              description:
                "Optional password for HubSpot login (not recommended for security reasons)",
            },
            useOAuth: {
              type: SchemaType.BOOLEAN,
              description:
                "Optional flag to use OAuth authentication instead of password",
            },
            apiKey: {
              type: SchemaType.STRING,
              description: "Optional API key for HubSpot authentication",
            },
          },
          required: ["email"],
        },
      },
      {
        name: "hubspot_runWorkflow",
        description: "Run a workflow in HubSpot",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            workflowId: {
              type: SchemaType.STRING,
              description: "Required ID of the workflow to run",
            },
            contactIds: {
              type: SchemaType.ARRAY,
              description:
                "Optional array of contact IDs to enroll in the workflow",
              items: {
                type: SchemaType.STRING,
              },
            },
            companyIds: {
              type: SchemaType.ARRAY,
              description:
                "Optional array of company IDs to enroll in the workflow",
              items: {
                type: SchemaType.STRING,
              },
            },
            dealIds: {
              type: SchemaType.ARRAY,
              description:
                "Optional array of deal IDs to enroll in the workflow",
              items: {
                type: SchemaType.STRING,
              },
            },
            ticketIds: {
              type: SchemaType.ARRAY,
              description:
                "Optional array of ticket IDs to enroll in the workflow",
              items: {
                type: SchemaType.STRING,
              },
            },
          },
          required: ["workflowId"],
        },
      },
    ],
  },
];
