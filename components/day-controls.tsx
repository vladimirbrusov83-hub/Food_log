"use client";

import { useState } from "react";
import { addMeal, changeGrams, removeEntry } from "@/app/actions";
import { forGrams, g, kcal } from "@/lib/macros";
import type { Entry } from "@/lib/types";
import { Button, inputClass } from "./ui";

/**
 * One logged food. Tapping it opens the grams field and a Remove — an edit is
 * two taps, and nothing destructive sits under a thumb by accident.
 */
export function EntryRow({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const macros = forGrams(entry, entry.grams);

  return (
    <div className="border-b border-line last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-14 items-center gap-3 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{entry.name}</span>
          <span className="tnum block text-[0.6875rem] text-ink-dim">
            {entry.brand ? `${entry.brand} · ` : ""}{g(entry.grams)} g
          </span>
        </span>
        <span className="text-right">
          <span className="tnum block text-sm font-semibold">{kcal(macros.kcal)}</span>
          <span className="tnum block text-[0.6875rem] text-ink-dim">
            {g(macros.protein)}p · {g(macros.carb)}c · {g(macros.fat)}f
          </span>
        </span>
      </button>

      {open && (
        <div className="flex items-end gap-2 px-3 pb-3">
          <form action={changeGrams} className="flex flex-1 items-end gap-2">
            <input type="hidden" name="entryId" value={entry.id} />
            <label className="flex-1 text-xs text-ink-dim">
              Grams
              <input
                name="grams"
                type="number"
                inputMode="decimal"
                step="any"
                min="1"
                defaultValue={entry.grams}
                className={`${inputClass} mt-1 tnum`}
              />
            </label>
            <Button type="submit" variant="primary">Save</Button>
          </form>
          <form action={removeEntry}>
            <input type="hidden" name="entryId" value={entry.id} />
            <Button type="submit" variant="danger">Remove</Button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * "+ Add meal". Meals live per day: this adds one to THIS day only, which is
 * how he asked for it — no global meal list to keep tidy.
 */
export function AddMeal({ day, existing }: { day: string; existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const clash = existing.some((e) => e.toLowerCase() === name.trim().toLowerCase());

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="min-h-12 w-full rounded-2xl border border-dashed border-line text-sm font-semibold text-ink-dim"
      >
        + Add meal
      </button>
    );
  }

  return (
    <form
      action={addMeal}
      onSubmit={() => setOpen(false)}
      className="space-y-2 rounded-2xl border border-line bg-surface p-3"
    >
      <input type="hidden" name="day" value={day} />
      <input
        name="name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Pre-workout, Second dinner…"
        className={inputClass}
      />
      <div className="flex flex-wrap gap-2">
        {["Pre-workout", "Post-workout", "Snack 2", "Dessert"]
          .filter((s) => !existing.includes(s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className="min-h-9 rounded-full border border-line px-3 text-xs text-ink-dim"
            >
              {s}
            </button>
          ))}
      </div>
      {clash && <p className="text-xs text-bad">There is already a {name.trim()} today.</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={!name.trim() || clash} className="flex-1">
          Add
        </Button>
        <Button type="button" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
