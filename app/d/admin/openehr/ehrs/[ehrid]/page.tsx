import { CompositionListClient } from "../components/composition-list-client";

interface PageProps {
  params: Promise<{ ehrid: string }>;
}

export default async function EhrCompositionsPage({ params }: PageProps) {
  const { ehrid } = await params;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Compositions</h2>
          <p className="text-sm text-muted-foreground">EHR ID: {ehrid}</p>
        </div>
      </div>
      <CompositionListClient ehrId={ehrid} />
    </div>
  );
}
