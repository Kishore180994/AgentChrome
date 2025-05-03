// permission_popup.js

document.addEventListener("DOMContentLoaded", () => {
  // Get references to UI elements using the specified IDs
  const requestButton = document.getElementById("requestPermissionBtn"); // Get button by specific ID
  const statusMessage = document.getElementById("statusMessage"); // Get status element by specific ID

  /**
   * Sends a message back to the extension's other parts (like the side panel).
   * @param {object} message - The message object to send.
   */
  function sendMessageToExtension(message) {
    console.log("[Permission Popup] Sending message:", message);
    chrome.runtime.sendMessage(message, (response) => {
      // Check for errors during message sending
      if (chrome.runtime.lastError) {
        console.error(
          "[Permission Popup] Error sending message:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("[Permission Popup] Message response received:", response);
      }
      // Close the popup window after attempting to send the message
      // Use a delay to ensure the message has a chance to send before closing
      setTimeout(() => {
        window.close();
      }, 150); // Delay in milliseconds
    });
  }

  /**
   * Updates the status message in the popup UI.
   * @param {string} message - The text to display.
   * @param {boolean} isError - Optional flag to style as an error.
   * @param {boolean} showSettingsLink - Optional flag to show a link to extension settings.
   */
  const updateStatus = (message, isError = false, showSettingsLink = false) => {
    // Check if the status message element exists
    if (statusMessage) {
      statusMessage.textContent = message;
      // Apply basic styling based on whether it's an error
      statusMessage.style.color = isError ? "red" : "grey";
      statusMessage.style.display = "block"; // Ensure it's visible

      // Clear any previously added links or line breaks to prevent duplicates
      const existingLinks = statusMessage.querySelectorAll("a, br");
      existingLinks.forEach((el) => el.remove());

      // If requested, add a link to the extension's settings page
      if (showSettingsLink) {
        // Disable the request button if it exists and permission is denied
        if (requestButton) requestButton.disabled = true;

        // Construct the URL to the extension's site settings in Chrome
        const extensionId = chrome.runtime.id;
        const settingsUrl = `chrome://settings/content/siteDetails?site=chrome-extension%3A%2F%2F${extensionId}`;

        // Create the link element
        const settingsLink = document.createElement("a");
        settingsLink.href = settingsUrl;
        settingsLink.textContent = "Open Settings";
        settingsLink.target = "_blank"; // Ensure it opens in a new tab
        settingsLink.style.fontSize = "0.9em"; // Slightly smaller font
        settingsLink.style.marginLeft = "5px"; // Add some spacing

        // Append a line break and the link to the status message
        statusMessage.appendChild(document.createElement("br"));
        statusMessage.appendChild(settingsLink);
      } else {
        // Re-enable the request button if it exists and the settings link isn't shown
        if (requestButton) requestButton.disabled = false;
      }
    } else {
      // Log to console if the status element couldn't be found
      console.log(
        `[Permission Popup Status] ${isError ? "ERROR: " : ""}${message}`
      );
    }
  };

  /**
   * Handles the outcome of the permission request attempt.
   * This function is called internally after getUserMedia resolves or rejects.
   * @param {boolean} success - Whether the permission was granted.
   * @param {Error | null} error - The error object if permission failed, otherwise null.
   */
  const handlePermissionResult = (success, error = null) => {
    if (success) {
      // Permission was granted successfully
      updateStatus("Permission granted! Closing...", false);
      // Send a success message back to the extension
      sendMessageToExtension({ type: "MIC_PERMISSION_RESULT", success: true });
      // Note: sendMessageToExtension handles closing the window after a delay
    } else {
      // Permission request failed or was denied
      console.error(
        "[Permission Popup] Permission failed:",
        error?.name,
        error?.message
      );
      // Determine if the failure was specifically due to user denial
      const isDeniedByUser = error?.name === "NotAllowedError";
      // Prepare an appropriate error message
      const message = isDeniedByUser
        ? "Microphone permission denied. Please enable it in the extension settings."
        : `Error requesting permission: ${
            error?.name || "Unknown error"
          }. Closing...`;

      // Update the status message, showing the settings link only if denied by user
      updateStatus(message, true, isDeniedByUser);

      // Send a failure message back to the extension, including error details
      sendMessageToExtension({
        type: "MIC_PERMISSION_RESULT",
        success: false,
        error: error ? { name: error.name, message: error.message } : null, // Pass error info
      });
      // Note: sendMessageToExtension handles closing the window after a delay
    }
  };

  /**
   * Requests microphone permission using the correct navigator.mediaDevices.getUserMedia API.
   */
  const requestPermission = async () => {
    console.log("[Permission Popup] Attempting getUserMedia...");
    updateStatus("Waiting for browser permission prompt..."); // Inform the user

    try {
      // --- Make the actual permission request ---
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // --- If getUserMedia succeeds ---
      console.log(
        "[Permission Popup] SUCCESS: Permission granted via getUserMedia."
      );

      // Stop the media track immediately - we only needed the permission grant,
      // not the actual audio stream in this popup.
      stream.getTracks().forEach((track) => track.stop());

      // Process the successful result
      handlePermissionResult(true, null);
    } catch (err) {
      // --- If getUserMedia fails (e.g., denied, hardware error) ---
      // Process the failure result, passing the error object
      handlePermissionResult(false, err);
    }
  };

  // --- Initialization Logic ---

  // Check if the required status message element exists in the HTML
  if (!statusMessage) {
    console.error("Required element (statusMessage) not found.");
    // Alert the user if the core UI element is missing, as the popup won't function correctly
    alert("Error: Popup UI is missing essential elements.");
    return; // Stop initialization if the status element is missing
  }

  // Add click listener to the request button IF the button element exists in the HTML
  if (requestButton) {
    requestButton.addEventListener("click", requestPermission);
  } else {
    // Log a warning if the button isn't found - the popup will still try to request permission automatically
    console.warn(
      "Request button (requestPermissionBtn) not found in HTML. Automatic request will proceed."
    );
  }

  // Check the initial permission state using navigator.permissions.query (if available)
  // This avoids an unnecessary prompt if permission is already granted or denied.
  if (
    navigator.permissions &&
    typeof navigator.permissions.query === "function"
  ) {
    navigator.permissions
      .query({ name: "microphone" }) // Use the standard name for the microphone permission query
      .then((initialStatus) => {
        console.log(
          "[Permission Popup] Initial permission state:",
          initialStatus.state
        );
        // Handle based on the current state
        if (initialStatus.state === "granted") {
          updateStatus("Permission already granted. Closing...", false);
          // Send success message immediately and close
          sendMessageToExtension({
            type: "MIC_PERMISSION_RESULT",
            success: true,
          });
        } else if (initialStatus.state === "denied") {
          updateStatus(
            "Microphone permission is currently denied. Please enable it in the extension settings.",
            true, // Mark as error
            true // Show settings link
          );
          // Don't close automatically if denied; let the user see the message/link.
          // Optionally send an immediate failure message:
          // sendMessageToExtension({ type: 'MIC_PERMISSION_RESULT', success: false, error: { name: 'NotAllowedError', message: 'Permission previously denied.'} });
        } else {
          // State is 'prompt', meaning permission hasn't been explicitly granted or denied yet.
          console.log(
            "[Permission Popup] Permission state is 'prompt', attempting immediate request..."
          );
          // Proceed to request permission using getUserMedia
          requestPermission();
        }

        // Set up a listener for permission changes *while the popup is open*
        // This handles cases where the user might change the permission in browser settings
        // after the popup has opened but before it closes.
        initialStatus.onchange = () => {
          console.log(
            "[Permission Popup] Permission state changed to:",
            initialStatus.state
          );
          // Re-evaluate based on the new state
          if (initialStatus.state === "granted") {
            // If changed to granted, handle success (this will send message and close)
            handlePermissionResult(true, null);
          } else if (initialStatus.state === "denied") {
            // If changed to denied, update the status message and show settings link
            updateStatus("Permission state changed to denied.", true, true);
            // Consider sending an updated failure message if the popup hasn't closed yet
          }
          // If it changes back to 'prompt' (e.g., user resets), do nothing specific here,
          // as the initial request attempt should handle the 'prompt' state.
        };
      })
      .catch((error) => {
        // Handle errors during the initial permission query
        console.error(
          "[Permission Popup] Error querying initial permission state:",
          error
        );
        updateStatus(
          "Error checking initial permission state. Attempting request anyway...",
          true
        );
        // Fallback: If the query fails, still attempt the permission request directly
        requestPermission();
      });
  } else {
    // Fallback if navigator.permissions.query is not supported
    console.warn(
      "[Permission Popup] navigator.permissions.query not available. Attempting direct request."
    );
    requestPermission();
  }
});
