import { useRef, useState, type ChangeEvent } from "react";
import { acceptFor, validateFileFor, type PrivateBucket } from "../services/storage";

export type PickResult = { ok: true } | { ok: false; message: string };

/**
 * The camera + file pair every document upload uses: two hidden inputs, the
 * bucket's accept list, a check the moment a file is picked, and busy/error.
 *
 * THE INPUT IS CLEARED AFTER EVERY PICK. A file input only fires `change` when
 * its value changes, so without this, picking the same file again after an
 * error (the natural retry) did nothing at all.
 *
 * VALIDATED AT PICK TIME, before anything is sent: a file of the wrong type or
 * size is refused in the same moment it is chosen. The upload checks again —
 * this one is the convenience, that one is the rule.
 */
export function useFilePick(bucket: PrivateBucket, onFile: (file: File) => Promise<PickResult>) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    const check = validateFileFor(bucket, file);
    if (!check.ok) {
      setError(check.message ?? "That file can't be used.");
      return;
    }
    setError(null);
    setBusy(true);
    const result = await onFile(file);
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  return {
    busy,
    error,
    setError,
    openCamera: () => cameraRef.current?.click(),
    openFiles: () => fileRef.current?.click(),
    cameraInputProps: {
      ref: cameraRef,
      type: "file" as const,
      accept: acceptFor(bucket, true),
      capture: "environment" as const,
      className: "hidden",
      tabIndex: -1,
      "aria-hidden": true,
      onChange: (e: ChangeEvent<HTMLInputElement>) => void onChange(e),
    },
    fileInputProps: {
      ref: fileRef,
      type: "file" as const,
      accept: acceptFor(bucket),
      className: "hidden",
      tabIndex: -1,
      "aria-hidden": true,
      onChange: (e: ChangeEvent<HTMLInputElement>) => void onChange(e),
    },
  };
}
