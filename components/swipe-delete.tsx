"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Icon } from "./ui";

const REVEAL = 88;  // width of the Delete button
const OPEN_AT = 44; // drag past this and it snaps open instead of back
const SLOP = 8;     // px before a gesture is judged horizontal or vertical

/**
 * A row that slides left to uncover Delete. Ported from IronLog's SwipeDelete,
 * and it keeps the three things that gesture cannot live without:
 *
 * - `onDragStart` is prevented. The row is a <Link>, which is natively
 *   draggable; the browser starts a link drag two pixels in, fires
 *   pointercancel, and the swipe dies.
 * - move/up listen on `window` for the length of one gesture — element
 *   handlers stop arriving once the row slides out from under the finger.
 * - `touch-action: pan-y`, never `none`, so the day still scrolls under a
 *   finger that starts on a row. The axis is decided in the first 8px.
 */
export function SwipeDelete(
  { label, open, onOpen, onDelete, children }:
  { label: string; open: boolean; onOpen: (open: boolean) => void; onDelete: () => void; children: ReactNode },
) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);

  const offset = open ? -REVEAL : 0;
  const x = dragging ? dx : offset;

  function down(e: ReactPointerEvent) {
    moved.current = false;
    if (e.button > 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let axis: "?" | "x" = "?";

    function move(ev: PointerEvent) {
      const dxRaw = ev.clientX - startX;
      const dyRaw = ev.clientY - startY;
      if (axis === "?") {
        if (Math.abs(dxRaw) < SLOP && Math.abs(dyRaw) < SLOP) return;
        // Vertical wins: it is a scroll, and this gesture is over for us.
        if (Math.abs(dyRaw) > Math.abs(dxRaw)) return end();
        axis = "x";
        setDragging(true);
      }
      moved.current = true;
      const next = offset + dxRaw;
      setDx(next > 0 ? next * 0.2 : Math.max(next, -REVEAL - 24));
    }

    // Without preventing touchmove, Chromium hands the horizontal gesture to
    // the scroller and fires pointercancel.
    function block(ev: TouchEvent) {
      if (axis === "x" && ev.cancelable) ev.preventDefault();
    }

    function up(ev: PointerEvent) {
      if (axis === "x") onOpen(ev.clientX - startX + offset < -OPEN_AT);
      end();
    }

    function end() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", end);
      setDragging(false);
      setDx(0);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", end);
  }

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        tabIndex={open ? 0 : -1}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 bg-bad text-xs font-semibold text-white active:brightness-90"
        style={{ width: REVEAL }}
      >
        <Icon name="trash" className="h-5 w-5" />
        Delete
      </button>
      <div
        onPointerDown={down}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          // A swipe ends in a click on whatever was under the finger. Eat it,
          // and when the row is open a plain tap closes it instead.
          if (!moved.current && !open) return;
          e.preventDefault();
          e.stopPropagation();
          if (open && !moved.current) onOpen(false);
        }}
        style={{
          transform: `translate3d(${x}px,0,0)`,
          transition: dragging ? "none" : "transform 220ms ease",
          touchAction: "pan-y",
        }}
        className="relative bg-surface"
      >
        {children}
      </div>
    </div>
  );
}
