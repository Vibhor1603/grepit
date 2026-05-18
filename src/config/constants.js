/**
 * App-wide constants. Single source of truth for magic numbers.
 */

// Upload limits
export const MAX_UPLOAD_SIZE_MB = 50;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const MAX_REPO_FILES = 10000;
export const ALLOWED_UPLOAD_EXTENSIONS = ['.zip'];

// Analysis
export const ANALYSIS_TIMEOUT_MS = 120_000; // 2 minutes
export const LARGE_REPO_THRESHOLD = 500;    // Skip component enrichment above this

// AI
export const AI_MAX_OUTPUT_TOKENS = 8000;
export const AI_TEMPERATURE = 0.25;
export const AI_CONTEXT_CAP_CHARS = 60_000;

// Rate limiting
export const IP_GLOBAL_RATE_LIMIT = 60;     // requests per minute per IP
export const IP_GLOBAL_WINDOW_MS = 60_000;

// Session
export const SESSION_EXPIRY_REDIRECT_DELAY_MS = 1500;

// UI
export const CHAT_HISTORY_LIMIT = 30;
export const FILE_TREE_DISPLAY_LIMIT = 5000;
export const RECENT_ANALYSES_DISPLAY = 5;
export const LOADING_MESSAGE_ROTATE_MS = 2500;

// Pagination
export const CONVERSATIONS_PER_PAGE = 30;
export const MESSAGES_PER_CONVERSATION = 50;
