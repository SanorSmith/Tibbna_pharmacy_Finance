/**
 * Sample Accessioning Utilities
 * 
 * Provides utilities for:
 * - Sample ID generation (human-readable format)
 * - Barcode generation
 * - QR code payload generation
 */

import { db } from "@/lib/db";
import { accessionSamples } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 * Generate numeric sample number
 * Format: YYYYMMDDNNN (numbers only)
 * Example: 20260216001 (Feb 16, 2026, sequence 001)
 */
export async function generateSampleNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Get the last sample number for today
  const lastSample = await db
    .select({ samplenumber: accessionSamples.samplenumber })
    .from(accessionSamples)
    .where(sql`${accessionSamples.samplenumber} LIKE ${datePrefix + '%'}`)
    .orderBy(sql`${accessionSamples.samplenumber} DESC`)
    .limit(1);

  let nextNumber = 1;
  if (lastSample.length > 0) {
    // Extract the last 3 digits (sequence number)
    const lastSequence = lastSample[0].samplenumber.slice(-3);
    nextNumber = parseInt(lastSequence, 10) + 1;
  }

  // Pad sequence with zeros to 3 digits
  const paddedSequence = nextNumber.toString().padStart(3, '0');
  return `${datePrefix}${paddedSequence}`;
}

/**
 * Generate barcode for sample
 * Uses the sample UUID as the barcode value
 * In production, this would integrate with actual barcode generation library
 */
export function generateBarcode(sampleId: string): string {
  // In production, use a library like bwip-js or jsbarcode
  // For now, return the sample ID formatted for Code 128 barcode
  return sampleId.replace(/-/g, '').toUpperCase();
}

/**
 * Generate QR code payload for sample
 * Returns JSON string that can be encoded into QR code
 * 
 * QR code contains:
 * - Sample ID
 * - Sample number
 * - Collection date
 * - Sample type
 * - URL to view sample details
 */
export interface QRCodePayload {
  sampleId: string;
  sampleNumber: string;
  collectionDate: string;
  sampleType: string;
  url: string;
  timestamp: string;
}

export function generateQRCodePayload(
  sampleId: string,
  sampleNumber: string,
  collectionDate: Date,
  sampleType: string,
  workspaceId: string
): string {
  const payload: QRCodePayload = {
    sampleId,
    sampleNumber,
    collectionDate: collectionDate.toISOString(),
    sampleType,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/d/${workspaceId}/lab-tech/samples/${sampleId}`,
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(payload);
}

/**
 * Validate sample accessioning data
 */
export interface AccessionValidationError {
  field: string;
  message: string;
}

export function validateAccessionData(data: {
  sampleType: string;
  containerType?: string;
  volume?: number;
  volumeUnit?: string;
  collectionDate: Date;
  orderId: string;
  patientId?: string;
  ehrId?: string;
}): AccessionValidationError[] {
  const errors: AccessionValidationError[] = [];

  // Required fields
  if (!data.sampleType || data.sampleType.trim() === '') {
    errors.push({ field: 'sampleType', message: 'Sample type is required' });
  }

  // containerType is optional — not all collection workflows capture it
  // if (!data.containerType || data.containerType.trim() === '') {
  //   errors.push({ field: 'containerType', message: 'Container type is required' });
  // }

  if (!data.orderId || data.orderId.trim() === '') {
    errors.push({ field: 'orderId', message: 'Order ID is required' });
  }

  // Collection date validation
  if (!data.collectionDate) {
    errors.push({ field: 'collectionDate', message: 'Collection date is required' });
  } else {
    const now = new Date();
    if (data.collectionDate > now) {
      errors.push({ field: 'collectionDate', message: 'Collection date cannot be in the future' });
    }

    // Check if collection date is too far in the past (e.g., more than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (data.collectionDate < thirtyDaysAgo) {
      errors.push({ 
        field: 'collectionDate', 
        message: 'Collection date is more than 30 days ago. Please verify.' 
      });
    }
  }

  // Volume validation
  if (data.volume !== undefined && data.volume !== null) {
    if (data.volume <= 0) {
      errors.push({ field: 'volume', message: 'Volume must be greater than 0' });
    }
    if (!data.volumeUnit || data.volumeUnit.trim() === '') {
      errors.push({ field: 'volumeUnit', message: 'Volume unit is required when volume is specified' });
    }
  }

  // Patient/Subject validation
  if (!data.patientId && !data.ehrId) {
    errors.push({ 
      field: 'patient', 
      message: 'Either Patient ID or EHR ID must be provided' 
    });
  }

  return errors;
}

/**
 * Sample type options
 */
export const SAMPLE_TYPES = [
  { value: 'blood', label: 'Blood' },
  { value: 'serum', label: 'Serum' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'urine', label: 'Urine' },
  { value: 'tissue', label: 'Tissue' },
  { value: 'csf', label: 'Cerebrospinal Fluid (CSF)' },
  { value: 'saliva', label: 'Saliva' },
  { value: 'stool', label: 'Stool' },
  { value: 'sputum', label: 'Sputum' },
  { value: 'swab', label: 'Swab' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Container type options
 */
export const CONTAINER_TYPES = [
  { value: 'vacutainer_edta', label: 'Vacutainer (EDTA)' },
  { value: 'vacutainer_serum', label: 'Vacutainer (Serum)' },
  { value: 'vacutainer_heparin', label: 'Vacutainer (Heparin)' },
  { value: 'tube_plain', label: 'Plain Tube' },
  { value: 'tube_sterile', label: 'Sterile Tube' },
  { value: 'jar', label: 'Specimen Jar' },
  { value: 'container_sterile', label: 'Sterile Container' },
  { value: 'swab_transport', label: 'Swab Transport Medium' },
  { value: 'cryovial', label: 'Cryovial' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Volume unit options
 */
export const VOLUME_UNITS = [
  { value: 'mL', label: 'mL (milliliters)' },
  { value: 'L', label: 'L (liters)' },
  { value: 'µL', label: 'µL (microliters)' },
  { value: 'g', label: 'g (grams)' },
  { value: 'mg', label: 'mg (milligrams)' },
] as const;
