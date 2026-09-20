"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adoptOffProduct, resolveBarcode } from "@/app/actions";
import type { OffProduct } from "@/lib/off";
import { Button, Card, inputClass } from "./ui";

/**
 * The camera.
 *
 * Two decoders, because one of them is not everywhere: Chrome on Android has a
 * native `BarcodeDetector`, and Safari does not. When it is missing the page
 * lazy-loads @zxing/browser, which owns its own camera loop — so the support
 * matrix stops mattering and the WASM only downloads on the phones that need
 * it.
 *
 * `getUserMedia` needs a secure context. This screen cannot work from a
 * file:// page — it is localhost or HTTPS, or nothing.
 */

type Phase =
  | { k: "idle" }
  | { k: "scanning" }
  | { k: "looking"; barcode: string }
  | { k: "unknown"; barcode: string }
  | { k: "error"; message: string };

type Detector = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

export function Scanner({ day, meal }: { day: string; meal: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });
  const [typed, setTyped] = useState("");

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  const handleCode = useCallback(async (barcode: string) => {
    stop();
    setPhase({ k: "looking", barcode });
    const result = await resolveBarcode(barcode);
    if (result.status === "known") {
      router.push(`/add/${result.food.id}?d=${day}&meal=${encodeURIComponent(meal)}`);
      return;
    }
    if (result.status === "found") {
      // Straight through to the portion step, taking the product in on the way.
      const fd = new FormData();
      const p: OffProduct = result.product;
      fd.set("day", day); fd.set("meal", meal);
      fd.set("barcode", p.barcode); fd.set("name", p.name);
      fd.set("brand", p.brand ?? "");
      fd.set("kcal", String(p.kcal)); fd.set("protein", String(p.protein));
      fd.set("carb", String(p.carb)); fd.set("fat", String(p.fat));
      fd.set("fiber", p.fiber === null ? "" : String(p.fiber));
      fd.set("servingGrams", p.servingGrams === null ? "" : String(p.servingGrams));
      await adoptOffProduct(fd);
      return;
    }
    // Open Food Facts has patchy coverage of US shelves. A miss is ordinary —
    // he types the numbers once and owns that barcode from then on.
    setPhase({ k: "unknown", barcode });
  }, [day, meal, router, stop]);

  const start = useCallback(async () => {
    setPhase({ k: "scanning" });
    try {
      const video = videoRef.current;
      if (!video) return;

      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector })
        .BarcodeDetector;

      if (BD) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        video.srcObject = stream;
        await video.play();

        const detector = new BD({ formats: FORMATS });
        let live = true;
        stopRef.current = () => {
          live = false;
          stream.getTracks().forEach((t) => t.stop());
          video.srcObject = null;
        };
        // Every animation frame would be ~60 detections a second and would
        // cook the phone. A barcode does not move that fast.
        const tick = async () => {
          if (!live) return;
          try {
            const [hit] = await detector.detect(video);
            if (hit?.rawValue) { void handleCode(hit.rawValue); return; }
          } catch { /* a dropped frame is not a failure; try the next one */ }
          if (live) setTimeout(tick, 150);
        };
        setTimeout(tick, 150);
        return;
      }

      // Safari, and anything else without the native detector.
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      // decodeFromVideoDevice(undefined, …) takes whatever camera the library
      // picks first, which on a phone is usually the selfie one. Ask for the
      // back camera by constraint instead; the controls object is the same.
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } }, video,
        (result) => { if (result) void handleCode(result.getText()); },
      );
      stopRef.current = () => controls.stop();
    } catch (err) {
      const name = (err as { name?: string })?.name;
      setPhase({
        k: "error",
        message: name === "NotAllowedError"
          ? "Camera access was refused. Allow it for this site in Settings, then try again."
          : !window.isSecureContext
            ? "The camera only works over https — open the deployed site, not a local file."
            : "Could not start the camera. Type the number instead.",
      });
    }
  }, [handleCode]);

  useEffect(() => stop, [stop]);

  if (phase.k === "unknown") {
    return <UnknownBarcode barcode={phase.barcode} day={day} meal={meal} />;
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />
        {/* A window to aim through. Barcodes are wide and short. */}
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-28 -translate-y-1/2 rounded-xl border-2 border-accent/70" />
        {phase.k === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 px-6 text-center text-sm text-ink-dim">
            Point the camera at the barcode on the package.
          </div>
        )}
        {phase.k === "looking" && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/85 text-sm">
            Looking up {phase.barcode}…
          </div>
        )}
      </div>

      {phase.k === "idle" && (
        <Button onClick={start} variant="primary" className="h-14 w-full text-base">
          Start camera
        </Button>
      )}
      {phase.k === "error" && (
        <Card className="p-4">
          <p className="text-sm text-bad">{phase.message}</p>
          <Button onClick={start} className="mt-3 w-full">Try again</Button>
        </Card>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); if (typed.trim()) void handleCode(typed.trim()); }}
        className="flex items-end gap-2"
      >
        <label className="flex-1 text-xs text-ink-dim">
          Or type the number under the barcode
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            inputMode="numeric"
            placeholder="0038000138416"
            className={`${inputClass} tnum mt-1`}
          />
        </label>
        <Button type="submit" disabled={!typed.trim()}>Look up</Button>
      </form>
    </div>
  );
}

/**
 * Not in Open Food Facts. This form is the whole point of the screen being
 * honest about coverage: it is as fast as the happy path, and it keeps the
 * barcode, so the same product is one tap next week.
 */
function UnknownBarcode(
  { barcode, day, meal }: { barcode: string; day: string; meal: string },
) {
  return (
    <form action={adoptOffProduct} className="space-y-4">
      <Card className="p-4">
        <p className="text-sm">
          <span className="font-semibold">Not in the database.</span>{" "}
          <span className="text-ink-dim">
            Copy the numbers off the label — per 100 g, not per serving — and this
            barcode is yours from now on.
          </span>
        </p>
        <p className="tnum mt-2 text-xs text-ink-dim">Barcode {barcode}</p>
      </Card>

      <input type="hidden" name="barcode" value={barcode} />
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />

      <input name="name" required placeholder="Food name" autoFocus className={inputClass} />
      <input name="brand" placeholder="Brand (optional)" className={inputClass} />

      <div className="grid grid-cols-2 gap-3">
        <Field name="kcal" label="Calories / 100 g" required />
        <Field name="protein" label="Protein g / 100 g" required />
        <Field name="carb" label="Carbs g / 100 g" required />
        <Field name="fat" label="Fat g / 100 g" required />
        <Field name="fiber" label="Fiber g / 100 g" hint="blank if not listed" />
        <Field name="servingGrams" label="1 serving = g" hint="optional" />
      </div>

      <Button type="submit" variant="primary" className="h-14 w-full text-base">
        Save and add
      </Button>
    </form>
  );
}

function Field(
  { name, label, required, hint }:
  { name: string; label: string; required?: boolean; hint?: string },
) {
  return (
    <label className="text-xs text-ink-dim">
      {label}
      <input
        name={name}
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        required={required}
        className={`${inputClass} tnum mt-1`}
      />
      {hint && <span className="mt-1 block text-[0.625rem]">{hint}</span>}
    </label>
  );
}
