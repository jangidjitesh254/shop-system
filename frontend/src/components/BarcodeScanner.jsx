import { useEffect, useRef, useState } from 'react';

/**
 * BarcodeScanner - opens camera, scans barcode, calls onDetected(code).
 * Closes automatically after a successful scan (caller can reopen).
 *
 * Requires: html5-qrcode (loaded from CDN via index.html or installed via npm).
 *
 * Props:
 *   onDetected: (code: string) => void
 *   onClose:    () => void
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const readerRef = useRef(null); // html5-qrcode instance
  const divId = 'barcode-reader';
  const [status, setStatus] = useState('Starting camera…');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    // Dynamically import so this only loads when scanner is used
    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (cancelled) return;

      const scanner = new Html5Qrcode(divId, {
        // Formats common on retail products
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      readerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 260, height: 140 }, // rectangular box — better for retail barcodes
        aspectRatio: 1.6,
      };

      scanner
        .start(
          { facingMode: 'environment' }, // back camera on phones, default on laptops
          config,
          (decodedText) => {
            // Successful scan — stop & return
            scanner.stop().then(() => onDetected(decodedText)).catch(() => onDetected(decodedText));
          },
          () => { /* per-frame misses — ignore */ }
        )
        .then(() => setStatus('Point camera at the barcode'))
        .catch((err) => {
          setError(err?.message || 'Could not access camera. Please grant permission and try again.');
        });
    }).catch((err) => {
      setError('Scanner library failed to load: ' + (err?.message || 'unknown'));
    });

    return () => {
      cancelled = true;
      const s = readerRef.current;
      if (s) {
        s.stop().catch(() => {}).finally(() => {
          try { s.clear(); } catch {}
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-lg">Scan Barcode</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
            aria-label="Close"
          >×</button>
        </div>

        <div className="relative bg-black">
          <div id={divId} style={{ width: '100%' }} />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-red-50">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-4 text-center">
          <p className="text-sm text-gray-600">{status}</p>
          <p className="text-xs text-gray-400 mt-1">
            Align the barcode inside the frame. Hold steady — it auto-detects.
          </p>
        </div>
      </div>
    </div>
  );
}
