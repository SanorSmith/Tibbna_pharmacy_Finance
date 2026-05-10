/**
 * Payment Status Component
 * 
 * Displays patient payment information on EHR patient page
 * Shows real-time updates when payments are made at reception
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Receipt
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PaymentStatusProps {
  patientId: string;
  workspaceid?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  status: string;
  payment_method?: string;
  payment_date?: string;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  service_name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

interface PaymentSummary {
  totalInvoices: number;
  totalAmount: string;
  totalPaid: string;
  totalDue: string;
  pendingCount: number;
  paidCount: number;
}

export function PaymentStatus({ patientId, workspaceid }: PaymentStatusProps) {
  // Fetch payment status with auto-refresh every 30 seconds
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["patient-payments", patientId],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/payments`);
      if (!response.ok) throw new Error("Failed to fetch payment status");
      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading payment information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load payment information</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary: PaymentSummary = data?.summary || {
    totalInvoices: 0,
    totalAmount: "0",
    totalPaid: "0",
    totalDue: "0",
    pendingCount: 0,
    paidCount: 0,
  };

  const pendingInvoices: Invoice[] = data?.pendingInvoices || [];
  const recentPayments: Invoice[] = data?.recentPayments || [];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      PAID: { variant: "default", icon: CheckCircle2, label: "Paid" },
      PENDING: { variant: "destructive", icon: AlertCircle, label: "Pending" },
      PARTIAL: { variant: "secondary", icon: Clock, label: "Partial" },
      CANCELLED: { variant: "outline", icon: AlertCircle, label: "Cancelled" },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Billed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(summary.totalAmount).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{summary.totalInvoices} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${parseFloat(summary.totalPaid).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{summary.paidCount} paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Balance Due</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${parseFloat(summary.totalDue).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{summary.pendingCount} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payment Status</CardDescription>
          </CardHeader>
          <CardContent>
            {parseFloat(summary.totalDue) === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">All Paid</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Outstanding</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Pending Payments
            </CardTitle>
            <CardDescription>Invoices awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{invoice.invoice_number}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">${parseFloat(invoice.balance_due).toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">
                      of ${parseFloat(invoice.total_amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Recent Payments
            </CardTitle>
            <CardDescription>Last 5 paid invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{invoice.invoice_number}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Paid: {invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString() : 'N/A'}
                      {invoice.payment_method && ` • ${invoice.payment_method}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">${parseFloat(invoice.amount_paid).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No invoices message */}
      {summary.totalInvoices === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No billing information available</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
