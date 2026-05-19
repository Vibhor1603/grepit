/**
 * Personality messages used throughout the app.
 * Keeps the tone consistent: witty, dev-friendly, never cringe.
 */

export const LOADING_MESSAGES = [
  "hold on, reading your spaghetti...",
  "pretending to understand regex...",
  "asking the AI nicely (it has feelings)...",
  "counting your TODO comments (there's a lot)...",
  "judging your variable names silently...",
  "wondering who wrote this at 3am...",
  "found a console.log('here'). classic.",
  "your node_modules weighs more than my car...",
  "checking if anyone wrote tests... nope.",
  "decoding camelCase from the void...",
  "this function has 47 parameters. respect.",
  "git blame says it was you. awkward.",
  "found 12 unused imports. we don't judge.",
  "the AI is thinking. or panicking. unclear.",
  "parsing code that even God forgot...",
  "your .env file is... interesting.",
  "running npm install in my head...",
  "this callback hell goes 9 levels deep...",
  "found a file called 'temp_final_v2_REAL.js'...",
  "the linter gave up. we won't.",
  "reading code so you don't have to...",
  "untangling your import spaghetti...",
  "whoever named this variable was brave...",
  "found a 2000-line component. bold choice.",
  "your package.json has trust issues (47 deps)...",
  "the AI just whispered 'oh no'...",
  "checking if it works on my machine...",
  "resolving merge conflicts with the universe...",
  "this codebase has seen things...",
  "deploying neurons...",
  "your code is valid. morally? debatable.",
  "found a comment: '// idk why this works'...",
  "the try-catch ratio here is concerning...",
  "calculating your technical debt (it's a lot)...",
  "this PR would never pass review...",
  "asking stackoverflow for emotional support...",
  "your git history tells a story. a horror story.",
  "found 'any' used 34 times. TypeScript is crying.",
  "the AI needs a coffee break after this one...",
  "loading... unlike your lazy-loaded components...",
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
  noFiles: "No files to explore. Upload a codebase to get started.",
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
