/**
 * Executes a specified Google Apps Script function by sending a POST request
 * to a configured web app URL with the required payload.
 *
 * @param functionName - The name of the Apps Script function to execute.
 *                       Supported values are:
 *                       - "insertStructuredDocContent"
 *                       - "createNewGoogleDoc"
 *                       - "callWorkspaceAppsScript"
 * @param argsFromGemini - The arguments required for the specified function.
 *                         The structure of this object depends on the function:
 *                         - For "insertStructuredDocContent":
 *                           - `fileId` (string): The ID of the Google Doc.
 *                           - `content` (array): The content to insert.
 *                         - For "createNewGoogleDoc":
 *                           - `fileName` (string, optional): The name of the new Google Doc.
 *                           - `content` (array, optional): The initial content for the document.
 *                         - For "callWorkspaceAppsScript":
 *                           - `scriptFunction` (string): The Apps Script function to call.
 *                           - `fileId` (string): The ID of the Google Doc.
 *                           - `functionArgs` (object, optional): Additional arguments for the script function.
 *
 * @returns A promise that resolves with the result of the Apps Script execution.
 *          If the execution fails, the promise is rejected with an error.
 *
 * @throws Will throw an error if:
 *         - The `webAppUrl` is not configured.
 *         - The `functionName` is unsupported.
 *         - Required parameters for the specified function are missing.
 *         - The Apps Script execution fails or returns an error.
 */
export async function executeAppsScriptFunction(
  functionName: string,
  argsFromGemini: any
): Promise<any> {
  const webAppUrl =
    "https://script.google.com/macros/s/AKfycbyL5fDyuLnvjMQjNy1yanpAMyEE0iPPUmsbkoKxhZy8ZmdyLru_5Hr1rl5JWVYTGRdZ/exec";

  if (!webAppUrl) {
    throw new Error("Apps Script Web App URL is not configured.");
  }

  console.log(`[background.ts] Preparing to call: ${functionName}`);
  console.log(`[background.ts] Args from Gemini:`, argsFromGemini);

  let payloadForAppsScript: any = {};

  switch (functionName) {
    case "insertStructuredDocContent":
      if (!argsFromGemini.fileId || !Array.isArray(argsFromGemini.content)) {
        throw new Error(
          "Missing required parameters 'fileId' or 'content' array."
        );
      }

      payloadForAppsScript = {
        scriptFunction: "insertStructuredDocContent",
        fileId: argsFromGemini.fileId,
        content: argsFromGemini.content,
      };
      break;

    case "createNewGoogleDoc":
      payloadForAppsScript = {
        scriptFunction: "createNewGoogleDoc",
        fileName: argsFromGemini.fileName || "Untitled",
        content: argsFromGemini.content || [],
      };
      break;

    case "callWorkspaceAppsScript":
      if (!argsFromGemini.scriptFunction || !argsFromGemini.fileId) {
        throw new Error("Missing required 'scriptFunction' or 'fileId'.");
      }

      payloadForAppsScript = {
        scriptFunction: argsFromGemini.scriptFunction,
        fileId: argsFromGemini.fileId,
        functionArgs: argsFromGemini.functionArgs || {},
      };
      break;

    default:
      throw new Error(`Unsupported function name: ${functionName}`);
  }

  try {
    console.log(`[background.ts] Payload:`, payloadForAppsScript);

    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify(payloadForAppsScript),
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new Error(
        `Apps Script failed (${response.status}): ${errorResponse}`
      );
    }

    const result = await response.json();

    if (result.status === "error") {
      throw new Error(`Apps Script error: ${result.message}`);
    }

    console.log("[background.ts] Apps Script Result:", result);
    return result;
  } catch (error) {
    console.error(`[background.ts] Error:`, error);
    throw error;
  }
}

/**
 * Logs data to a specific Google Sheet using a predefined Apps Script function.
 *
 * @param data The data object to log. Should contain fields expected by the Apps Script function.
 */
export async function logToGoogleSheet(data: any): Promise<void> {
  // Configuration for Google Sheets API
  const sheetId = "1tE_DOOyTp19XgHJd2esdOdQZEQMhEE0cDmr_731mhAA";

  const range = "Sheet1!A:D";
  // Append values as new rows, keeping existing data
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const row = [
    data.timestamp,
    data.provider,
    JSON.stringify(data.request),
    JSON.stringify(data.response),
  ];

  try {
    const token = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Log the specific error from the Sheets API instead of throwing immediately
      console.error(
        `Sheets API error ${response.status}: ${response.statusText} - ${errorText}`
      );
      // Optionally, you could still throw if needed:
      // throw new Error(`Sheets API error ${response.status}: ${response.statusText} - ${errorText}`);
    } else {
      // Log success and the API response body for confirmation
      const successResult = await response.json();
      console.log(
        "Data logged to Google Sheet successfully. API Response:",
        successResult
      );
    }
  } catch (error) {
    // Catch fetch/network errors
    console.error("Failed to log data to Google Sheet (fetch error):", error);
  }
}
