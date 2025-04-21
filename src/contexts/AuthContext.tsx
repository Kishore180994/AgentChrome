import React, { createContext, useState, useContext, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  user: User | { isGuest: true } | null;
  loginWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for user data
const USER_STORAGE_KEY = "agentchrome_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | { isGuest: true } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user from storage on initial render
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const data = await chrome.storage.local.get(USER_STORAGE_KEY);
        if (data[USER_STORAGE_KEY]) {
          setUser(JSON.parse(data[USER_STORAGE_KEY]));
        }
      } catch (error) {
        console.error("Failed to load user from storage:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // Save user to storage whenever it changes
  useEffect(() => {
    if (user) {
      chrome.storage.local.set({
        [USER_STORAGE_KEY]: JSON.stringify(user),
      });
    }
  }, [user]);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      console.log(
        "%c[AUTH] Starting Google login process...",
        "color: #4285F4; font-weight: bold"
      );

      // Use launchWebAuthFlow to force account selection
      console.log(
        "%c[AUTH] Launching web auth flow with account selection...",
        "color: #4285F4"
      );

      // Clear any existing tokens first
      await new Promise<void>((resolve) => {
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log("%c[AUTH] Cleared cached auth tokens", "color: #4285F4");
          resolve();
        });
      });

      // Get the client ID from the manifest
      const manifest = chrome.runtime.getManifest();
      const clientId =
        manifest.oauth2?.client_id ||
        "429423689983-infv1hpmh76b1iotqk2i7laloej3mmve.apps.googleusercontent.com";
      console.log("%c[AUTH] Client ID Used:", "color: #FF9800", clientId); // <-- ADD THIS LOG

      if (!clientId) {
        throw new Error("OAuth2 client ID not found in manifest");
      }

      // Get the scopes from the manifest
      const scopes = manifest.oauth2?.scopes || [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ];

      // Create the auth URL with prompt=select_account to force account selection
      let redirectURL = chrome.identity.getRedirectURL();
      console.log("%c[AUTH] Redirect URL:", "color: #4285F4", redirectURL);

      // --- START: Add this block to remove trailing slash ---
      if (redirectURL.endsWith("/")) {
        redirectURL = redirectURL.slice(0, -1);
        console.log(
          "%c[AUTH] Trimmed Redirect URL:",
          "color: #4CAF50",
          redirectURL
        );
      }

      const authURL = new URL("https://accounts.google.com/o/oauth2/auth");
      authURL.searchParams.append("client_id", clientId);
      authURL.searchParams.append("response_type", "token");
      authURL.searchParams.append("redirect_uri", redirectURL);
      authURL.searchParams.append("scope", scopes.join(" "));
      authURL.searchParams.append("prompt", "select_account"); // Force account selection

      console.log("%c[AUTH] Auth URL:", "color: #4285F4", authURL.toString());

      // Launch the web auth flow
      console.log(
        "%c[AUTH] Final Auth URL:",
        "color: #FF9800",
        authURL.toString()
      ); // <-- ADD THIS LOG

      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: authURL.toString(),
            interactive: true,
          },
          (responseUrl) => {
            console.log(
              "%c[AUTH] Auth flow response received",
              "color: #4285F4"
            );

            if (chrome.runtime.lastError) {
              console.error(
                "%c[AUTH] Chrome identity error:",
                "color: #FF5252; font-weight: bold",
                chrome.runtime.lastError
              );
              reject(chrome.runtime.lastError);
              return;
            }

            if (!responseUrl) {
              console.error(
                "%c[AUTH] No response URL returned",
                "color: #FF5252; font-weight: bold"
              );
              reject(new Error("No response URL returned from auth flow"));
              return;
            }

            console.log(
              "%c[AUTH] Response URL:",
              "color: #4285F4",
              responseUrl
            );

            try {
              // Extract the access token from the response URL
              const url = new URL(responseUrl);
              const hashParams = new URLSearchParams(url.hash.substring(1));
              const accessToken = hashParams.get("access_token");

              if (!accessToken) {
                console.error(
                  "%c[AUTH] No access token found in response",
                  "color: #FF5252; font-weight: bold"
                );
                reject(new Error("No access token found in response"));
                return;
              }

              console.log(
                "%c[AUTH] Access token obtained successfully",
                "color: #4CAF50; font-weight: bold"
              );
              resolve(accessToken);
            } catch (error) {
              console.error(
                "%c[AUTH] Error parsing response URL:",
                "color: #FF5252; font-weight: bold",
                error
              );
              reject(error);
            }
          }
        );
      });

      console.log(
        "%c[AUTH] Got auth token, fetching user info...",
        "color: #4285F4"
      );

      // Fetch user info from Google API
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error(
          `Failed to fetch user info: ${userInfoResponse.statusText}`
        );
      }

      const userInfo = await userInfoResponse.json();
      console.log("%c[AUTH] User info received:", "color: #4CAF50", userInfo);

      // Set user data
      const userData = {
        id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
      };

      // Set user in state and storage
      setUser(userData);

      // Store the user and token in storage
      chrome.storage.local.set({
        [USER_STORAGE_KEY]: JSON.stringify(userData),
        agentchrome_token: token, // Store the token for API requests
      });

      console.log(
        "%c[AUTH] Successfully logged in with Google",
        "color: #4CAF50; font-weight: bold"
      );
    } catch (error) {
      console.error(
        "%c[AUTH] Google login failed:",
        "color: #FF5252; font-weight: bold",
        error
      );

      // For now, we'll just set the user to null to indicate login failure
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = () => {
    setUser({ isGuest: true });
  };

  const logout = () => {
    console.log(
      "%c[AUTH] Starting logout process...",
      "color: #4285F4; font-weight: bold"
    );

    // Remove user from state
    setUser(null);

    // Remove user and token from storage
    chrome.storage.local.remove([USER_STORAGE_KEY, "agentchrome_token"]);

    // Clear all cached tokens
    chrome.identity.clearAllCachedAuthTokens(() => {
      console.log("%c[AUTH] Cleared all cached auth tokens", "color: #4285F4");
    });

    console.log(
      "%c[AUTH] Logged out successfully",
      "color: #4CAF50; font-weight: bold"
    );
  };

  return (
    <AuthContext.Provider
      value={{ user, loginWithGoogle, continueAsGuest, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
