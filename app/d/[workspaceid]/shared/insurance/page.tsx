/**
 * Insurance Page
 * - Insurance verification and claims management
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function InsurancePage({ params }: PageProps) {
  const { workspaceid } = await params;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
       <Link href={`/d/${workspaceid}/doctor`}>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Back to Doctor Dashboard"
                  className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
        <div>
          <h1 className="text-2xl font-bold">Insurance Management</h1>
          <p className="text-muted-foreground mt-2">
            Insurance verification and claims management
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insurance Verification</CardTitle>
          <CardDescription>Verify coverage and manage claims</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Insurance management system.</p>
            <p className="text-sm mt-2">Verify coverage and manage claims.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
