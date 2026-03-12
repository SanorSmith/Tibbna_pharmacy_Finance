#!/usr/bin/env tsx

/**
 * Simple template upload script for OpenEHR
 * 
 * Usage: npx tsx scripts/upload-template-simple.ts
 */

import fs from "fs";
import path from "path";
import axios from "axios";

// Load environment variables
const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

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
    
    const url = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/definition/template/adl1.4`;
    const response = await axios.post(url, optContent, {
      headers: {
        "Content-Type": "application/xml",
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
      },
    });
    
    console.log("✅ Template uploaded successfully!");
    console.log(`📊 Status: ${response.status}`);
    console.log(`📝 Response: ${JSON.stringify(response.data, null, 2)}`);
    console.log("🔧 Template ID: template_medication_dispense_v1");
    console.log("🎉 You can now use this template for medication dispensing compositions!");
    
  } catch (error) {
    console.error("❌ Failed to upload template:", error);
    if (axios.isAxiosError(error)) {
      console.error("Response data:", error.response?.data);
      console.error("Response status:", error.response?.status);
      console.error("Response headers:", error.response?.headers);
    }
    process.exit(1);
  }
}

// Check required environment variables
if (!process.env.EHRBASE_URL || !process.env.EHRBASE_USER || !process.env.EHRBASE_PASSWORD) {
  console.error("❌ Missing required environment variables:");
  console.error("   - EHRBASE_URL");
  console.error("   - EHRBASE_USER");
  console.error("   - EHRBASE_PASSWORD");
  console.error("   - EHRBASE_API_KEY (optional)");
  process.exit(1);
}

uploadTemplate();
