import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, RotateCcw, Check, Upload, Aperture, Trash2 } from "lucide-react";

type Mode = "choose" | "camera" | "review";

interface ParsedEntry {
  productName: string;
  gun: string;
  openingStock: string;
  closingStock: string;
  testingTotal: string;
  price: string;
}

interface ApplyResult {
  entries: ParsedEntry[];
  cashReceived: string;
  phonePay: string;
  creditCard: string;
  saleDate: string;
  saleStartTime: string;
  saleEndTime: string;
}

interface DsrSheetCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: any[];
  guns: any[];
  onApply: (result: ApplyResult) => void;
}

interface Word {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

// tesseract.js only returns word-level bboxes when { blocks: true } is requested, and
// even then nests them as blocks -> paragraphs -> lines -> words rather than a flat list.
function flattenWords(data: any): Word[] {
  const words: Word[] = [];
  for (const block of data.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        for (const w of line.words || []) {
          words.push({ text: w.text, bbox: w.bbox });
        }
      }
    }
  }
  return words;
}

const isNumericToken = (t: string) => /\d/.test(t) && /^[\d,.\/:apm]+$/i.test(t);
const cleanNumber = (t: string) => t.replace(/[^\d.]/g, "");

// Groups OCR words into text lines by vertical overlap, then reads each line as
// "label words ... trailing number" — matches how a ruled ledger row is laid out
// (label on the left, handwritten value on the right of the same row).
function groupIntoLines(words: Word[]) {
  const sorted = [...words].sort((a, b) => (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2);
  const avgHeight = sorted.reduce((s, w) => s + (w.bbox.y1 - w.bbox.y0), 0) / Math.max(1, sorted.length);
  const lineThresh = Math.max(8, avgHeight * 0.7);

  const lines: { yc: number; words: Word[] }[] = [];
  for (const w of sorted) {
    const yc = (w.bbox.y0 + w.bbox.y1) / 2;
    let line = lines.find((l) => Math.abs(l.yc - yc) < lineThresh);
    if (!line) {
      line = { yc, words: [] };
      lines.push(line);
    }
    line.words.push(w);
    line.yc = line.words.reduce((s, ww) => s + (ww.bbox.y0 + ww.bbox.y1) / 2, 0) / line.words.length;
  }
  lines.forEach((l) => l.words.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  return lines;
}

// Best-effort read of a handwritten daily-sales-register sheet: walks OCR'd lines
// top-to-bottom, starts a new product block every time it sees a "Closing" row (this
// paper's meter-reading rows repeat once per fuel product), and pulls Opening/Rate off
// the following rows. Cash/UPI/Card and date/time are grabbed wherever their label
// appears. Everything here is a starting guess — the review table is what makes it safe.
function parseDsrSheet(words: Word[]) {
  const lines = groupIntoLines(words);

  const blocks: { openingStock: string; closingStock: string; price: string }[] = [];
  let current: (typeof blocks)[number] | null = null;
  let cashReceived = "";
  let phonePay = "";
  let creditCard = "";
  let saleDate = "";
  const times: string[] = [];

  for (const line of lines) {
    const text = line.words.map((w) => w.text).join(" ");
    const norm = text.toLowerCase();
    const nums = line.words.filter((w) => isNumericToken(w.text)).map((w) => w.text);
    const lastNum = nums[nums.length - 1];

    if (!saleDate) {
      const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
      if (dateMatch) saleDate = dateMatch[0];
    }
    const timeMatches = text.match(/\d{1,2}[:.]\d{2}\s*[ap]\.?m\.?/gi);
    if (timeMatches) times.push(...timeMatches);

    if (/clos/.test(norm)) {
      current = { openingStock: "", closingStock: "", price: "" };
      blocks.push(current);
      if (lastNum) current.closingStock = cleanNumber(lastNum);
      continue;
    }
    if (/\bopen/.test(norm) && lastNum && current) {
      current.openingStock = cleanNumber(lastNum);
      continue;
    }
    if (/rate/.test(norm) && lastNum && current) {
      current.price = cleanNumber(lastNum);
      continue;
    }
    if (/\bpp\b/.test(norm) && lastNum) phonePay = cleanNumber(lastNum);
    else if (/\bcc\b/.test(norm) && lastNum) creditCard = cleanNumber(lastNum);
    else if (/cash/.test(norm) && lastNum) cashReceived = cleanNumber(lastNum);
  }

  return { blocks, cashReceived, phonePay, creditCard, saleDate, times };
}

function toIsoDate(raw: string): string {
  const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return "";
  let [, d, mo, y] = m;
  if (y.length === 2) y = `20${y}`;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function to24Hour(raw: string): string {
  const m = raw.match(/(\d{1,2})[:.](\d{2})\s*([ap])/i);
  if (!m) return "";
  let [, h, min, ap] = m;
  let hour = parseInt(h, 10);
  if (ap.toLowerCase() === "p" && hour !== 12) hour += 12;
  if (ap.toLowerCase() === "a" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${min}`;
}

export default function DsrSheetCaptureDialog({ open, onOpenChange, products, guns, onApply }: DsrSheetCaptureDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>("choose");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [cashReceived, setCashReceived] = useState("");
  const [phonePay, setPhonePay] = useState("");
  const [creditCard, setCreditCard] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [saleStartTime, setSaleStartTime] = useState("");
  const [saleEndTime, setSaleEndTime] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const reset = () => {
    stopCamera();
    setMode("choose");
    setImagePreview(null);
    setScanning(false);
    setScanError(null);
    setCameraError(null);
    setEntries([]);
    setCashReceived("");
    setPhonePay("");
    setCreditCard("");
    setSaleDate("");
    setSaleStartTime("");
    setSaleEndTime("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!open) stopCamera();
    return () => stopCamera();
  }, [open]);

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const findGunsForProduct = (productName: string) =>
    guns.filter((g: any) => String(g.productName || "").trim().toLowerCase() === productName.trim().toLowerCase());

  const runOcr = async (file: File | Blob, previewUrl: string) => {
    setImagePreview(previewUrl);
    setMode("review");
    setScanning(true);
    setScanError(null);

    try {
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file, {}, { blocks: true });
      await worker.terminate();

      const words = flattenWords(data);
      const parsed = parseDsrSheet(words);

      if (parsed.blocks.length === 0) {
        setScanError("Couldn't find any \"Closing\" rows on this sheet. Add entries manually below, or retake with the sheet flatter and better lit.");
      }

      // Each detected block is almost always a different product (this sheet's repeated
      // Closing/Opening/Rate rows are one per fuel) — default block i to products[i] so two
      // blocks don't collide on the same product+gun and get silently treated as duplicates.
      setEntries(
        parsed.blocks.map((b, i) => {
          const defaultProduct = products[i % Math.max(1, products.length)]?.productName || "";
          const defaultGun = defaultProduct ? findGunsForProduct(defaultProduct)[0]?.guns || "" : "";
          return {
            productName: defaultProduct,
            gun: defaultGun,
            openingStock: b.openingStock,
            closingStock: b.closingStock,
            testingTotal: "0",
            price: b.price,
          };
        })
      );
      setCashReceived(parsed.cashReceived);
      setPhonePay(parsed.phonePay);
      setCreditCard(parsed.creditCard);
      setSaleDate(toIsoDate(parsed.saleDate));
      setSaleStartTime(to24Hour(parsed.times[0] || ""));
      setSaleEndTime(to24Hour(parsed.times[1] || ""));
    } catch {
      setScanError("Scan failed. Try again, or add entries manually below.");
    } finally {
      setScanning(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    runOcr(file, URL.createObjectURL(file));
  };

  const startLiveCamera = async () => {
    setCameraError(null);
    setMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Couldn't access the camera. Check browser permissions, or upload a photo instead.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    stopCamera();
    canvas.toBlob((blob) => {
      if (!blob) return;
      runOcr(blob, canvas.toDataURL("image/jpeg", 0.92));
    }, "image/jpeg", 0.92);
  };

  const updateEntry = (index: number, patch: Partial<ParsedEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlankEntry = () => {
    const defaultProduct = products[0]?.productName || "";
    setEntries((prev) => [...prev, { productName: defaultProduct, gun: "", openingStock: "", closingStock: "", testingTotal: "0", price: "" }]);
  };

  const canApply = entries.length > 0 && entries.every((e) => e.productName && e.gun && e.openingStock !== "" && e.closingStock !== "" && e.price !== "");

  const handleApply = () => {
    onApply({
      entries,
      cashReceived: cashReceived || "0",
      phonePay: phonePay || "0",
      creditCard: creditCard || "0",
      saleDate: saleDate || "",
      saleStartTime: saleStartTime || "",
      saleEndTime: saleEndTime || "",
    });
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <div className="flex flex-col max-h-[85vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Scan Full DSR Sheet
            </DialogTitle>
            <DialogDescription>
              Photograph the whole daily sales sheet — readings, rate and collections are pulled out automatically.
              This uses free on-device OCR, not a paid AI service, so handwriting won't always read perfectly —
              double-check every field below before applying.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
            <canvas ref={canvasRef} className="hidden" />

            {mode === "choose" && (
              <div className="space-y-2">
                <Button type="button" onClick={startLiveCamera} className="w-full gap-2">
                  <Aperture className="h-4 w-4" />
                  Open Live Camera
                </Button>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Button>
              </div>
            )}

            {mode === "camera" && (
              <div className="space-y-3">
                {cameraError ? (
                  <p className="text-sm text-destructive">{cameraError}</p>
                ) : (
                  <div className="rounded-lg overflow-hidden border bg-black">
                    <video ref={videoRef} playsInline muted className="w-full max-h-96 object-contain" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { stopCamera(); setMode("choose"); }} className="flex-1">
                    Back
                  </Button>
                  {!cameraError && (
                    <Button type="button" onClick={capturePhoto} className="flex-1 gap-2">
                      <Camera className="h-4 w-4" />
                      Capture
                    </Button>
                  )}
                </div>
              </div>
            )}

            {mode === "review" && (
              <div className="space-y-4">
                {imagePreview && (
                  <div className="rounded-lg overflow-hidden border bg-muted/30">
                    <img src={imagePreview} alt="Captured DSR sheet" className="w-full max-h-48 object-contain" />
                  </div>
                )}

                {scanning && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reading sheet…
                  </div>
                )}

                {!scanning && (
                  <>
                    {scanError && <p className="text-sm text-destructive">{scanError}</p>}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Sale Date</Label>
                        <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Start Time</Label>
                        <Input type="time" value={saleStartTime} onChange={(e) => setSaleStartTime(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Time</Label>
                        <Input type="time" value={saleEndTime} onChange={(e) => setSaleEndTime(e.target.value)} className="h-9 text-sm" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Detected Products — verify each row</Label>
                      {entries.map((entry, i) => (
                        <div key={i} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Entry {i + 1}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-destructive" onClick={() => removeEntry(i)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Product</Label>
                              <Select
                                value={entry.productName}
                                onValueChange={(v) => updateEntry(i, { productName: v, gun: findGunsForProduct(v)[0]?.guns || "" })}
                              >
                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select product" /></SelectTrigger>
                                <SelectContent>
                                  {products.map((p: any) => (
                                    <SelectItem key={p.id} value={p.productName}>{p.productName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Gun</Label>
                              <Select value={entry.gun} onValueChange={(v) => updateEntry(i, { gun: v })}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select gun" /></SelectTrigger>
                                <SelectContent>
                                  {findGunsForProduct(entry.productName).map((g: any) => (
                                    <SelectItem key={g.guns} value={g.guns}>{g.guns}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Opening</Label>
                              <Input type="number" step="0.001" value={entry.openingStock} onChange={(e) => updateEntry(i, { openingStock: e.target.value })} className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Closing</Label>
                              <Input type="number" step="0.001" value={entry.closingStock} onChange={(e) => updateEntry(i, { closingStock: e.target.value })} className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Testing</Label>
                              <Input type="number" step="0.001" value={entry.testingTotal} onChange={(e) => updateEntry(i, { testingTotal: e.target.value })} className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Rate</Label>
                              <Input type="number" step="0.01" value={entry.price} onChange={(e) => updateEntry(i, { price: e.target.value })} className="h-9 text-sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addBlankEntry} className="w-full">
                        + Add Product Row Manually
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Collections</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Hand Cash</Label>
                          <Input type="number" step="0.01" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">UPI (PP)</Label>
                          <Input type="number" step="0.01" value={phonePay} onChange={(e) => setPhonePay(e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Card (CC)</Label>
                          <Input type="number" step="0.01" value={creditCard} onChange={(e) => setCreditCard(e.target.value)} className="h-9 text-sm" />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Unit-counted items on the sheet (2T, drinks) aren't auto-filled — they don't use meter
                      readings like fuel does, so add those as separate entries by hand after applying this batch.
                    </p>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={reset} className="flex-1 gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Retake
                      </Button>
                      <Button type="button" onClick={handleApply} disabled={!canApply} className="flex-1 gap-2">
                        <Check className="h-4 w-4" />
                        Apply to Batch
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
