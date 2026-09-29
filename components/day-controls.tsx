"use client";

import { useState } from "react";
import { addMeal } from "@/app/actions";
import { Button, Icon, inputClass } from "./ui";

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
        className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl text-[0.9375rem] font-semibold text-ink-dim"
      >
        <Icon name="plus" className="h-4 w-4" /> Add a meal
      </button>
    );
  }

  return (
    <form
      action={addMeal}
      onSubmit={() => setOpen(false)}
      className="space-y-3 rounded-3xl bg-surface p-4 shadow-card"
    >
      <input type="hidden" name="day" value={day} />
      <input
        name="name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Meal name"
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
              className={`press min-h-9 rounded-full px-3.5 text-[0.8125rem] font-medium ${
                name === s ? "bg-ink text-white" : "bg-sunken text-ink"
              }`}
            >
              {s}
            </button>
          ))}
      </div>
      {clash && <p className="text-sm text-bad">There is already a {name.trim()} on this day.</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
        <Button type="submit" variant="primary" disabled={!name.trim() || clash} className="flex-1">
          Add meal
        </Button>
      </div>
    </form>
  );
}
