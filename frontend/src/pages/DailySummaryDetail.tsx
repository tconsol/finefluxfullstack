import { useMemo } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Loader2, Fuel, Wallet, Receipt, Users, CreditCard, Package,
} from "lucide-react";
import { API_CONFIG } from "@/lib/api-config";

const RUPEE = "₹";
const formatCurrency = (n?: number) => `${RUPEE}${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count?: number; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
          {count !== undefined && <Badge variant="secondary" className="ml-2">{count}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-sm text-muted-foreground py-8">{label}</TableCell>
    </TableRow>
  );
}

export default function DailySummaryDetail() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const orgId = localStorage.getItem("organizationId") || "";

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees?page=0&size=500`);
      return Array.isArray(res.data?.content) ? res.data.content : Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", orgId, "all-for-detail"],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/customers?page=0&size=1000`);
      return Array.isArray(res.data?.content) ? res.data.content : Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["daily-summary-detail", orgId, date],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/daily-summary/${date}`, { timeout: 20000 });
      return res.data;
    },
    enabled: !!orgId && !!date,
  });

  const employeeLabel = (empId?: string) => {
    if (!empId) return "—";
    const emp = employees.find((e: any) => e.empId === empId);
    return emp ? `${empId} - ${emp.firstName} ${emp.lastName}` : empId;
  };

  const customerLabel = (custId?: string) => {
    if (!custId) return "—";
    const c = customers.find((x: any) => x.custId === custId);
    return c ? `${custId} - ${c.customerName}` : custId;
  };

  const totals = useMemo(() => {
    if (!data) return null;
    const salesTotal = (data.sales || []).reduce((s: number, x: any) => s + (x.salesInRupees || 0), 0);
    const collectionsTotal = (data.collections || []).reduce((s: number, x: any) => s + (x.receivedTotal || (x.cashReceived || 0) + (x.phonePay || 0) + (x.creditCard || 0)), 0);
    const expensesTotal = (data.expenses || []).reduce((s: number, x: any) => s + (x.amount || 0), 0);
    const salariesTotal = (data.salaryPayments || []).reduce((s: number, x: any) => s + (x.amount || 0), 0);
    return { salesTotal, collectionsTotal, expensesTotal, salariesTotal };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate("/daily-summary")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{date ? dayjs(date).format("DD MMMM YYYY") : ""}</h1>
          <p className="text-muted-foreground">Full breakdown for this day</p>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sales Revenue</p><p className="text-lg font-bold text-green-600">{formatCurrency(totals.salesTotal)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Collections</p><p className="text-lg font-bold text-blue-600">{formatCurrency(totals.collectionsTotal)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-bold text-destructive">{formatCurrency(totals.expensesTotal)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Salaries Paid</p><p className="text-lg font-bold text-destructive">{formatCurrency(totals.salariesTotal)}</p></CardContent></Card>
        </div>
      )}

      {/* Inventory Before/After */}
      <Section icon={<Package className="h-5 w-5 text-orange-600" />} title="Inventory — Before &amp; After" count={data?.inventory?.length}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Previous Level</TableHead>
                <TableHead className="text-right">Previous Value</TableHead>
                <TableHead className="text-right">Current Level</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.inventory?.length ? (
                <EmptyRow colSpan={6} label="No inventory data" />
              ) : data.inventory.map((inv: any) => {
                const change = inv.currentValue - inv.previousValue;
                return (
                  <TableRow key={inv.productName}>
                    <TableCell className="font-medium">{inv.productName}</TableCell>
                    <TableCell className="text-right">{inv.previousLevel.toLocaleString("en-IN")} {inv.metric || ""}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.previousValue)}</TableCell>
                    <TableCell className="text-right">{inv.currentLevel.toLocaleString("en-IN")} {inv.metric || ""}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.currentValue)}</TableCell>
                    <TableCell className={`text-right font-semibold ${change >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {change >= 0 ? "+" : ""}{formatCurrency(change)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {data?.inventoryLogsToday?.length > 0 && (
          <div className="p-4 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Inventory Activity Log</p>
            <div className="space-y-1.5">
              {data.inventoryLogsToday.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-muted/30">
                  <span>{dayjs(log.lastUpdated).format("hh:mm A")} — {log.productName} — {log.mutationby}</span>
                  <span className="font-medium">{Number(log.currentLevel).toLocaleString("en-IN")} {log.metric} ({formatCurrency(Number(log.stockValue))})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Sales */}
      <Section icon={<Fuel className="h-5 w-5 text-blue-600" />} title="Sales" count={data?.sales?.length}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Gun</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Closing</TableHead>
                <TableHead className="text-right">Testing</TableHead>
                <TableHead className="text-right">Liters</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.sales?.length ? (
                <EmptyRow colSpan={10} label="No sales recorded" />
              ) : data.sales.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{dayjs(s.dateTime).format("hh:mm A")}</TableCell>
                  <TableCell className="text-xs font-medium">{s.productName}</TableCell>
                  <TableCell className="text-xs">{s.guns}</TableCell>
                  <TableCell className="text-xs">{employeeLabel(s.empId)}</TableCell>
                  <TableCell className="text-right text-xs">{s.openingStock}</TableCell>
                  <TableCell className="text-right text-xs">{s.closingStock}</TableCell>
                  <TableCell className="text-right text-xs">{s.testingTotal}</TableCell>
                  <TableCell className="text-right text-xs">{Number(s.salesInLiters).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(s.price)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{formatCurrency(s.salesInRupees)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* Collections */}
      <Section icon={<Wallet className="h-5 w-5 text-green-600" />} title="Collections" count={data?.collections?.length}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">PhonePe</TableHead>
                <TableHead className="text-right">Card</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Short / Excess</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.collections?.length ? (
                <EmptyRow colSpan={9} label="No collections recorded" />
              ) : data.collections.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{dayjs(c.dateTime).format("hh:mm A")}</TableCell>
                  <TableCell className="text-xs font-medium">{c.productName} {c.guns ? `(${c.guns})` : ""}</TableCell>
                  <TableCell className="text-xs">{employeeLabel(c.empId)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(c.cashReceived)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(c.phonePay)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(c.creditCard)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(c.expectedTotal)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{formatCurrency(c.receivedTotal)}</TableCell>
                  <TableCell className={`text-right text-xs font-medium ${c.accessCollections > 0 ? "text-green-600" : c.shortCollections > 0 ? "text-destructive" : ""}`}>
                    {c.accessCollections > 0 ? `+${formatCurrency(c.accessCollections)}` : c.shortCollections > 0 ? `-${formatCurrency(c.shortCollections)}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* Expenses */}
      <Section icon={<Receipt className="h-5 w-5 text-destructive" />} title="Expenses" count={data?.expenses?.length}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.expenses?.length ? (
                <EmptyRow colSpan={4} label="No expenses recorded" />
              ) : data.expenses.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs"><Badge variant="outline">{e.categoryName}</Badge></TableCell>
                  <TableCell className="text-xs">{e.description || "—"}</TableCell>
                  <TableCell className="text-xs">{e.employeeName || employeeLabel(e.empId)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold text-destructive">{formatCurrency(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* Salary Payments */}
      <Section icon={<Users className="h-5 w-5 text-violet-600" />} title="Salary Payments" count={data?.salaryPayments?.length}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employee</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.salaryPayments?.length ? (
                <EmptyRow colSpan={3} label="No salary payments recorded" />
              ) : data.salaryPayments.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{s.employeeName || employeeLabel(s.empId)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.notes || "—"}</TableCell>
                  <TableCell className="text-right text-xs font-semibold text-destructive">{formatCurrency(s.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* Borrower Transactions */}
      <Section icon={<CreditCard className="h-5 w-5 text-yellow-600" />} title="Borrower Transactions" count={data?.customerHistory?.length}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.customerHistory?.length ? (
                <EmptyRow colSpan={6} label="No borrower activity" />
              ) : data.customerHistory.map((h: any) => {
                const amount = Number(h.transactionAmount) || 0;
                return (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{dayjs(h.transactionDate).format("hh:mm A")}</TableCell>
                    <TableCell className="text-xs">{customerLabel(h.custId)}</TableCell>
                    <TableCell className="text-xs">
                      {amount < 0 ? <Badge className="bg-yellow-100 text-yellow-800">Borrowed</Badge> : <Badge className="bg-teal-100 text-teal-800">Repaid</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.notes || "—"}</TableCell>
                    <TableCell className={`text-right text-xs font-semibold ${amount < 0 ? "text-yellow-700" : "text-teal-700"}`}>{formatCurrency(Math.abs(amount))}</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(Number(h.cumulativeAmount))}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}
