import { Icon } from "@iconify-icon/react";
import { useState } from "react";

import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { cn } from "@hypr/utils";

export function HeroInterface() {
  const [activeTab, setActiveTab] = useState<
    "notes" | "summary" | "transcript"
  >("notes");

  return (
    <div className="w-full pb-10 overflow-hidden h-min-[600px] text-left">
      <div
        className={cn([
          "bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden",
          "mx-auto max-w-[1100px] h-[600px]",
        ])}
      >
        <div className="flex h-full">
          <div
            className={cn([
              "w-56 shrink-0 flex-col overflow-hidden",
              "hidden md:flex",
            ])}
          >
            <div className="flex flex-col flex-1 overflow-y-auto bg-neutral-50 m-1 rounded-xl">
              <div className="flex items-center justify-between pl-3 pr-1 py-1.5">
                <div className="flex gap-2">
                  <div className="size-3 rounded-full bg-red-400" />
                  <div className="size-3 rounded-full bg-yellow-400" />
                  <div className="size-3 rounded-full bg-green-400" />
                </div>
              </div>
              <div className="pl-3 pr-1 py-1.5">
                <div className="text-base font-bold text-neutral-900">
                  Today
                </div>
              </div>

              <button className="w-full text-left px-3 py-2 rounded-lg bg-neutral-200">
                <div className="text-sm font-normal truncate">
                  Weekly Product Sync
                </div>
                <div className="text-xs text-neutral-500">10:00 AM</div>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100">
                <div className="text-sm font-normal truncate">
                  Design Review
                </div>
                <div className="text-xs text-neutral-500">9:00 AM</div>
              </button>

              <div className="pl-3 pr-1 py-1.5 mt-1">
                <div className="text-base font-bold text-neutral-900">
                  Yesterday
                </div>
              </div>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100">
                <div className="text-sm font-normal truncate">
                  1:1 with Sarah
                </div>
                <div className="text-xs text-neutral-500">4:00 PM</div>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100">
                <div className="text-sm font-normal truncate">
                  Sprint Planning
                </div>
                <div className="text-xs text-neutral-500">2:00 PM</div>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100">
                <div className="text-sm font-normal truncate">
                  Client Kickoff Call
                </div>
                <div className="text-xs text-neutral-500">11:00 AM</div>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neutral-50 m-1 mt-0 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-neutral-300" />
                <span className="text-xs text-neutral-600 truncate">
                  alex@company.com
                </span>
              </div>
              <Icon icon="mdi:chevron-up" />
            </div>
          </div>
          {/* tabs */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center h-9 border-b border-neutral-100 px-1 gap-1">
              <div
                className={cn([
                  "flex items-center gap-1 px-3 py-1.5 text-xs rounded-md truncate max-w-48",
                  "bg-white text-neutral-900 border border-neutral-200",
                ])}
              >
                <Icon icon="mdi:record-circle" className="text-red-400" />
                <span className="truncate">Weekly Product Sync</span>
                <DancingSticks amplitude={1} height={10} color="#ef4444" />
              </div>
              <div className="pl-2 pr-8 py-1.5 flex items-center gap-2 text-xs rounded-md truncate max-w-40 text-neutral-400 hover:bg-neutral-100 min-w-26">
                <Icon icon="mdi:note-outline" className="text-neutral-400" />
                Design Review
              </div>
            </div>

            <div className="flex-1 flex flex-col items-start overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <div className="text-lg font-semibold text-neutral-900">
                  Weekly Product Sync
                </div>
              </div>

              <div className="flex w-full text-sm px-2">
                {(["notes", "summary", "transcript"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn([
                      "px-3 py-1.5 transition-colors",
                      activeTab === tab
                        ? "text-neutral-900 border-b-2 border-neutral-900"
                        : "text-neutral-400 hover:text-neutral-600",
                    ])}
                  >
                    {tab === "notes"
                      ? "Your Notes"
                      : tab === "summary"
                        ? "Summary"
                        : "Transcript"}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-4 overflow-hidden text-sm">
                {activeTab === "notes" && (
                  <div className="flex flex-col gap-1 text-neutral-700 items-start">
                    <div>ui update - mobile</div>
                    <div>api changes for new nav</div>
                    <div className="mt-3">new dash - urgnet</div>
                    <div>a/b tst next wk</div>
                    <div className="mt-3">sarah handles design tokens</div>
                    <div>
                      ben on api by friday
                      <span className="animate-pulse">|</span>
                    </div>
                  </div>
                )}
                {activeTab === "summary" && (
                  <div className="flex flex-col gap-3 items-start">
                    <div>
                      <h4 className="text-base font-semibold text-stone-700">
                        Mobile UI Update
                      </h4>
                      <ul className="flex flex-col gap-1 text-neutral-700 list-disc pl-5 mt-1">
                        <li>
                          Streamlined navigation bar with improved button
                          placements for accessibility.
                        </li>
                        <li>
                          API adjustments needed for dynamic UI and personalized
                          user data.
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-stone-700">
                        New Dashboard
                      </h4>
                      <ul className="flex flex-col gap-1 text-neutral-700 list-disc pl-5 mt-1">
                        <li>
                          Urgent priority due to stakeholder demand for
                          analytics.
                        </li>
                        <li>
                          Real-time engagement metrics and customizable
                          reporting.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                {activeTab === "transcript" && (
                  <div className="flex flex-col gap-2.5 items-start">
                    <div className="text-neutral-700">
                      <span className="font-medium text-neutral-900">
                        Sarah:
                      </span>{" "}
                      The mobile UI update is looking good. We've streamlined
                      the nav bar and improved button placements.
                    </div>
                    <div className="text-neutral-700">
                      <span className="font-medium text-neutral-900">Ben:</span>{" "}
                      I'll need to adjust the API to support dynamic changes,
                      especially for personalized data.
                    </div>
                    <div className="text-neutral-700">
                      <span className="font-medium text-neutral-900">
                        Alice:
                      </span>{" "}
                      The new dashboard is urgent. Stakeholders keep asking
                      about it.
                    </div>
                    <div className="text-neutral-700">
                      <span className="font-medium text-neutral-900">
                        Mark:
                      </span>{" "}
                      Let's align the dashboard launch with our marketing push
                      next quarter.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
