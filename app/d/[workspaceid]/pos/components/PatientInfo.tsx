"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Shield, Phone, Calendar } from "lucide-react";

type Props = {
  data: {
    patient: any;
    dispensedOrders?: any[];
    creditAccount?: any;
    insurance?: any[];
  };
  onOrderSelect?: (orderId: string) => void;
};

export function PatientInfo({ data, onOrderSelect }: Props) {
  const { patient, dispensedOrders, creditAccount, insurance } = data;
  if (!patient) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Patient
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Name & ID */}
        <div>
          <p className="text-2xl font-bold">
            {patient.firstname} {patient.lastname}
          </p>
          {patient.nationalid && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <CreditCard className="h-3 w-3" />
              {patient.nationalid}
            </p>
          )}
          {patient.phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" />
              {patient.phone}
            </p>
          )}
          {patient.dateofbirth && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3" />
              {new Date(patient.dateofbirth).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Dispensed orders */}
        {dispensedOrders && dispensedOrders.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Dispensed Orders
              </span>
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              >
                {dispensedOrders.length}
              </Badge>
            </div>
            <div className="space-y-1 max-h-[120px] overflow-auto">
              {dispensedOrders.map((o: any) => (
                <button
                  key={o.orderid}
                  className="w-full text-left text-xs bg-white dark:bg-background border rounded px-2 py-1.5 hover:border-[#618FF5] transition-colors flex justify-between items-center"
                  onClick={() => onOrderSelect?.(o.orderid)}
                >
                  <span className="font-mono">{o.orderid.slice(0, 8)}...</span>
                  <span className="text-muted-foreground">
                    {o.dispensedat
                      ? new Date(o.dispensedat).toLocaleDateString()
                      : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Credit Account */}
        {creditAccount && (
          <div className="border rounded px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Credit Account
              </span>
              <Badge
                variant={
                  creditAccount.status === "ACTIVE" ? "outline" : "destructive"
                }
                className="text-xs"
              >
                {creditAccount.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <span className="text-muted-foreground">Limit:</span>{" "}
                <span className="font-medium">
                  {parseFloat(creditAccount.creditlimit).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Available:</span>{" "}
                <span className="font-medium text-green-600">
                  {parseFloat(creditAccount.availablecredit).toFixed(2)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Balance:</span>{" "}
                <span className="font-medium text-orange-600">
                  {parseFloat(creditAccount.currentbalance).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Insurance */}
        {insurance && insurance.length > 0 && (
          <div className="border rounded px-3 py-2 space-y-1">
            <span className="text-xs font-medium flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Insurance
            </span>
            {insurance.map((ins: any) => (
              <div
                key={ins.patientinsuranceid}
                className="text-xs flex justify-between"
              >
                <span>{ins.policynumber || "Policy"}</span>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
