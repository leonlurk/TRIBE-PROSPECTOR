// requestLogger.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";

/**
 * Logs API requests to Firestore for tracking and analytics purposes
 * @param {Object} options - The logging options
 * @param {string} options.endpoint - The API endpoint that was called
 * @param {Object} options.requestData - The data sent in the request
 * @param {string} options.userId - The user ID (optional if auth.currentUser is available)
 * @param {Object} options.responseData - The response received from the API (optional)
 * @param {string} options.status - The status of the request (success, error, etc.)
 * @param {string} options.source - The source component that made the request
 * @param {Object} options.metadata - Any additional metadata to log (optional)
 * @returns {Promise<string>} - The ID of the created log document
 */
export const logApiRequest = async ({
  endpoint,
  requestData,
  userId = null,
  responseData = null,
  status = "unknown",
  source = "unknown",
  metadata = {}
}) => {
  try {
    // Get current user ID if not provided
    const currentUserId = userId || auth.currentUser?.uid;
    
    if (!currentUserId) {
      console.error("Cannot log request: No user ID available");
      return null;
    }

    // Sanitize request data to remove sensitive information
    const sanitizedRequestData = sanitizeRequestData(requestData);
    
    // Create the log entry
    const logData = {
      endpoint,
      requestData: sanitizedRequestData,
      responseStatus: status,
      timestamp: serverTimestamp(),
      source,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        appVersion: "1.0.0" // You can replace this with a proper version value
      }
    };
    
    // Add response data if provided
    if (responseData) {
      logData.responseData = sanitizeResponseData(responseData);
    }

    // Add to user's request logs collection
    const logsCollectionRef = collection(db, "users", currentUserId, "requestLogs");
    const docRef = await addDoc(logsCollectionRef, logData);
    
    console.log(`Request logged with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("Error logging API request:", error);
    // Don't throw - we don't want logging errors to affect app functionality
    return null;
  }
};

/**
 * Sanitizes request data to remove sensitive information before logging
 * @param {Object} requestData - The request data to sanitize
 * @returns {Object} - Sanitized request data
 */
const sanitizeRequestData = (requestData) => {
  if (!requestData) return {};
  
  // Make a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(requestData));
  
  // Remove sensitive fields if they exist
  if (sanitized.password) sanitized.password = "[REDACTED]";
  if (sanitized.token) sanitized.token = "[REDACTED]";
  if (sanitized.verification_code) sanitized.verification_code = "[REDACTED]";
  
  // Redact any cookies to maintain security
  if (sanitized.cookies) sanitized.cookies = "[REDACTED]";
  
  return sanitized;
};

/**
 * Sanitizes response data to remove sensitive information before logging
 * @param {Object} responseData - The response data to sanitize
 * @returns {Object} - Sanitized response data
 */
const sanitizeResponseData = (responseData) => {
  if (!responseData) return {};
  
  // Make a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(responseData));
  
  // Remove sensitive fields if they exist
  if (sanitized.token) sanitized.token = "[REDACTED]";
  if (sanitized.cookies) sanitized.cookies = "[REDACTED]";
  
  return sanitized;
};

export default logApiRequest;