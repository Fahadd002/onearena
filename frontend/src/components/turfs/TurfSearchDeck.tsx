"use client";

import type { Ref } from "react";

import { DateMonthFilter } from "./DateMonthFilter";
import { DateStrip } from "./DateStrip";
import { SearchBar } from "./SearchBar";
import { SearchField } from "./SearchField";
import { TimeBuckets } from "./TimeBuckets";
import { useTurfExplorer } from "./TurfExplorerProvider";

export function TurfSearchDeck({
  deckRef,
  atTop = false,
}: {
  deckRef?: Ref<HTMLDivElement>;
  atTop?: boolean;
}) {
  const {
    area,
    setArea,
    bucket,
    setBucket,
    filters,
    setFilters,
    geo,
    locating,
    findNearby,
    radius,
    setRadius,
    today,
    date,
    setDate,
    range,
    dateOptionKey,
    selectDateOption,
    resetAll,
  } = useTurfExplorer();

  /* When the deck pins it stands in for the navbar. The deck box itself stays
     exactly as wide as the page column, so the controls line up with the rows;
     the background layer and bottom rule extend across the viewport. `top` is
     transitioned with the navbar's hide duration so the handoff does not jump;
     the surface, padding and rule crossfade. */
  return (
    <div ref={deckRef}
      className={`sticky z-[55] border border-transparent py-2 px-2 transition-[top,background-color,border-color,padding] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${atTop ? "top-0" : "top-16"} 
        ${atTop ? "rounded-none border-x-0 border-y-0 bg-transparent" : "rounded-xl border-white/20 bg-background/25 backdrop-blur-xl"}`
      }
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-background transition-opacity duration-[400ms] ease-out ${atTop ? "opacity-100" : "opacity-0"
          }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-border transition-opacity duration-[400ms] ease-out ${atTop ? "opacity-100" : "opacity-0"
          }`}
      />

      <div className="mx-auto w-full max-w-screen-2xl">
        <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-2">
          {/* Left: date presets + date strip */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <DateMonthFilter today={today} optionKey={dateOptionKey} onOption={selectDateOption} />
            <DateStrip range={range} value={date} onChange={setDate} today={today} className="min-w-0" />
          </div>

          {/* Right: controls, then time buckets, then the search field */}
          <div className="flex min-w-0 flex-col gap-1.5 lg:border-l lg:border-border/50 lg:pl-3">
            <SearchBar
              geo={geo}
              locating={locating}
              onNearby={findNearby}
              radius={radius}
              onRadius={setRadius}
              filters={filters}
              onFilters={setFilters}
            />
            <TimeBuckets value={bucket} onChange={setBucket} />
            <SearchField area={area} onArea={setArea} onReset={resetAll} />
          </div>
        </div>
      </div>

      {/* Rows pass behind the pinned deck: a short fade under it keeps a row from looking sliced off as it disappears. */}
      {atTop && (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-6 left-1/2 h-6 w-screen -translate-x-1/2 bg-gradient-to-b from-background to-transparent"
        />
      )}
    </div>
  );
}
