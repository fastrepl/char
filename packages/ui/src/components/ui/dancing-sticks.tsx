import { motion, useMotionValue, useTransform } from "motion/react";
import { memo, useEffect, useMemo, useRef } from "react";

const getRandomValues = (max: number, length: number, baseLength: number) => {
  const values: number[] = [];
  for (let i = 0; i < length - 1; i++) {
    values.push(Math.random() * max - max / 2 + (baseLength / 100) * max);
  }
  values.push(values[0]);
  return values;
};

type EqualizerStickProps = {
  baseLength: number;
  amplitudeMotionValue: ReturnType<typeof useMotionValue<number>>;
  color: string;
  height: number;
  stickWidth: number;
};

const EqualizerStick = memo(function EqualizerStick({
  baseLength,
  amplitudeMotionValue,
  color,
  height,
  stickWidth,
}: EqualizerStickProps) {
  const animationScales = useMemo(() => {
    const heights = getRandomValues(height, 6, baseLength);
    return heights.map((h) => Math.max(0.2, Math.min(1, h / height)));
  }, [height, baseLength]);

  const amplitudeScaleY = useTransform(amplitudeMotionValue, [0, 1], [0.2, 1]);

  return (
    <motion.div
      className="flex origin-center items-center justify-center rounded-full"
      style={{
        width: stickWidth,
        height,
        scaleY: amplitudeScaleY,
      }}
    >
      <motion.div
        className="w-full origin-center rounded-full"
        style={{
          height,
          backgroundColor: color,
        }}
        animate={{ scaleY: animationScales }}
        transition={{
          duration: 1.1,
          ease: "easeInOut",
          times: [0.2, 0.3, 0.5, 0.7, 1.1, 1.3, 1.7],
          repeat: Infinity,
        }}
      />
    </motion.div>
  );
});

type DancingSticksProps = {
  color?: string;
  amplitude: number;
  height?: number;
  width?: number;
  stickWidth?: number;
  gap?: number;
};

function generatePattern(count: number): number[] {
  const pattern: number[] = [];
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    const distance = Math.abs(i - mid) / mid;
    pattern.push(50 + 50 * (1 - distance));
  }
  return pattern;
}

export const DancingSticks = memo(function DancingSticks({
  color = "#e5e5e5",
  amplitude,
  height,
  width,
  stickWidth,
  gap,
}: DancingSticksProps) {
  const resolvedHeight = height ?? 16;
  const resolvedStickWidth = stickWidth ?? 2;
  const resolvedGap = gap ?? 1;
  const resolvedWidth = width ?? 17;
  const stickCount = Math.max(
    1,
    Math.floor(
      (resolvedWidth + resolvedGap) / (resolvedStickWidth + resolvedGap),
    ),
  );
  const isFlat = amplitude === 0;
  const pattern = useMemo(() => generatePattern(stickCount), [stickCount]);

  const amplitudeMotionValue = useMotionValue(amplitude);
  const prevAmplitudeRef = useRef(amplitude);

  useEffect(() => {
    if (prevAmplitudeRef.current !== amplitude) {
      amplitudeMotionValue.set(Math.max(amplitude, 0.1));
      prevAmplitudeRef.current = amplitude;
    }
  }, [amplitude, amplitudeMotionValue]);

  if (isFlat) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: resolvedHeight, width: resolvedWidth }}
      >
        <div
          className="rounded-full"
          style={{
            width: resolvedWidth,
            height: 1,
            backgroundColor: color,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{
        height: resolvedHeight,
        width: resolvedWidth,
        gap: resolvedGap,
      }}
    >
      {pattern.map((baseLength, index) => (
        <EqualizerStick
          key={index}
          baseLength={baseLength}
          amplitudeMotionValue={amplitudeMotionValue}
          color={color}
          height={resolvedHeight}
          stickWidth={resolvedStickWidth}
        />
      ))}
    </div>
  );
});
