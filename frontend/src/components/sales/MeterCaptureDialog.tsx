import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, RotateCcw, Check, Upload, Aperture } from "lucide-react";

interface MeterCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldLabel: string;
  onConfirm: (value: string) => void;
}

type Mode = "choose" | "camera" | "preview";

// Picks the digit run that looks most like a dispenser meter reading: longest run of
// digits wins (a 7-segment meter reading is usually the longest number in frame — brand
// text and stray marks OCR into much shorter noise), decimal point breaks ties.
function extractMeterValue(rawText: string): string {
  const tokens = rawText.match(/\d+(?:\.\d+)?/g) || [];
  if (tokens.length === 0) return "";
  tokens.sort((a, b) => {
    const digitsA = a.replace(".", "").length;
    const digitsB = b.replace(".", "").length;
    if (digitsB !== digitsA) return digitsB - digitsA;
    return (b.includes(".") ? 1 : 0) - (a.includes(".") ? 1 : 0);
  });
  return tokens[0];
}

export default function MeterCaptureDialog({ open, onOpenChange, fieldLabel, onConfirm }: MeterCaptureDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>("choose");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recognizedValue, setRecognizedValue] = useState("");

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
    setRecognizedValue("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Stop the camera the instant the dialog closes, however it closes — don't leave the
  // light/indicator on in the background.
  useEffect(() => {
    if (!open) stopCamera();
    return () => stopCamera();
  }, [open]);

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const runOcr = async (file: File | Blob, previewUrl: string) => {
    setImagePreview(previewUrl);
    setMode("preview");
    setScanning(true);
    setScanError(null);
    setRecognizedValue("");

    try {
      const worker = await createWorker("eng");
      await worker.setParameters({ tessedit_char_whitelist: "0123456789." });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const value = extractMeterValue(text);
      if (!value) {
        setScanError("Couldn't read a number from that photo. Try again with the meter display centered and well lit, or enter it manually below.");
      }
      setRecognizedValue(value);
    } catch {
      setScanError("Scan failed. Try again or enter the reading manually below.");
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

  const handleConfirm = () => {
    if (!recognizedValue) return;
    onConfirm(recognizedValue);
    handleClose(false);
  };

  const handleRetake = () => {
    setImagePreview(null);
    setScanning(false);
    setScanError(null);
    setRecognizedValue("");
    setMode("choose");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Scan {fieldLabel}
          </DialogTitle>
          <DialogDescription>
            Photograph the dispenser meter display — the reading is extracted automatically.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
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
                <video ref={videoRef} playsInline muted className="w-full max-h-72 object-contain" />
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

        {mode === "preview" && imagePreview && (
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden border bg-muted/30">
              <img src={imagePreview} alt="Captured meter" className="w-full max-h-56 object-contain" />
            </div>

            {scanning && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading meter…
              </div>
            )}

            {!scanning && (
              <>
                {scanError && (
                  <p className="text-sm text-destructive">{scanError}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="meter-recognized-value">Recognized Reading</Label>
                  <Input
                    id="meter-recognized-value"
                    type="number"
                    step="0.001"
                    value={recognizedValue}
                    onChange={(e) => setRecognizedValue(e.target.value)}
                    placeholder="Enter reading if not detected correctly"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Double-check against the photo before confirming — edit if the scan misread a digit.</p>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleRetake} className="flex-1 gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </Button>
                  <Button type="button" onClick={handleConfirm} disabled={!recognizedValue} className="flex-1 gap-2">
                    <Check className="h-4 w-4" />
                    Use This Value
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
