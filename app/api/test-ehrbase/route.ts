import { NextResponse } from "next/server";

export async function GET() {
  // Test endpoint to debug EHRbase connection
  const config = {
    url: process.env.EHRBASE_URL,
    user: process.env.EHRBASE_USER,
    hasPassword: !!process.env.EHRBASE_PASSWORD,
    passwordLength: process.env.EHRBASE_PASSWORD?.length || 0,
    hasApiKey: !!process.env.EHRBASE_API_KEY,
    apiKeyLength: process.env.EHRBASE_API_KEY?.length || 0,
  };

  // Test the actual connection
  try {
    const username = process.env.EHRBASE_USER?.trim() || "";
    const password = process.env.EHRBASE_PASSWORD?.trim() || "";
    const credentials = `${username}:${password}`;
    const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

    const testUrl = `${process.env.EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`;
    
    const response = await fetch(testUrl, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.EHRBASE_API_KEY!,
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        q: "SELECT e/ehr_id/value FROM EHR e LIMIT 1",
      }),
    });

    const responseText = await response.text();
    
    return NextResponse.json({
      config,
      test: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText.substring(0, 500), // First 500 chars
      },
    });
  } catch (error) {
    return NextResponse.json({
      config,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
