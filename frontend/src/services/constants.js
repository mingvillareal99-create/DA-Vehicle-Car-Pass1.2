/**
 * Application constants and configuration
 * Centralized location for all constant values used across the app
 */

// Backend API URL dynamically resolves the host IP so mobile phones can connect
export const BACKEND_URL = process.env.NODE_ENV === 'development' 
  ? `http://${window.location.hostname}:8000` 
  : process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// DA (Department of Agriculture) Logo - using local file
export const DA_LOGO_URL = "/da-logo.jpg";
