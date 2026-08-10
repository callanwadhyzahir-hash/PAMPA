import type {
  BarcodeDetector as BarcodeDetectorClass,
  BarcodeFormat,
} from 'barcode-detector/ponyfill';

export type { BarcodeDetectorClass };
export type BarcodeDetectorCtor = typeof BarcodeDetectorClass;

/** Formats the camera reader must recognize, per the barcode design. */
export const SCAN_FORMATS: BarcodeFormat[] = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
];

/**
 * Prefers the browser's native BarcodeDetector; falls back to the
 * `barcode-detector` ponyfill (zxing-wasm) only when it is missing, so
 * browsers that already support the native API (most desktop/Android
 * Chrome) never pay for the WASM download.
 */
export async function resolveBarcodeDetector(
  native: BarcodeDetectorCtor | undefined,
  loadPonyfill: () => Promise<{ BarcodeDetector: BarcodeDetectorCtor }>,
): Promise<BarcodeDetectorCtor | null> {
  if (native) return native;
  try {
    const loaded = await loadPonyfill();
    return loaded.BarcodeDetector;
  } catch {
    return null;
  }
}

export async function loadBarcodeDetector(): Promise<BarcodeDetectorCtor | null> {
  if (typeof window === 'undefined') return null;
  const native = (
    window as typeof window & { BarcodeDetector?: BarcodeDetectorCtor }
  ).BarcodeDetector;
  return resolveBarcodeDetector(
    native,
    () => import('barcode-detector/ponyfill'),
  );
}

export type CameraErrorReason =
  | 'permission-denied'
  | 'no-camera'
  | 'unsupported'
  | 'insecure-context'
  | 'camera-error';

export const CAMERA_ERROR_MESSAGES: Record<CameraErrorReason, string> = {
  'permission-denied':
    'Permiso de cámara denegado. Habilitalo en la configuración del navegador para escanear.',
  'no-camera': 'No se encontró ninguna cámara disponible en este dispositivo.',
  unsupported:
    'Este navegador no puede leer códigos de barras por cámara. Probá con el lector USB.',
  'insecure-context':
    'La cámara requiere una conexión segura (HTTPS). Probá con el lector USB o accedé por HTTPS.',
  'camera-error':
    'No se pudo acceder a la cámara. Cerrá otras apps que la estén usando e intentá de nuevo.',
};

/** True when the current page can use getUserMedia (HTTPS or localhost). */
export function isCameraSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

/** Classifies getUserMedia/BarcodeDetector failures into a user-facing reason + message. */
export function classifyCameraError(error: unknown): {
  reason: CameraErrorReason;
  message: string;
} {
  const name = error instanceof DOMException ? error.name : undefined;
  let reason: CameraErrorReason = 'camera-error';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    reason = 'permission-denied';
  } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    reason = 'no-camera';
  }
  return { reason, message: CAMERA_ERROR_MESSAGES[reason] };
}
