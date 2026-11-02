"use client";

import { useRef, useState } from "react";

const ACCEPTED_EXT = [".mp3", ".wav", ".m4a", ".webm"];
const MAX_BYTES = 25 * 1024 * 1024;

function validate(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXT.some((ext) => name.endsWith(ext))) {
    return `Unsupported file type. Use ${ACCEPTED_EXT.join(", ")}.`;
  }
  if (file.size > MAX_BYTES) {
    return "File is larger than the 25MB limit.";
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}

type Props = {
  onSelect: (file: File) => void;
  disabled?: boolean;
};

export default function AudioUpload({ onSelect, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onSelect(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFile(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-line bg-surface-2"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <svg
          className="h-8 w-8 text-faint"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
          />
        </svg>
        <p className="text-sm text-muted">Drag and drop an audio file, or</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose file
        </button>
        <p className="text-xs text-faint">MP3, WAV, M4A or WebM, up to 25MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXT.join(",")}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
