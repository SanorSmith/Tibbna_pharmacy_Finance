import SampleValidationContent from "./SampleValidationContent";

export default async function SampleValidationPage({
  params,
}: {
  params: Promise<{ workspaceid: string; sampleid: string }>;
}) {
  const { workspaceid, sampleid } = await params;
  
  return <SampleValidationContent workspaceid={workspaceid} sampleid={sampleid} />;
}
