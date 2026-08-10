import { useCallback, useState, type KeyboardEvent, type RefObject } from 'react';

interface UseBarcodeEntryOptions {
  /** Current value of the controlled input (typed manually or by a USB scanner). */
  value: string;
  /**
   * Called with the trimmed barcode when the user (or scanner) presses Enter.
   * Must resolve the barcode with an exact, tenant-scoped lookup — never a
   * substring/local-list match. Errors thrown here are caught by the hook;
   * throw a plain Error with a user-facing message to surface it via `onError`.
   */
  onScan: (barcode: string) => void | Promise<void>;
  /** Receives scan errors so the caller can render them. */
  onError?: (error: unknown) => void;
  /** Ref to the input, owned by the caller, so focus can be restored after each scan. */
  inputRef?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

interface UseBarcodeEntryResult {
  scanning: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Trims the raw input and decides whether an Enter keypress should trigger a
 * scan: rejects while disabled/already scanning or once trimmed to nothing.
 * Kept pure and separate from the hook so it's unit-testable without a DOM.
 */
export function normalizeBarcodeEntry(
  rawValue: string,
  disabled: boolean,
  scanning: boolean,
): string | null {
  if (disabled || scanning) return null;
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Wires a text input to accept both a USB/keyboard-wedge scanner (which types
 * the barcode then emits Enter) and manual typing followed by Enter. Blocks
 * concurrent scans, restores focus after each attempt (when `inputRef` is
 * given), and leaves clearing the input / value state to the caller since
 * some fields (e.g. a product's barcode field) must keep the scanned value
 * instead of resetting it.
 */
function useBarcodeEntry({
  value,
  onScan,
  onError,
  inputRef,
  disabled = false,
}: UseBarcodeEntryOptions): UseBarcodeEntryResult {
  const [scanning, setScanning] = useState(false);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const barcode = normalizeBarcodeEntry(value, disabled, scanning);
      if (!barcode) return;

      setScanning(true);
      void Promise.resolve(onScan(barcode))
        .catch((error: unknown) => onError?.(error))
        .finally(() => {
          setScanning(false);
          inputRef?.current?.focus();
        });
    },
    [value, onScan, onError, inputRef, disabled, scanning],
  );

  return { scanning, onKeyDown };
}

export { useBarcodeEntry };
export type { UseBarcodeEntryOptions, UseBarcodeEntryResult };
