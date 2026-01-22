import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  className?: string;
  delay?: number;
}

export function NumberTicker({ value, className, delay = 0 }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);

  const motionValue = useMotionValue(0);

  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 200,
  });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        motionValue.set(value);
      }, delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [motionValue, isInView, value, delay]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("en-US").format(Math.round(latest));
      }
    });
  }, [springValue]);

  return (
    <span
      className={cn("inline-block tabular-nums tracking-tight", className)}
      ref={ref}
    />
  );
}
