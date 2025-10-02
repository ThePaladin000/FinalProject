"use client";

import React from "react";

type ToggleSize = "sm" | "md" | "lg";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: ToggleSize;
  name?: string;
  id?: string;
  renderAs?: "button" | "div";
  color?: "teal" | "emerald" | "purple";
}

const sizeClasses: Record<ToggleSize, { container: string; thumb: string; translate: string }> = {
  sm: {
    container: "h-5 w-9",
    thumb: "h-4 w-4",
    translate: "translate-x-4",
  },
  md: {
    container: "h-6 w-11",
    thumb: "h-5 w-5",
    translate: "translate-x-5",
  },
  lg: {
    container: "h-7 w-14",
    thumb: "h-6 w-6",
    translate: "translate-x-7",
  },
};

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  className = "",
  size = "md",
  name,
  id,
  renderAs = "button",
  color = "teal",
}: ToggleProps) {
  const sizes = sizeClasses[size];

  const colorClasses = {
    teal: {
      onBg: "bg-teal-500",
      focus: "focus-visible:outline-teal-400",
      ringOn: "ring-teal-500/50",
    },
    emerald: {
      onBg: "bg-emerald-500",
      focus: "focus-visible:outline-emerald-400",
      ringOn: "ring-emerald-500/50",
    },
    purple: {
      onBg: "bg-purple-600",
      focus: "focus-visible:outline-purple-400",
      ringOn: "ring-purple-500/50",
    },
  }[color];

  const commonProps = {
    role: "switch" as const,
    "aria-checked": checked,
    "aria-disabled": disabled,
    className: [
      "relative inline-flex shrink-0 rounded-full transition-colors duration-200 p-0.5",
      renderAs === "button"
        ? `cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${colorClasses.focus}`
        : "cursor-default",
      checked ? `${colorClasses.onBg} ring-1 ${colorClasses.ringOn}` : "bg-gray-300 ring-1 ring-inset ring-gray-400",
      disabled ? "opacity-50" : "",
      sizes.container,
      className || "",
    ].join(" "),
    id,
    "data-testid": id,
  };

  const thumb = (
    <span
      aria-hidden="true"
      className={[
        "pointer-events-none inline-block transform rounded-full bg-white shadow transition duration-200",
        checked ? sizes.translate : "translate-x-0.5",
        sizes.thumb,
      ].join(" ")}
    />
  );

  if (renderAs === "div") {
    return (
      <div {...commonProps}>
        <span className="sr-only">{name || "Toggle"}</span>
        {thumb}
      </div>
    );
  }

  return (
    <button
      type="button"
      {...commonProps}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="sr-only">{name || "Toggle"}</span>
      {thumb}
    </button>
  );
}


