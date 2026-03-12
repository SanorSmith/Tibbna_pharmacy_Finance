#!/usr/bin/env tsx

/**
 * Upload medication dispense template to OpenEHR
 * 
 * Usage: npx tsx scripts/upload-medication-dispense-template.ts
 */

import fs from "fs";
import path from "path";
import { uploadOpenEHRTemplate } from "../lib/openehr/openehr";

async function uploadTemplate() {
  try {
    console.log("📋 Reading medication dispense template...");
    
    const templatePath = path.join(
      process.cwd(),
      "openehr/templates/template_medication_dispense_v1.opt"
    );
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }
    
    const optContent = fs.readFileSync(templatePath, "utf-8");
    console.log(`📄 Template file size: ${optContent.length} characters`);
    
    console.log("🚀 Uploading template to OpenEHR...");
    await uploadOpenEHRTemplate(optContent);
    
    console.log("✅ Medication dispense template uploaded successfully!");
    console.log("📝 Template ID: template_medication_dispense_v1");
    console.log("🔧 You can now use this template for medication dispensing compositions.");
    
  } catch (error) {
    console.error("❌ Failed to upload template:", error);
    process.exit(1);
  }
}

uploadTemplate();
