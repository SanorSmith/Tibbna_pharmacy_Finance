/**
 * Sample Number Display Component
 * 
 * Displays sample number with lab type and test group information
 * Shows parsed components in a readable format
 */

import { Badge } from "@/components/ui/badge";
import { parseSampleNumber, getLabTypeFromCode, getTestGroupFromCode, formatSampleDate } from "@/lib/lims/sample-number-utils";

interface SampleNumberDisplayProps {
  sampleNumber: string;
  showDetails?: boolean;
}

export function SampleNumberDisplay({ sampleNumber, showDetails = false }: SampleNumberDisplayProps) {
  const parsed = parseSampleNumber(sampleNumber);
  
  if (!parsed) {
    // Invalid format - display as is
    return <span className="font-mono text-sm">{sampleNumber}</span>;
  }

  if (parsed.format === 'legacy') {
    // Legacy format (YYYYMMDDNNN) - display as is
    return <span className="font-mono text-sm">{sampleNumber}</span>;
  }

  // Enhanced format (YYYYMMDD-LABTYPE-GROUP-SEQ)
  const { date, labType, testGroup, sequence } = parsed;
  
  if (showDetails) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{sampleNumber}</span>
        <div className="flex gap-1">
          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
            {getLabTypeFromCode(labType)}
          </Badge>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            {getTestGroupFromCode(testGroup)}
          </Badge>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">{sampleNumber}</span>
      <div className="flex gap-1">
        <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 border-blue-200 text-blue-700">
          {labType}
        </Badge>
        <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-50 border-green-200 text-green-700">
          {testGroup}
        </Badge>
      </div>
    </div>
  );
}

/**
 * Sample Number Tooltip Component
 * 
 * Shows detailed breakdown when hovering over sample number
 */
export function SampleNumberTooltip({ sampleNumber }: { sampleNumber: string }) {
  const parsed = parseSampleNumber(sampleNumber);
  
  if (!parsed) {
    return (
      <div className="space-y-1 text-xs">
        <div><strong>Sample ID:</strong> {sampleNumber}</div>
        <div><strong>Format:</strong> Unknown</div>
      </div>
    );
  }
  
  if (parsed.format === 'legacy') {
    return (
      <div className="space-y-1 text-xs">
        <div><strong>Sample ID:</strong> {sampleNumber}</div>
        <div><strong>Date:</strong> {formatSampleDate(parsed.date)}</div>
        <div><strong>Sequence:</strong> #{parsed.sequence}</div>
        <div><strong>Format:</strong> Legacy (YYYYMMDDNNN)</div>
      </div>
    );
  }
  
  const { date, labType, testGroup, sequence } = parsed;
  
  return (
    <div className="space-y-1 text-xs">
      <div><strong>Sample ID:</strong> {sampleNumber}</div>
      <div><strong>Date:</strong> {formatSampleDate(date)}</div>
      <div><strong>Lab Type:</strong> {getLabTypeFromCode(labType)} ({labType})</div>
      <div><strong>Test Group:</strong> {getTestGroupFromCode(testGroup)} ({testGroup})</div>
      <div><strong>Sequence:</strong> #{sequence}</div>
      <div><strong>Format:</strong> Enhanced (YYYYMMDD-LABTYPE-GROUP-SEQ)</div>
    </div>
  );
}
