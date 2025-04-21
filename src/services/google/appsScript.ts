/**
 * Executes a Google Apps Script function via its web app deployment URL.
 *
 * @param scriptUrl The deployment URL of the Google Apps Script web app.
 * @param functionName The name of the function to execute in the Apps Script project.
 * @param parameters The parameters to pass to the Apps Script function.
 * @returns The result returned by the Apps Script function.
 */
export async function executeAppsScript(
  scriptUrl: string,
  functionName: string,
  parameters: any
): Promise<any> {
  // TODO: Replace with your actual Apps Script Web App URL
  const placeholderScriptUrl =
    "https://script.google.com/macros/s/AKfycbyL5fDyuLnvjMQjNy1yanpAMyEE0iPPUmsbkoKxhZy8ZmdyLru_5Hr1rl5JWVYTGRdZ/exec";

  if (scriptUrl === placeholderScriptUrl || !scriptUrl) {
    console.warn(
      "executeAppsScript: Placeholder or missing Apps Script URL. Skipping execution."
    );
    // Return a mock success or handle as needed when URL is not configured
    return {
      success: true,
      message: "Skipped execution due to missing Apps Script URL.",
    };
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ function: functionName, parameters }),
      // Consider adding mode: 'cors' if needed, depending on Apps Script setup
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Apps Script execution failed: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Apps Script execution successful:", result);
    return result;
  } catch (error) {
    console.error("Error executing Apps Script:", error);
    throw error; // Re-throw the error to be handled by the caller
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
