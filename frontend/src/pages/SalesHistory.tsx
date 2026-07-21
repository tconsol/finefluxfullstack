import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import dayjs, { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  Clock,
  Droplet,
  User,
  CreditCard,
  Smartphone,
  Wallet,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Loader2,
  Fuel,
  ArrowLeft,
  FileText,
  Sheet,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  LayoutList,
  X,
} from "lucide-react";
import { API_CONFIG } from '@/lib/api-config';
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


// ============ Types ============
interface SaleRecord {
  id: string;
  saleId?: string;
  dateTime: string;
  saleEndTime?: string;
  saleCreatedAt?: string;
  productName: string;
  guns: string;
  salesInLiters: number;
  testingTotal: number;
  empId: string;
  salesInRupees: number;
  cashReceived: number;
  phonePay: number;
  creditCard: number;
  shortCollections: number;
  receivedTotal: number;
  mutationby?: string; // Track if sale was deleted
}

interface SalesSummary {
  totalSales: number;
  cash: number;
  upi: number;
  card: number;
  short: number;
  received: number;
  deletedSalesCount: number;
  deletedSalesAmount: number;
}

type DatePreset = "latest" | "today" | "week" | "month" | "all" | "custom";
type PaymentFilter = "all" | "cash" | "upi" | "card";

// ============ Constants ============
// Removed - using API_CONFIG
const RUPEE = "\u20B9";
const RECORDS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ============ Utility Functions ============
const rangeForPreset = (preset: DatePreset): [Dayjs, Dayjs] => {
  const today = dayjs();
  switch (preset) {
    case "latest":
      // Return a very wide range for latest 10 records
      return [today.subtract(1, "year"), today.endOf("day")];
    case "today":
      return [today.startOf("day"), today.endOf("day")];
    case "week":
      // Rolling last 7 days, not calendar-week-so-far — otherwise this shows almost
      // nothing right after the calendar week rolls over (e.g. on a Monday/Tuesday),
      // even though there was plenty of activity "recently".
      return [today.subtract(6, "day").startOf("day"), today.endOf("day")];
    case "month":
      // Rolling last 30 days, same reasoning as "week" above.
      return [today.subtract(29, "day").startOf("day"), today.endOf("day")];
    case "all":
      // Return a very wide range to get all records
      return [today.subtract(10, "year"), today.endOf("day")];
    default:
      return [today.subtract(1, "year"), today.endOf("day")];
  }
};

const formatCurrency = (value: number): string => {
  return `${RUPEE}${value.toLocaleString("en-IN")}`;
};

// Parse various date formats that may come from the API (ISO string, number, or mongo-like $date object)
const parseTime = (v: any): number => {
  if (!v) return 0;
  // If it's an object like { $date: { $numberLong: "..." } }
  try {
    if (typeof v === 'object') {
      if (v.$date) {
        const d = v.$date;
        if (typeof d === 'object' && d.$numberLong) return Number(d.$numberLong);
        if (typeof d === 'number') return d;
        if (typeof d === 'string') return Date.parse(d) || 0;
      }
      // If it's a plain number stored as object
      if (v.$numberLong) return Number(v.$numberLong);
      // If it has iso string directly
      if (v.iso) return Date.parse(v.iso) || 0;
      return 0;
    }

    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
      const parsed = Date.parse(v);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  } catch (e) {
    return 0;
  }

  return 0;
};

// Parse numeric values robustly (handles strings with commas/currency)
const parseNumber = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  try {
    const s = String(v).replace(/[^0-9.-]+/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

// Return latest record per saleId (or id when saleId missing). Use lastUpdated when available, fallback to dateTime.
const getLatestRecords = (records: SaleRecord[]) => {
  // First pass: group records that already have a stable `saleId`.
  const latestByKey = new Map<string, SaleRecord>();

  const recordsWithSaleId = records.filter((r) => (r as any).saleId);
  for (const r of recordsWithSaleId) {
    const key = (r as any).saleId as string;
    const existing = latestByKey.get(key);
    const rTime = parseTime((r as any).lastUpdated) || parseTime(r.dateTime);
    if (!existing) {
      latestByKey.set(key, r);
      continue;
    }
    const existingTime = parseTime((existing as any).lastUpdated) || parseTime(existing.dateTime);
    if (rTime >= existingTime) latestByKey.set(key, r);
  }

  // Conservative heuristic for records that don't have `saleId`:
  // - Try to match them to an existing sale (same productName, empId, liters, total) within a time window.
  // - If no match found, group by a composite key (product|emp|liters|total) with a small time-bucket to avoid accidental collisions.
  const WINDOW_MINUTES = 10;
  const windowMs = WINDOW_MINUTES * 60 * 1000;

  const recordsWithoutSaleId = records.filter((r) => !(r as any).saleId);
  for (const r of recordsWithoutSaleId) {
    const rTime = parseTime((r as any).lastUpdated) || parseTime(r.dateTime);
    // Create a composite key used for conservative matching
    const comp = `${r.productName || ""}|${r.empId || ""}|${r.salesInLiters || 0}|${r.salesInRupees || 0}`;

    // Try to find a matching existing sale key.
    // Special-case deletion records: match more loosely (ignore amounts) so a delete without saleId
    // can override a nearby create record and remove it from totals.
    let matchedKey: string | null = null;
    if ((r as any).mutationby === 'sale_delete') {
      for (const [k, existing] of latestByKey.entries()) {
        const existingTime = parseTime((existing as any).lastUpdated) || parseTime(existing.dateTime);
        const timeDiff = Math.abs(rTime - existingTime);
        // Loose match: same product + empId + guns and within window
        if (
          String(existing.productName || '').trim().toLowerCase() === String(r.productName || '').trim().toLowerCase() &&
          String(existing.empId || '').trim() === String(r.empId || '').trim() &&
          String(existing.guns || '').trim().toLowerCase() === String(r.guns || '').trim().toLowerCase() &&
          timeDiff <= windowMs
        ) {
          matchedKey = k;
          break;
        }
      }
    } else {
      for (const [k, existing] of latestByKey.entries()) {
        const existingComp = `${existing.productName || ""}|${existing.empId || ""}|${existing.salesInLiters || 0}|${existing.salesInRupees || 0}`;
        const existingTime = parseTime((existing as any).lastUpdated) || parseTime(existing.dateTime);
        if (comp === existingComp && Math.abs(rTime - existingTime) <= windowMs) {
          matchedKey = k;
          break;
        }
      }
    }

    if (matchedKey) {
      // merge into matched key
      const existing = latestByKey.get(matchedKey)!;
      const existingTime = parseTime((existing as any).lastUpdated) || parseTime(existing.dateTime);
      // For deletes prefer the delete even if timestamp is equal or slightly earlier
      if ((r as any).mutationby === 'sale_delete') {
        latestByKey.set(matchedKey, r);
      } else if (rTime >= existingTime) {
        latestByKey.set(matchedKey, r);
      }
      continue;
    }

    // No match to an existing saleId: create/merge into a composite time-bucket key
    const timeBucket = Math.floor(rTime / windowMs);
    const fallbackKey = `__cmp:${comp}:${timeBucket}`;
    const existing = latestByKey.get(fallbackKey);
    if (!existing) {
      latestByKey.set(fallbackKey, r);
      continue;
    }
    const existingTime = parseTime((existing as any).lastUpdated) || parseTime(existing.dateTime);
    if (rTime >= existingTime) latestByKey.set(fallbackKey, r);
  }

  return Array.from(latestByKey.values());
};

// ============ Export Functions ============
const exportToCSV = (records: SaleRecord[], from: Dayjs, to: Dayjs) => {
  const headers = [
    "Date/Time",
    "Product",
    "Gun",
    "Liters",
    "Testing",
    "Employee",
    "Total Sales",
    "Cash",
    "UPI",
    "Card",
    "Short",
    "Received Total",
  ];

  // Export active (latest) records only for accurate export
  const latest = getLatestRecords(records).filter(r => r.mutationby !== 'sale_delete');

  const rows = latest.map((record) => [
    dayjs(record.dateTime).format("DD-MM-YYYY HH:mm"),
    record.productName,
    record.guns,
    record.salesInLiters,
    record.testingTotal,
    record.empId,
    record.salesInRupees,
    record.cashReceived,
    record.phonePay,
    record.creditCard,
    record.shortCollections,
    record.receivedTotal,
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `sales-history-${from.format("DD-MM-YYYY")}-to-${to.format("DD-MM-YYYY")}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportToPDF = (
  records: SaleRecord[],
  from: Dayjs,
  to: Dayjs,
  summary: SalesSummary
) => {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Sales History Report", 105, 15, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Period: ${from.format("DD MMM YYYY")} to ${to.format("DD MMM YYYY")}`,
    105,
    25,
    { align: "center" }
  );

  doc.setFontSize(9);
  doc.text(`Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}`, 105, 32, {
    align: "center",
  });

  // Summary (excluding deleted sales)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Summary (Active Sales Only)", 14, 50);

  const summaryData = [
    ["Total Sales", formatCurrency(summary.totalSales)],
    ["Cash Received", formatCurrency(summary.cash)],
    ["UPI Payments", formatCurrency(summary.upi)],
    ["Card Payments", formatCurrency(summary.card)],
    ["Short Collections", formatCurrency(summary.short)],
    ["Total Received", formatCurrency(summary.received)],
  ];

  autoTable(doc, {
    startY: 55,
    head: [["Metric", "Amount"]],
    body: summaryData,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });

  // Records (excluding deleted sales for clarity)
  const activeSalesRecords = getLatestRecords(records).filter(r => r.mutationby !== 'sale_delete');
  const finalY = (doc as any).lastAutoTable?.finalY || 55;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Records (Active Sales)", 14, finalY + 12);

  const tableData = activeSalesRecords.map((record) => [
    dayjs(record.dateTime).format("DD-MM HH:mm"),
    record.productName,
    record.guns,
    record.salesInLiters,
    record.empId,
    formatCurrency(record.salesInRupees),
    formatCurrency(record.cashReceived),
    formatCurrency(record.phonePay),
    formatCurrency(record.creditCard),
  ]);

  autoTable(doc, {
    startY: finalY + 16,
    head: [
      [
        "Date/Time",
        "Product",
        "Gun",
        "Liters",
        "Employee",
        "Total",
        "Cash",
        "UPI",
        "Card",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { top: 10 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(
    `sales-history-${from.format("DD-MM-YYYY")}-to-${to.format(
      "DD-MM-YYYY"
    )}.pdf`
  );
};

// ============ Compact Mobile-First Sale Record Card ============
const SaleRecordCard = ({ record, index, employeeLabel }: { record: SaleRecord; index: number; employeeLabel: string }) => {
  const [expanded, setExpanded] = useState(false);

  // Check if sale was deleted
  const isSaleDeleted = record.mutationby === 'sale_delete';
  // Check if all payment methods are zero
  const hasNoPayments = record.cashReceived === 0 && record.phonePay === 0 && record.creditCard === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className={`overflow-hidden border shadow-sm ${
        isSaleDeleted || hasNoPayments
          ? 'border-orange-400 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-950/20' 
          : 'border-border/60'
      }`}>
        <CardContent className="p-3 sm:p-4">
          {/* Header: Product + Total */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-600 text-white shrink-0">
                  <Fuel className="h-4 w-4" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold truncate">
                  {record.productName}
                </h3>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dayjs(record.dateTime).format("DD MMM YYYY")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {dayjs(record.dateTime).format("hh:mm A")}
                  {record.saleEndTime ? ` – ${dayjs(record.saleEndTime).format("hh:mm A")}` : ""}
                </span>
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs"
                >
                  <User className="h-3 w-3" />
                  {employeeLabel}
                </Badge>
                {isSaleDeleted && (
                  <Badge
                    variant="destructive"
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs bg-orange-500 hover:bg-orange-600"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Sale Deleted
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Total</p>
              <p className="text-xl sm:text-2xl font-extrabold text-primary">
                {formatCurrency(record.salesInRupees)}
              </p>
            </div>
          </div>

          {/* Key metrics row: stacks on mobile */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-4 sm:border-y sm:py-2">
            <div className="flex items-center gap-1.5">
              <Droplet className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Sale</span>
              <span className="text-sm font-semibold">{record.salesInLiters.toFixed(2)}L</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Gun</span>
              <span className="text-sm font-semibold capitalize">{record.guns}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Testing</span>
              <span className="text-sm font-semibold">{record.testingTotal}</span>
            </div>
          </div>

          {/* Payments: chips wrap cleanly */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {record.cashReceived > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400 text-xs">
                <Wallet className="h-3.5 w-3.5" />
                <span className="font-semibold">{formatCurrency(record.cashReceived)}</span>
              </div>
            )}
            {record.phonePay > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 text-xs">
                <Smartphone className="h-3.5 w-3.5" />
                <span className="font-semibold">{formatCurrency(record.phonePay)}</span>
              </div>
            )}
            {record.creditCard > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 text-xs">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="font-semibold">{formatCurrency(record.creditCard)}</span>
              </div>
            )}
            {record.shortCollections > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-medium">Short:</span>
                <span className="font-semibold">{formatCurrency(record.shortCollections)}</span>
              </div>
            )}
          </div>

          {/* Expand details (only when useful) */}
          {record.shortCollections > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="w-full mt-2 h-8 text-xs"
            >
              {expanded ? "Hide details" : "View details"}
              <ChevronRight
                className={`ml-1 h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""
                  }`}
              />
            </Button>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 pt-2 border-t border-border/70">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Received Total</span>
                    <span className="font-semibold text-pink-600 dark:text-pink-400">
                      {formatCurrency(record.receivedTotal)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ============ Date Range Selector (mobile-friendly) ============
const DateRangeSelector = ({
  preset,
  setPreset,
  from,
  to,
  onCustomChange,
  onApply,
}: {
  preset: DatePreset;
  setPreset: (preset: DatePreset) => void;
  from: Dayjs;
  to: Dayjs;
  onCustomChange: (which: "from" | "to", value: string) => void;
  onApply: () => void;
}) => {
  const presetButtons = [
    { id: "latest", label: "Latest 10", icon: Clock },
    { id: "today", label: "Today", icon: Clock },
    { id: "week", label: "This Week", icon: CalendarIcon },
    { id: "month", label: "This Month", icon: CalendarIcon },
    { id: "all", label: "All Records", icon: FileText },
  ] as const;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-xs sm:text-sm font-medium shrink-0">Date:</Label>
        <Select value={preset} onValueChange={(value) => setPreset(value as DatePreset)}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presetButtons.map(({ id, label }) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence>
        {preset === "custom" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-2 sm:p-3 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <Label className="text-xs mb-1 block">From</Label>
                  <Input
                    type="date"
                    value={from.format("YYYY-MM-DD")}
                    onChange={(e) => onCustomChange("from", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs mb-1 block">To</Label>
                  <Input
                    type="date"
                    value={to.format("YYYY-MM-DD")}
                    onChange={(e) => onCustomChange("to", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button onClick={onApply} className="w-full h-8 text-xs">
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Apply
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============ Pagination Controls (responsive) ============
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  recordsPerPage,
  onRecordsPerPageChange,
  totalRecords,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  recordsPerPage: number;
  onRecordsPerPageChange: (value: number) => void;
  totalRecords: number;
}) => {
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <Card className="p-1.5 sm:p-2">
      <div className="flex flex-col md:flex-row items-center justify-between gap-1.5">
        {/* Records per page selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Per page:</Label>
            <Select
              value={recordsPerPage.toString()}
              onValueChange={(value) => onRecordsPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='z-[10000]'>
                {RECORDS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground ml-auto md:ml-2">
            {startRecord}-{endRecord} of {totalRecords}
          </span>
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hidden md:flex h-8"
          >
            <ChevronsLeft className="h-3 w-3" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 text-xs"
          >
            <ChevronLeft className="h-3 w-3" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          {/* Numeric pages (hide on small screens) */}
          <div className="hidden md:flex items-center gap-0.5">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="h-8 w-8 text-xs p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 text-xs"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden md:flex h-8"
          >
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// ============ Main Component ============
export default function SalesHistory() {
  const orgId = localStorage.getItem("organizationId") || "ORG-DEV-001";
  const [preset, setPreset] = useState<DatePreset>("latest");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() =>
    rangeForPreset("latest")
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const navigate = useNavigate();

  const [from, to] = dateRange;

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/organizations/${orgId}/employees?page=0&size=200`);
      return Array.isArray(res.data?.content) ? res.data.content : Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!orgId,
  });

  const employeeFirstNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const emp of employees) {
      map[emp.empId] = emp.firstName || "";
    }
    return map;
  }, [employees]);

  const formatEmployee = (empId?: string) => {
    if (!empId) return "—";
    const name = employeeFirstNameById[empId];
    return name ? `${empId} - ${name}` : empId;
  };

  useEffect(() => {
    if (preset !== "custom") {
      setDateRange(rangeForPreset(preset));
    }
  }, [preset]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [recordsPerPage, from, to, paymentFilter]);

  const fromIso = from.startOf("day").format("YYYY-MM-DDTHH:mm:ss");
  const toIso = to.endOf("day").format("YYYY-MM-DDTHH:mm:ss");

  const {
    data: records = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["sale-history", orgId, fromIso, toIso, preset],
    queryFn: async () => {
      // For "all" preset, fetch from /sale-history endpoint without date filters
      if (preset === "all") {
        const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/sale-history`;
        const res = await axios.get<SaleRecord[]>(url);
        const data = Array.isArray(res.data) ? res.data : [];
        // Sort by dateTime descending (latest first)
        return data.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      }
      
      // For other presets, use date filtering
      const params = `from=${fromIso}&to=${toIso}`;
      const url = `${API_CONFIG.BASE_URL}/api/organizations/${orgId}/sale-history/by-date?${params}`;
      const res = await axios.get<SaleRecord[]>(url);
      const data = Array.isArray(res.data) ? res.data : [];
      
      // Sort by dateTime descending (latest first)
      const sortedData = data.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      
      // For "latest" preset, return only the latest 10 records
      if (preset === "latest") {
        return sortedData.slice(0, 10);
      }
      
      return sortedData;
    },
    refetchOnWindowFocus: false,
  });

  const summary: SalesSummary = useMemo(() => {
    const latestRecords = getLatestRecords(records);
    const activeLatest = latestRecords.filter((rec) => rec.mutationby !== "sale_delete");
    const deletedLatest = latestRecords.filter((rec) => rec.mutationby === "sale_delete");

    const activeSummary = activeLatest.reduce(
      (acc, record) => ({
        totalSales: acc.totalSales + parseNumber(record.salesInRupees || record.receivedTotal || 0),
        cash: acc.cash + parseNumber(record.cashReceived || 0),
        upi: acc.upi + parseNumber(record.phonePay || 0),
        card: acc.card + parseNumber(record.creditCard || 0),
        short: acc.short + parseNumber(record.shortCollections || 0),
        received: acc.received + parseNumber(record.receivedTotal || (record.cashReceived || 0) + (record.phonePay || 0) + (record.creditCard || 0)),
      }),
      { totalSales: 0, cash: 0, upi: 0, card: 0, received: 0, short: 0 }
    );

    const deletedAmount = deletedLatest.reduce(
      (sum, record) => sum + parseNumber(record.salesInRupees || 0),
      0
    );

    // Round totals to 2 decimals
    const rounded = {
      totalSales: Math.round(activeSummary.totalSales * 100) / 100,
      cash: Math.round(activeSummary.cash * 100) / 100,
      upi: Math.round(activeSummary.upi * 100) / 100,
      card: Math.round(activeSummary.card * 100) / 100,
      short: Math.round(activeSummary.short * 100) / 100,
      received: Math.round(activeSummary.received * 100) / 100,
    };

    return {
      ...rounded,
      deletedSalesCount: deletedLatest.length,
      deletedSalesAmount: Math.round(deletedAmount * 100) / 100,
    };
  }, [records]);

  // Filter records based on payment type
  const filteredRecords = useMemo(() => {
    const latest = getLatestRecords(records).filter(r => r.mutationby !== 'sale_delete');
    
    if (paymentFilter === "all") return latest;
    if (paymentFilter === "cash") return latest.filter(r => r.cashReceived > 0);
    if (paymentFilter === "upi") return latest.filter(r => r.phonePay > 0);
    if (paymentFilter === "card") return latest.filter(r => r.creditCard > 0);
    
    return latest;
  }, [records, paymentFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredRecords.slice(startIndex, endIndex);
  }, [filteredRecords, currentPage, recordsPerPage]);

  const handleCustomChange = (which: "from" | "to", value: string) => {
    setPreset("custom");
    setDateRange(([oldFrom, oldTo]) => [
      which === "from" ? dayjs(value) : oldFrom,
      which === "to" ? dayjs(value) : oldTo,
    ]);
  };

  const handlePageChange = (page: number) => {
    const next = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
    setCurrentPage(1);
  };

  // Handler for stat card clicks
  const handleStatCardClick = (paymentType: PaymentFilter) => {
    setPaymentFilter(paymentType === paymentFilter ? "all" : paymentType);
    setCurrentPage(1);
    setViewMode("table");
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="max-w-6xl mx-auto w-full p-2 sm:p-3 space-y-1.5 flex flex-col h-full overflow-hidden">

        {/* Date Range Selector */}
        <DateRangeSelector
          preset={preset}
          setPreset={setPreset}
          from={from}
          to={to}
          onCustomChange={handleCustomChange}
          onApply={() => refetch()}
        />

        {/* Summary Stats - Clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card 
              onClick={() => handleStatCardClick("cash")}
              className={`overflow-hidden border cursor-pointer transition-all ${
                paymentFilter === "cash" 
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20' 
                  : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
              }`}
            >
              <CardContent className="p-1.5 sm:p-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">Cash</p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(summary.cash)}
                    </h3>
                  </div>
                  <div className={`p-1.5 rounded-lg ${paymentFilter === "cash" ? 'bg-emerald-500' : 'bg-emerald-600'}`}>
                    <Wallet className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card 
              onClick={() => handleStatCardClick("upi")}
              className={`overflow-hidden border cursor-pointer transition-all ${
                paymentFilter === "upi" 
                  ? 'border-violet-500 shadow-lg shadow-violet-500/20 bg-violet-50 dark:bg-violet-950/20' 
                  : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
              }`}
            >
              <CardContent className="p-1.5 sm:p-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">UPI</p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(summary.upi)}
                    </h3>
                  </div>
                  <div className={`p-1.5 rounded-lg ${paymentFilter === "upi" ? 'bg-violet-500' : 'bg-violet-600'}`}>
                    <Smartphone className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card 
              onClick={() => handleStatCardClick("card")}
              className={`overflow-hidden border cursor-pointer transition-all ${
                paymentFilter === "card" 
                  ? 'border-amber-500 shadow-lg shadow-amber-500/20 bg-amber-50 dark:bg-amber-950/20' 
                  : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
              }`}
            >
              <CardContent className="p-1.5 sm:p-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">Card</p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(summary.card)}
                    </h3>
                  </div>
                  <div className={`p-1.5 rounded-lg ${paymentFilter === "card" ? 'bg-amber-500' : 'bg-amber-600'}`}>
                    <CreditCard className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Card className="overflow-hidden border border-slate-200 dark:border-slate-700">
            <CardContent className="p-1.5 sm:p-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">Received</p>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary.received)}
                  </h3>
                </div>
                <div className="p-1.5 rounded-lg bg-teal-600">
                  <Wallet className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 sm:p-2 bg-white dark:bg-slate-900 rounded-lg border border-border/50">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm font-medium">Filter by Payment:</Label>
            <Select value={paymentFilter} onValueChange={(value) => {
              setPaymentFilter(value as PaymentFilter);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="cash">Cash Only</SelectItem>
                <SelectItem value="upi">UPI Only</SelectItem>
                <SelectItem value="card">Card Only</SelectItem>
              </SelectContent>
            </Select>
            {paymentFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPaymentFilter("all");
                  setCurrentPage(1);
                }}
                className="h-8 gap-1"
              >
                <X className="h-4 w-4" />
                Clear Filter
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 border border-border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 gap-1"
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="h-8 gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
          </div>
        </div>

        {/* Pagination & Export Bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-wrap items-center justify-between gap-1 bg-white dark:bg-slate-900 rounded-lg border border-border/50 p-1.5 sm:p-2"
        >
          {/* Pagination on Left */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <Label className="text-xs whitespace-nowrap">Per page:</Label>
              <Select
                value={recordsPerPage.toString()}
                onValueChange={(value) => onRecordsPerPageChange(Number(value))}
              >
                <SelectTrigger className="w-[70px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='z-[10000]'>
                  {RECORDS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.max(1, (currentPage - 1) * recordsPerPage + 1)}-{Math.min(currentPage * recordsPerPage, filteredRecords.length)} of {filteredRecords.length}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === totalPages || totalPages === 1}
                className="hidden md:flex h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 px-2 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 px-2 text-xs"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || totalPages === 1}
                className="hidden md:flex h-8 w-8 p-0"
              >
                <ChevronsRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Export Buttons on Right */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(filteredRecords, from, to)}
              disabled={filteredRecords.length === 0}
              className="h-8"
            >
              <Sheet className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF(filteredRecords, from, to, summary)}
              disabled={filteredRecords.length === 0}
              className="h-8"
            >
              <FileText className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </motion.div>


        {/* Content */}
        {isFetching ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
            <p className="text-sm sm:text-base text-muted-foreground">
              Loading sales history...
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-muted flex items-center justify-center mb-2">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-0.5">No Sales Found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
              {paymentFilter !== "all" ? `No sales with ${paymentFilter} payment found. Try changing your filter.` : "Try adjusting your date range to see more results"}
            </p>
            <Button onClick={() => {
              setPaymentFilter("all");
              setPreset("week");
            }} className="h-8 text-sm">
              View This Week
            </Button>
          </motion.div>
        ) : viewMode === "table" ? (
          // TABLE VIEW
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-x-auto flex-1 min-h-0 rounded-lg border border-border/50 bg-white dark:bg-slate-900"
            >
              <Table className="[&_td]:py-2 [&_th]:py-2.5 [&_td]:px-3 [&_th]:px-3">
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold text-xs whitespace-nowrap">Timing</TableHead>
                    <TableHead className="font-semibold text-xs">Product / Gun</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Liters</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Amount</TableHead>
                    <TableHead className="font-semibold text-xs">Payment</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Received</TableHead>
                    <TableHead className="font-semibold text-xs">Employee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-b-0 [&_tr:nth-child(even)]:bg-muted/30">
                  {paginatedRecords.map((record, index) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors align-middle"
                    >
                      <TableCell className="text-xs whitespace-nowrap leading-snug">
                        <div className="font-medium text-foreground">{dayjs(record.dateTime).format("DD MMM YYYY")}</div>
                        <div className="text-muted-foreground">
                          {dayjs(record.dateTime).format("hh:mm A")}
                          {record.saleEndTime ? ` – ${dayjs(record.saleEndTime).format("hh:mm A")}` : ""}
                        </div>
                        {record.saleCreatedAt && (
                          <div className="text-[10px] text-muted-foreground/70">Created {dayjs(record.saleCreatedAt).format("hh:mm A")}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs leading-snug">
                        <div className="font-medium">{record.productName}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">Gun: {record.guns}</div>
                      </TableCell>
                      <TableCell className="text-right text-xs">{record.salesInLiters.toFixed(2)}L</TableCell>
                      <TableCell className="text-right font-semibold text-xs">{formatCurrency(record.salesInRupees)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {record.cashReceived > 0 && (
                            <Badge variant="secondary" className="w-fit bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400 text-[10px] px-1.5 py-0.5">
                              Cash: {formatCurrency(record.cashReceived)}
                            </Badge>
                          )}
                          {record.phonePay > 0 && (
                            <Badge variant="secondary" className="w-fit bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-400 text-[10px] px-1.5 py-0.5">
                              UPI: {formatCurrency(record.phonePay)}
                            </Badge>
                          )}
                          {record.creditCard > 0 && (
                            <Badge variant="secondary" className="w-fit bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400 text-[10px] px-1.5 py-0.5">
                              Card: {formatCurrency(record.creditCard)}
                            </Badge>
                          )}
                          {record.cashReceived <= 0 && record.phonePay <= 0 && record.creditCard <= 0 && (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs">{formatCurrency(record.receivedTotal)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatEmployee(record.empId)}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </div>
        ) : (
          // CARD VIEW
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
              {paginatedRecords.map((record, index) => (
                <SaleRecordCard key={record.id} record={record} index={index} employeeLabel={formatEmployee(record.empId)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}