import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/choose")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Build your pizza — Char" },
      {
        name: "description",
        content: "Most AI tools don't give you a choice. Char does.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const CRUST_OPTIONS = [
  { id: "thin", label: "Thin crust" },
  { id: "thick", label: "Thick & doughy" },
  { id: "sourdough", label: "Sourdough" },
];

const SAUCE_OPTIONS = [
  { id: "tomato", label: "Tomato" },
  { id: "white", label: "White garlic" },
  { id: "pesto", label: "Pesto" },
];

const TOPPING_OPTIONS = [
  { id: "mushroom", label: "Mushrooms" },
  { id: "pepperoni", label: "Pepperoni" },
  { id: "peppers", label: "Bell peppers" },
  { id: "olives", label: "Black olives" },
  { id: "cheese", label: "Extra cheese" },
  { id: "basil", label: "Basil" },
];

// 15 ring positions released in 3 waves: 4 → 9 → 15
const RING_POSITIONS = [
  // wave 1 — outer corners
  { x: 100, y: 54 },
  { x: 136, y: 80 },
  { x: 136, y: 120 },
  { x: 100, y: 146 },
  // wave 2 — fill in
  { x: 64, y: 120 },
  { x: 64, y: 80 },
  { x: 118, y: 100 },
  { x: 82, y: 100 },
  { x: 100, y: 78 },
  // wave 3 — pack it in
  { x: 100, y: 122 },
  { x: 118, y: 64 },
  { x: 82, y: 64 },
  { x: 118, y: 136 },
  { x: 82, y: 136 },
  { x: 100, y: 100 },
];

const RINGS_BY_CLICK = [0, 4, 9, 15];

const CRUST_EDGE: Record<string, string> = {
  thin: "#B8834A",
  thick: "#8B5A2B",
  sourdough: "#5C3A1E",
};
const CRUST_BODY: Record<string, string> = {
  thin: "#D4A567",
  thick: "#B8834A",
  sourdough: "#8B5E3C",
};
const SAUCE_COLORS: Record<string, string> = {
  tomato: "#C0392B",
  white: "#E8DCC8",
  pesto: "#4A7A3F",
};

const CRUST_SPOTS = [
  { x: 100, y: 8 },
  { x: 128, y: 16 },
  { x: 152, y: 34 },
  { x: 167, y: 62 },
  { x: 170, y: 94 },
  { x: 160, y: 126 },
  { x: 140, y: 150 },
  { x: 112, y: 165 },
  { x: 82, y: 166 },
  { x: 54, y: 153 },
  { x: 34, y: 132 },
  { x: 24, y: 102 },
  { x: 28, y: 70 },
  { x: 44, y: 42 },
  { x: 70, y: 18 },
];

const RADIAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

type Step = "crust" | "sauce" | "toppings" | "reveal";

function Component() {
  const [step, setStep] = useState<Step>("crust");
  const [crust, setCrust] = useState<string | null>(null);
  const [sauce, setSauce] = useState<string | null>(null);
  const [toppingClicks, setToppingClicks] = useState(0);

  const visibleRings = RINGS_BY_CLICK[Math.min(toppingClicks, 3)];
  const overwhelmed = toppingClicks >= 3;

  const handleReset = () => {
    setStep("crust");
    setCrust(null);
    setSauce(null);
    setToppingClicks(0);
  };

  const handleBack = () => {
    if (step === "sauce") setStep("crust");
    if (step === "toppings") setStep("sauce");
  };

  const handleToppingClick = () => {
    if (overwhelmed) return;
    setToppingClicks((prev) => {
      const next = Math.min(prev + 1, 3);
      if (next >= 3) {
        setTimeout(() => setStep("reveal"), 2500);
      }
      return next;
    });
  };

  if (step === "reveal") {
    return (
      <main
        className="flex-1 min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white"
        style={{ backgroundImage: "url(/patterns/dots.svg)" }}
      >
        <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <RevealSection />
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex-1 min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white min-h-screen">
        <div className="flex flex-col md:flex-row md:h-[calc(100vh-65px)]">
          <div className="flex items-center justify-center p-10 md:p-16 border-b md:border-b-0 md:border-r border-neutral-100 md:flex-1">
            <PizzaGraphic
              crust={crust}
              sauce={sauce}
              visibleRings={visibleRings}
              overwhelmed={overwhelmed}
            />
          </div>

          <div className="flex flex-col justify-center p-8 md:p-12 md:flex-1 gap-6">
            <AnimatePresence mode="wait">
              {step === "crust" && (
                <motion.div
                  key="crust"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">
                      Step 1 of 3
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-serif text-stone-600">
                      Pick your crust
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {CRUST_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setCrust(opt.id)}
                        className={cn([
                          "px-5 py-4 rounded-lg border text-left text-base font-medium transition-colors",
                          crust === opt.id
                            ? "border-stone-400 bg-stone-50 text-stone-700"
                            : "border-neutral-200 text-neutral-600 hover:border-stone-300 hover:bg-stone-50/50",
                        ])}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {crust && (
                    <motion.button
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setStep("sauce")}
                      className={cn([
                        "self-start px-6 py-2.5 rounded-full text-sm font-medium",
                        "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                        "shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all",
                      ])}
                    >
                      Continue →
                    </motion.button>
                  )}
                </motion.div>
              )}

              {step === "sauce" && (
                <motion.div
                  key="sauce"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">
                      Step 2 of 3
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-serif text-stone-600">
                      Choose your sauce
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {SAUCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSauce(opt.id)}
                        className={cn([
                          "px-5 py-4 rounded-lg border text-left text-base font-medium transition-colors",
                          sauce === opt.id
                            ? "border-stone-400 bg-stone-50 text-stone-700"
                            : "border-neutral-200 text-neutral-600 hover:border-stone-300 hover:bg-stone-50/50",
                        ])}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {sauce && (
                    <motion.button
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setStep("toppings")}
                      className={cn([
                        "self-start px-6 py-2.5 rounded-full text-sm font-medium",
                        "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                        "shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all",
                      ])}
                    >
                      Continue →
                    </motion.button>
                  )}
                </motion.div>
              )}

              {step === "toppings" && (
                <motion.div
                  key="toppings"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-2">
                      Step 3 of 3
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-serif text-stone-600">
                      Pick your toppings
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {TOPPING_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={handleToppingClick}
                        disabled={overwhelmed}
                        className={cn([
                          "px-4 py-3 rounded-lg border text-left text-sm font-medium transition-colors",
                          overwhelmed
                            ? "border-neutral-100 text-neutral-300 cursor-not-allowed"
                            : "border-neutral-200 text-neutral-600 hover:border-stone-300 hover:bg-stone-50/50",
                        ])}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {toppingClicks > 0 && (
                      <motion.p
                        key={toppingClicks}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-neutral-500 italic"
                      >
                        {toppingClicks === 1 && "Added: pineapple."}
                        {toppingClicks === 2 && "More pineapple."}
                        {toppingClicks >= 3 &&
                          "We get it, you love pineapple. Chill!"}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {step !== "crust" && !overwhelmed && (
              <button
                onClick={handleBack}
                className="self-start text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                ← back
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function PizzaGraphic({
  crust,
  sauce,
  visibleRings,
  overwhelmed,
}: {
  crust: string | null;
  sauce: string | null;
  visibleRings: number;
  overwhelmed: boolean;
}) {
  const edgeColor = crust ? CRUST_EDGE[crust] : "#C49A5A";
  const bodyColor = crust ? CRUST_BODY[crust] : "#E0B870";
  const sauceColor = sauce ? SAUCE_COLORS[sauce] : null;

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72"
    >
      {/* Outer crust edge */}
      <motion.circle
        cx="100"
        cy="100"
        r="94"
        fill={edgeColor}
        animate={{ fill: edgeColor }}
        transition={{ duration: 0.35 }}
      />
      {/* Crust body */}
      <motion.circle
        cx="100"
        cy="100"
        r="86"
        fill={bodyColor}
        animate={{ fill: bodyColor }}
        transition={{ duration: 0.35 }}
      />
      {/* Baked spots on crust */}
      {crust &&
        CRUST_SPOTS.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="2"
            fill={edgeColor}
            opacity="0.5"
          />
        ))}
      {/* Dough base — warm cream, visible as soon as crust chosen */}
      {crust && <circle cx="100" cy="100" r="74" fill="#F2E0A0" />}
      {/* Sauce — separate layer, only when sauce actually selected */}
      {sauceColor && (
        <motion.circle
          cx="100"
          cy="100"
          r="74"
          fill={sauceColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        />
      )}
      {/* Full pineapple cover when overwhelmed */}
      {overwhelmed && (
        <motion.circle
          cx="100"
          cy="100"
          r="74"
          fill="#FCD34D"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: 0.5 }}
        />
      )}
      {/* Pineapple rings */}
      {RING_POSITIONS.slice(0, visibleRings).map((pos, i) => (
        <PineappleRing
          key={i}
          x={pos.x}
          y={pos.y}
          holeColor={sauceColor ?? "#F2E0A0"}
        />
      ))}
      {!crust && (
        <text
          x="100"
          y="108"
          textAnchor="middle"
          fill="#C4A870"
          fontSize="11"
          fontFamily="serif"
          opacity="0.6"
        >
          your pizza
        </text>
      )}
    </svg>
  );
}

function PineappleRing({
  x,
  y,
  holeColor,
}: {
  x: number;
  y: number;
  holeColor: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Ring body */}
        <circle
          cx="0"
          cy="0"
          r="11"
          fill="#FCD34D"
          stroke="#D97706"
          strokeWidth="0.9"
        />
        {/* Center hole showing the sauce/dough through it */}
        <circle cx="0" cy="0" r="4" fill={holeColor} />
        {/* Radial fiber lines — what makes it look like pineapple */}
        {RADIAL_ANGLES.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={Math.cos(rad) * 4.8}
              y1={Math.sin(rad) * 4.8}
              x2={Math.cos(rad) * 10.5}
              y2={Math.sin(rad) * 10.5}
              stroke="#D97706"
              strokeWidth="0.7"
              opacity="0.45"
            />
          );
        })}
      </motion.g>
    </g>
  );
}

function RevealSection() {
  return (
    <>
      <section className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
        <div className="flex flex-col items-center text-center gap-5 py-24 px-4">
          <h2 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 max-w-2xl">
            Most AI tools treat your data the same way.
          </h2>
          <p className="text-lg text-neutral-500 max-w-lg">
            Which AI processes your notes, where they're stored, whether they
            touch the cloud at all. You didn't pick any of it.
          </p>
          <p className="text-lg font-medium text-stone-600">
            Char gives you the choice back.
          </p>
          <div className="pt-4">
            <Link
              to="/download/"
              className={cn([
                "px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
                "transition-all",
              ])}
            >
              Download Char, free
            </Link>
          </div>
        </div>
      </section>
      <SlashSeparator />
      <section>
        <div className="grid md:grid-cols-3">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <h3 className="text-xl font-serif text-stone-600 mb-2">
              Choose your AI
            </h3>
            <p className="text-neutral-600">
              Char Cloud, bring your own key, or run fully local. Switch per
              meeting, or re-process old transcripts with a better model
              anytime.
            </p>
          </div>
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <h3 className="text-xl font-serif text-stone-600 mb-2">
              Your notes are files
            </h3>
            <p className="text-neutral-600">
              Plain markdown on your machine. Open the folder and they're there.
              No syncing, no importing.
            </p>
          </div>
          <div className="p-8">
            <h3 className="text-xl font-serif text-stone-600 mb-2">
              No bots. No lock-in.
            </h3>
            <p className="text-neutral-600">
              Records via system audio, no bot sitting in your meeting. Leave
              whenever you want. Your data comes with you.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
