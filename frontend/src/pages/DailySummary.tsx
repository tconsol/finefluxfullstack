import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Plus, X, Loader2, CalendarDays, RefreshCw, TrendingDown,
} from "lucide-react";
import { API_CONFIG } from "@/lib/api-config";

const RUPEE = "₹";
type Preset = "today" | "week" | "month" | "custom";

type DailyRow = {
  date: string;
  handCash: number;
  phonePay: number;
  creditCard: number;
  inventoryValue: number;
  inventoryByProduct: Record<string, number>;
  borrowedMoney: number;
  borrowerCashReturned: number;
  expenses: number;
  salariesPaid: number;
  total: number;
};

const formatCurrency = (n: number) => `${RUPEE}${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Rolling windows (not calendar week/month) so the filter always shows recent activity
// regardless of where "today" falls in the calendar.
const rangeForPreset = (preset: Preset, customFrom?: string, customTo?: string): [Dayjs, Dayjs] => {
  const today = dayjs();
  switch (preset) {
    case "today":
      return [today.startOf("day"), today.endOf("day")];
    case "week":
      return [today.subtract(6, "day").startOf("day"), today.endOf("day")];
    case "month":
      return [today.subtract(29, "day").startOf("day"), today.endOf("day")];
    case "custom":
      return [
        customFrom ? dayjs(customFrom).startOf("day") : today.subtract(6, "day").startOf("day"),
        customTo ? dayjs(customTo).endOf("day") : today.endOf("day"),
      ];
    default:
      return [today.startOf("day"), today.endOf("day")];
  }
};

export default function DailySummary() {
  const orgId = localStorage.getItem("organizationId") || "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [preset, setPreset] = useState<Preset>("week");
  const [customFrom, setCustomFrom] = useState(dayjs().subtract(6, "day").format("YYYY-MM-DD"));
  const [customTo, setCustomTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({ empId: "", amount: "", paymentDate: dayjs().format("YYYY-MM-DD"), notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const [from, to] = useMemo(() => rangeForPreset(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const fromIso = from.format("YYYY-MM-DDTHH:mm:ss");
  const toIso = to.format("YYYY-MM-DDTHH:mm:ss");

  useEffect(() => {
    if (payModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [payModalOpen]);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees?page=0&size=500`);
      return Array.isArray(res.data?.content) ? res.data.content : Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  const { data: rows = [], isFetching, refetch } = useQuery<DailyRow[]>({
    queryKey: ["daily-summary", orgId, fromIso, toIso],
    queryFn: async () => {
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/daily-summary?from=${fromIso}&to=${toIso}`;
      const res = await axios.get(url, { timeout: 20000 });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
    refetchOnWindowFocus: false,
  });

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    handCash: acc.handCash + (r.handCash || 0),
    phonePay: acc.phonePay + (r.phonePay || 0),
    creditCard: acc.creditCard + (r.creditCard || 0),
    inventoryValue: acc.inventoryValue + (r.inventoryValue || 0),
    borrowedMoney: acc.borrowedMoney + (r.borrowedMoney || 0),
    borrowerCashReturned: acc.borrowerCashReturned + (r.borrowerCashReturned || 0),
    expenses: acc.expenses + (r.expenses || 0),
    salariesPaid: acc.salariesPaid + (r.salariesPaid || 0),
    total: acc.total + (r.total || 0),
  }), {
    handCash: 0, phonePay: 0, creditCard: 0, inventoryValue: 0,
    borrowedMoney: 0, borrowerCashReturned: 0, expenses: 0, salariesPaid: 0, total: 0
  }), [rows]);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!payForm.empId) throw new Error("Select an employee");
      if (!payForm.amount || parseFloat(payForm.amount) <= 0) throw new Error("Enter a valid amount");
      const emp = employees.find((e: any) => e.empId === payForm.empId);
      setSubmitting(true);
      await axios.post(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/salary-payments`, {
        empId: payForm.empId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : payForm.empId,
        amount: parseFloat(payForm.amount),
        paymentDate: payForm.paymentDate,
        notes: payForm.notes,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Salary payment recorded." });
      setPayModalOpen(false);
      setPayForm({ empId: "", amount: "", paymentDate: dayjs().format("YYYY-MM-DD"), notes: "" });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.message || err?.message || "Failed to record payment", variant: "destructive" });
    },
    onSettled: () => setSubmitting(false),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Financial Summary</h1>
          <p className="text-muted-foreground">
            Hand cash + PhonePe + credit card + inventory value (all products) + borrowed money + borrower repayments − expenses − salaries paid
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button className="btn-gradient-primary" onClick={() => setPayModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Salary Payment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs font-medium shrink-0 flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Range:
            </Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {preset === "custom" && (
              <>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-[160px] h-9 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-[160px] h-9 text-xs" />
              </>
            )}
            <Badge variant="secondary" className="ml-auto">{rows.length} day{rows.length !== 1 ? "s" : ""}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Totals overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Hand Cash", value: totals.handCash, color: "text-green-600" },
          { label: "PhonePe", value: totals.phonePay, color: "text-violet-600" },
          { label: "Credit Card", value: totals.creditCard, color: "text-blue-600" },
          { label: "Inventory Value (All Products)", value: totals.inventoryValue, color: "text-orange-600" },
          { label: "Borrowed", value: totals.borrowedMoney, color: "text-yellow-600" },
          { label: "Borrower Repayments", value: totals.borrowerCashReturned, color: "text-teal-600" },
          { label: "Expenses", value: totals.expenses, color: "text-destructive" },
          { label: "Salaries Paid", value: totals.salariesPaid, color: "text-destructive" },
          { label: "Total (sum of range)", value: totals.total, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{formatCurrency(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Day-by-Day Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isFetching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No data for this range</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="[&_td]:py-2 [&_th]:py-2.5 [&_td]:px-3 [&_th]:px-3">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold text-xs whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Hand Cash</TableHead>
                    <TableHead className="text-right font-semibold text-xs">PhonePe</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Credit Card</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Inventory Value</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Borrowed</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Repaid</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Expenses</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Salaries</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-b-0 [&_tr:nth-child(even)]:bg-muted/30">
                  {rows.map((r) => (
                    <TableRow
                      key={r.date}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/daily-summary/${r.date}`)}
                    >
                      <TableCell className="text-xs font-medium whitespace-nowrap">{dayjs(r.date).format("DD MMM YYYY")}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(r.handCash)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(r.phonePay)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(r.creditCard)}</TableCell>
                      <TableCell className="text-right text-xs">
                        <div>{formatCurrency(r.inventoryValue)}</div>
                        {r.inventoryByProduct && Object.keys(r.inventoryByProduct).length > 0 && (
                          <div className="text-[10px] text-muted-foreground font-normal whitespace-nowrap">
                            {Object.entries(r.inventoryByProduct)
                              .filter(([, v]) => v)
                              .map(([name, v]) => `${name}: ${formatCurrency(v)}`)
                              .join(" · ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-yellow-700 dark:text-yellow-500">{formatCurrency(r.borrowedMoney)}</TableCell>
                      <TableCell className="text-right text-xs text-teal-700 dark:text-teal-500">{formatCurrency(r.borrowerCashReturned)}</TableCell>
                      <TableCell className="text-right text-xs text-destructive">{formatCurrency(r.expenses)}</TableCell>
                      <TableCell className="text-right text-xs text-destructive">{formatCurrency(r.salariesPaid)}</TableCell>
                      <TableCell className="text-right text-sm font-bold text-primary">{formatCurrency(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Salary Payment Modal */}
      {payModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md"
          style={{ margin: 0, padding: "1rem", minHeight: "100vh", minWidth: "100vw" }}
          onClick={() => setPayModalOpen(false)}
        >
          <div className="bg-background shadow-2xl rounded-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPayModalOpen(false)} className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted p-1.5 transition">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Record Salary Payment
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Employee *</Label>
                <Select value={payForm.empId} onValueChange={(v) => setPayForm((f) => ({ ...f, empId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id || emp.empId} value={emp.empId}>
                        {emp.empId} - {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Amount (₹) *</Label>
                <Input type="number" step="0.01" min="0" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Payment Date *</Label>
                <Input type="date" value={payForm.paymentDate} max={dayjs().format("YYYY-MM-DD")} onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Notes</Label>
                <Input value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setPayModalOpen(false)}>Cancel</Button>
                <Button className="flex-1 btn-gradient-primary" disabled={submitting} onClick={() => payMutation.mutate()}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Payment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
