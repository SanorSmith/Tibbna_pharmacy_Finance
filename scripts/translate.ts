import fs from "node:fs";
import path from "node:path";
import * as globModule from "glob";

// Define language files paths
const LANGUAGE_FILES = {
  en: path.resolve(__dirname, "../content/en/index.ts"),
  sv: path.resolve(__dirname, "../content/sv/index.ts"),
};

// Function to extract translation keys from files
async function extractTranslationKeys() {
  // Use the glob promise API with separate patterns
  const appFiles = await globModule.glob("app/**/*.ts") || [];
  const appTsxFiles = await globModule.glob("app/**/*.tsx") || [];
  const componentFiles = await globModule.glob("components/**/*.ts") || [];
  const componentTsxFiles = await globModule.glob("components/**/*.tsx") || [];
  const files = [...appFiles, ...appTsxFiles, ...componentFiles, ...componentTsxFiles];

  // Simplified regex to capture ttt() calls with double quotes
  const translationKeyRegex = /ttt\(\s*"([^"]+)"\s*\)/g;

  const keys = new Set<string>();

  files.forEach((file: string) => {
    const content = fs.readFileSync(file, "utf8");
    let match;

    while ((match = translationKeyRegex.exec(content)) !== null) {
      const key = match[1];
      if (key) {
        keys.add(key);
      }
    }
  });

  return Array.from(keys);
}

// Function to parse existing translations directly from the file
function parseTranslations(filePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const result: Record<string, string> = {};

    // Updated regex to handle escaped quotes in keys and values
    const keyValueRegex =
      /'([^'\\]*(?:\\.[^'\\]*)*)'\s*:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g;
    let match;

    while ((match = keyValueRegex.exec(content)) !== null) {
      const key = match[1].replace(/\\'/g, "'"); // Unescape single quotes in key
      const value = match[2].replace(/\\'/g, "'"); // Unescape single quotes in value
      result[key] = value;
    }

    return result;
  } catch (e) {
    console.error(`Error reading file ${filePath}:`, e);
    return {};
  }
}

// Helper function to escape single quotes for TypeScript string literals
function escapeForTSString(str: string): string {
  return str.replace(/'/g, "\\'");
}

// Function to update translation files
function updateTranslationFiles(keys: string[]) {
  // First, get all translations from English file
  const enTranslations = parseTranslations(LANGUAGE_FILES.en);
  const enKeys = Object.keys(enTranslations);

  // Combine keys from code and English file
  const allKeys = [...new Set([...keys, ...enKeys])];

  // Process each language file
  Object.entries(LANGUAGE_FILES).forEach(([lang, filePath]) => {
    const existingTranslations = parseTranslations(filePath);
    const newKeys: string[] = [];

    // Find keys that don't exist in the current translations
    allKeys.forEach((key) => {
      if (existingTranslations[key] === undefined) {
        newKeys.push(key);
      }
    });

    if (newKeys.length > 0) {
      // Read the current file content
      let fileContent = fs.readFileSync(filePath, "utf8");

      // Find the position to insert new translations (before the closing brace)
      const closingBracePos = fileContent.lastIndexOf("}");

      if (closingBracePos !== -1) {
        // Format new translations with proper escaping
        const newTranslationsStr = newKeys
          .map((key) => {
            const escapedKey = escapeForTSString(key);
            if (lang === "en") {
              const escapedValue = escapeForTSString(key);
              return `  '${escapedKey}': '${escapedValue}'`;
            } else if (lang === "sv") {
              return `  '${escapedKey}': ''`;
            }
            return "";
          })
          .join(",\n");

        // Check if there's content before the closing brace
        const contentBeforeBrace = fileContent
          .substring(0, closingBracePos)
          .trim();
        const needsComma =
          contentBeforeBrace.length > 0 &&
          !contentBeforeBrace.endsWith(",") &&
          !contentBeforeBrace.endsWith("{");

        // Insert new translations with appropriate comma
        const insertStr = needsComma
          ? `,\n${newTranslationsStr}`
          : `\n${newTranslationsStr}`;

        fileContent =
          fileContent.substring(0, closingBracePos).trimEnd() +
          insertStr +
          fileContent.substring(closingBracePos);

        fs.writeFileSync(filePath, fileContent, "utf8");
        console.log(
          `Updated ${lang} translations file with ${newKeys.length} new keys`
        );
      } else {
        console.error(`Could not find closing brace in ${filePath}`);
      }
    } else {
      console.log(`No updates needed for ${lang} translations`);
    }
  });
}

// Function to remove unused translation keys
function removeUnusedTranslations(usedKeys: string[]) {
  const usedKeysSet = new Set(usedKeys);
  
  Object.entries(LANGUAGE_FILES).forEach(([lang, filePath]) => {
    const existingTranslations = parseTranslations(filePath);
    const existingKeys = Object.keys(existingTranslations);
    const unusedKeys = existingKeys.filter(key => !usedKeysSet.has(key));
    
    if (unusedKeys.length > 0) {
      console.log(`Found ${unusedKeys.length} unused keys in ${lang} translations:`, unusedKeys);
      
      // Read the current file content
      let fileContent = fs.readFileSync(filePath, "utf8");
      
      // Remove each unused key
      unusedKeys.forEach(key => {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match the key-value pair with optional comma and whitespace
        const keyRegex = new RegExp(`\\s*'${escapedKey}'\\s*:\\s*'[^'\\\\]*(?:\\\\.[^'\\\\]*)*'\\s*,?`, 'g');
        fileContent = fileContent.replace(keyRegex, '');
      });
      
      // Clean up any double commas or trailing commas before closing brace
      fileContent = fileContent.replace(/,\s*,/g, ',');
      fileContent = fileContent.replace(/,(\s*})/g, '$1');
      
      fs.writeFileSync(filePath, fileContent, "utf8");
      console.log(`Removed ${unusedKeys.length} unused keys from ${lang} translations`);
    } else {
      console.log(`No unused keys found in ${lang} translations`);
    }
  });
}

// Function to show help
function showHelp() {
  console.log(`
Translation Key Manager

Usage: npm run translate [options]

Options:
  --remove-unused    Remove translation keys that are no longer used in the codebase
  --help            Show this help message

Examples:
  npm run translate                    # Update translation files with new keys
  npm run translate -- --remove-unused # Remove unused keys and update files
`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const removeUnused = args.includes('--remove-unused');
  const showHelpFlag = args.includes('--help') || args.includes('-h');
  
  if (showHelpFlag) {
    showHelp();
    return;
  }
  
  console.log("Extracting translation keys from codebase...");
  const keys = await extractTranslationKeys();
  console.log(`Found ${keys.length} translation keys from code`);

  if (removeUnused) {
    console.log("Removing unused translation keys...");
    removeUnusedTranslations(keys);
  }

  console.log("Updating translation files...");
  updateTranslationFiles(keys);

  console.log("Done!");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
