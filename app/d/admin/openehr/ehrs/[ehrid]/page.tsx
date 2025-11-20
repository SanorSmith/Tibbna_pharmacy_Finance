import { EhrCompositionsClientPage } from "../components/ehr-compositions-client-page";

interface PageProps {
  params: Promise<{ ehrid: string }>;
}

export default async function EhrCompositionsPage({ params }: PageProps) {
  const { ehrid } = await params;

  return <EhrCompositionsClientPage ehrId={ehrid} />;
}
