'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CAMERA_ERROR_MESSAGES,
  classifyCameraError,
  isCameraSecureContext,
  loadBarcodeDetector,
  SCAN_FORMATS,
} from '@/lib/barcode/camera-detector';

interface BarcodeCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once with the normalized (trimmed) value of the first barcode detected. */
  onDetected: (barcode: string) => void;
}

/**
 * Opens the device camera and reads a barcode using the native
 * BarcodeDetector API (or the zxing-wasm ponyfill where it's missing, e.g.
 * Safari/Firefox). Detects a single code, then closes itself.
 */
function BarcodeCameraDialog({
  open,
  onOpenChange,
  onDetected,
}: BarcodeCameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    detectedRef.current = false;

    async function start() {
      setError(null);
      setReady(false);
      if (!isCameraSecureContext()) {
        setError(CAMERA_ERROR_MESSAGES['insecure-context']);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(CAMERA_ERROR_MESSAGES.unsupported);
        return;
      }
      const DetectorCtor = await loadBarcodeDetector();
      if (!DetectorCtor) {
        setError(CAMERA_ERROR_MESSAGES.unsupported);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch (mediaError) {
        if (!cancelled) setError(classifyCameraError(mediaError).message);
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch (playError) {
        if (!cancelled) setError(classifyCameraError(playError).message);
        return;
      }
      if (cancelled) return;
      setReady(true);

      const detector = new DetectorCtor({ formats: SCAN_FORMATS });

      const scan = async () => {
        if (cancelled || detectedRef.current || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (!detectedRef.current && results.length > 0) {
            detectedRef.current = true;
            onDetected(results[0].rawValue.trim());
            onOpenChange(false);
            return;
          }
        } catch {
          // Transient decode failures between frames are expected; keep scanning.
        }
        if (!cancelled && !detectedRef.current) {
          rafRef.current = requestAnimationFrame(() => void scan());
        }
      };
      rafRef.current = requestAnimationFrame(() => void scan());
    }

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear código</DialogTitle>
          <DialogDescription>
            Apuntá la cámara al código de barras del producto.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !ready ? (
          <p className="text-sm text-muted-foreground">
            Solicitando acceso a la cámara…
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { BarcodeCameraDialog };
export type { BarcodeCameraDialogProps };
