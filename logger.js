// logger.js
const fs = require("fs");
const path = require("path");

// Get current week folder name (e.g., "2025-W39")
function getWeekFolder() {
  const now = new Date();
  const year = now.getFullYear();

  // ISO week number
  const oneJan = new Date(year, 0, 1);
  const days = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7);

  return `${year}-W${week}`;
}

// Get today's log file (inside week folder)
function getLogFilePath() {
  const weekFolder = getWeekFolder();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const logsDir = path.join(__dirname, "logs", weekFolder);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  return path.join(logsDir, `${today}.json`);
}

// Write a log entry
function writeLog(level, message) {
  const logFilePath = getLogFilePath();
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  // Initialize file if it doesn’t exist
  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, "[]");
  }

  // Read + append + save
  const data = fs.readFileSync(logFilePath, "utf-8");
  const logs = JSON.parse(data);
  logs.push(logEntry);
  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
}

// Override console
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  writeLog("INFO", args.join(" "));
  originalLog.apply(console, args);
};

console.error = (...args) => {
  writeLog("ERROR", args.join(" "));
  originalError.apply(console, args);
};

console.warn = (...args) => {
  writeLog("WARN", args.join(" "));
  originalWarn.apply(console, args);
};

module.exports = { writeLog };
