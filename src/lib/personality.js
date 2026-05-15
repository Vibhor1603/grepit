/**
 * Personality messages used throughout the app.
 * Keeps the tone consistent: witty, dev-friendly, never cringe.
 */

export const LOADING_MESSAGES = [
  "Parsing spaghetti code...",
  "Counting semicolons nobody asked for...",
  "Reading code so you don't have to...",
  "Untangling dependency hell...",
  "Asking the AI nicely...",
  "Tracing callbacks to their origin story...",
  "Decoding variable names from the void...",
  "Mapping the import labyrinth...",
  "Checking if it works on my machine...",
  "Resolving merge conflicts with the universe...",
  "Compiling thoughts...",
  "Traversing the abstract syntax tree...",
  "Refactoring reality...",
  "Awaiting promises that were never kept...",
  "Debugging the matrix...",
  "Searching for the missing semicolon...",
  "Consulting the stack overflow gods...",
  "Hydrating components with knowledge...",
  "Running npm install on your codebase...",
  "Linting the chaos...",
  "Deploying neurons...",
  "Fetching insights from the cloud...",
  "Indexing every forgotten TODO...",
  "Reverse-engineering the README...",
  "Calculating technical debt...",
  "Optimizing the optimization...",
  "Warming up the inference engine...",
  "Scanning for hardcoded secrets (don't worry)...",
  "Measuring cyclomatic complexity...",
  "Flattening deeply nested callbacks...",
  "Garbage collecting unused thoughts...",
  "Spinning up virtual neurons...",
  "Tokenizing your intentions...",
  "Building the dependency graph of truth...",
  "Checking if anyone wrote tests...",
  "Evaluating code quality with zero judgment...",
  "Mapping the architecture constellation...",
  "Decrypting developer intentions...",
  "Analyzing commit messages for meaning...",
  "Searching for the one true source of truth...",
  "Calculating the bus factor...",
];

export const HEALTH_MESSAGES = {
  perfect: [
    "Your codebase is cleaner than my apartment.",
    "Chef's kiss. No notes.",
    "This code sparks joy.",
    "Whoever wrote this deserves a raise.",
  ],
  good: [
    "Looking solid. A few things to tidy up.",
    "Pretty healthy. Room for improvement, but who doesn't have that?",
    "Above average. Your future self will thank you.",
  ],
  medium: [
    "Not bad, not great. Let's work on it.",
    "Some attention needed. Nothing a good refactor can't fix.",
    "The foundation is there. Time to polish.",
  ],
  poor: [
    "This codebase has seen things. Let's fix it together.",
    "There's work to do. But that's why you're here.",
    "Technical debt is calling. Time to pick up.",
    "Every codebase has a redemption arc. This is yours.",
  ],
};

export const RATE_LIMIT_MESSAGES = [
  "The AI needs a coffee break. Try again in {seconds}s.",
  "Too many questions too fast. Give it {seconds}s.",
  "Rate limit hit. Back in {seconds}s.",
  "Slow down, speedrunner. {seconds}s cooldown.",
];

export const EMPTY_STATES = {
  noFiles: "No files to explore. Upload a repo to get started.",
  noHistory: "No chats yet. Ask something to get started.",
  noIssues: "No security issues detected. Your code is looking good.",
  noEntryPoints: "No entry points detected in this codebase.",
};

export const ERROR_MESSAGES = [
  "Something broke. Probably not your fault.",
  "Well, that didn't work. Even the best code has bugs.",
  "An error occurred. We're on it (mentally).",
];

export function getRandomMessage(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getHealthMessage(score) {
  if (score >= 90) return getRandomMessage(HEALTH_MESSAGES.perfect);
  if (score >= 70) return getRandomMessage(HEALTH_MESSAGES.good);
  if (score >= 40) return getRandomMessage(HEALTH_MESSAGES.medium);
  return getRandomMessage(HEALTH_MESSAGES.poor);
}

export function getRateLimitMessage(seconds) {
  return getRandomMessage(RATE_LIMIT_MESSAGES).replace('{seconds}', seconds);
}
