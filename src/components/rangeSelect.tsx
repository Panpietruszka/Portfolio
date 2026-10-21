import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { gsap } from "../lib/gsap";
import { Icon } from "./icons";
import type { PresetKey } from "../lib/activity";

type Option = { key: PresetKey; label: string };

type Props = {
  options: Option[];
  value: PresetKey;
  rangeText: string;
  canPrev: boolean;
  canNext: boolean;
  prevLabel: string;
  nextLabel: string;
  onSelect: (key: PresetKey) => void;
  onStep: (direction: -1 | 1) => void;
};

export function RangeSelect({
  options,
  value,
  rangeText,
  canPrev,
  canNext,
  prevLabel,
  nextLabel,
  onSelect,
  onStep,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = options.find((o) => o.key === value) ?? options[0];

  const openList = () => {
    setHighlight(
      Math.max(
        0,
        options.findIndex((o) => o.key === value),
      ),
    );
    setOpen(true);
  };

  const choose = (key: PresetKey) => {
    onSelect(key);
    setOpen(false);
  };

  // otwieranie i zamykanie listy
  useEffect(() => {
    gsap.to(
      list.current,
      open
        ? {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.22,
            ease: "power3.out",
            overwrite: true,
          }
        : {
            autoAlpha: 0,
            y: -6,
            scale: 0.98,
            duration: 0.15,
            ease: "power2.in",
            overwrite: true,
          },
    );
  }, [open]);

  // kliknięcie poza listą zamyka ją
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const count = options.length;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setHighlight((h) => (h + delta + count) % count);
        return;
      }
      case "Home":
        if (open) {
          event.preventDefault();
          setHighlight(0);
        }
        return;
      case "End":
        if (open) {
          event.preventDefault();
          setHighlight(count - 1);
        }
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) choose(options[highlight].key);
        else openList();
        return;
      case "Escape":
        setOpen(false);
        return;
    }
  };

  const arrow =
    "grid place-items-center px-3 text-white/50 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div ref={root} className="relative">
        <div
          className={`flex items-stretch overflow-hidden rounded-lg border bg-white/[0.03] transition-colors duration-200 ${
            open ? "border-sky-400/60" : "border-white/12"
          }`}
        >
          <button
            type="button"
            aria-label={prevLabel}
            disabled={!canPrev}
            onClick={() => onStep(-1)}
            className={arrow}
          >
            <Icon name="left" />
          </button>

          <button
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={onKeyDown}
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium outline-none"
          >
            <Icon name="calendar" className="size-4 text-white/50" />
            <span className="min-w-28 text-left">{current.label}</span>
            <Icon
              name="down"
              className={`size-4 text-white/50 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          <button
            type="button"
            aria-label={nextLabel}
            disabled={!canNext}
            onClick={() => onStep(1)}
            className={arrow}
          >
            <Icon name="right" />
          </button>
        </div>

        <ul
          ref={list}
          id={listId}
          role="listbox"
          className="invisible absolute left-0 top-[calc(100%+8px)] z-30 w-56 origin-top-left rounded-xl border border-white/12 bg-[rgba(8,10,14,0.94)] p-1.5 opacity-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          {options.map((option, index) => {
            const selected = option.key === value;
            return (
              <li
                key={option.key}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                data-cursor
                onPointerEnter={() => setHighlight(index)}
                onClick={() => choose(option.key)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  selected ? "text-sky-400" : "text-white/75"
                } ${highlight === index ? "bg-white/8" : ""}`}
              >
                {option.label}
                {selected && <Icon name="check" className="size-4" />}
              </li>
            );
          })}
        </ul>
      </div>

      <span className="font-mono text-xs text-white/45">{rangeText}</span>
    </div>
  );
}
