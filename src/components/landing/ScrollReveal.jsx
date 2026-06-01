"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const EASE = [0.23, 1, 0.32, 1];

function buildVariants(isCompact) {
  const slide = isCompact ? 20 : 48;
  return {
    up: {
      hidden: { opacity: 0, y: isCompact ? 32 : 56, scale: 0.98, filter: "blur(3px)" },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: isCompact ? 0.55 : 0.72, ease: EASE },
      },
    },
    left: {
      hidden: { opacity: 0, x: -slide, y: isCompact ? 16 : 28, scale: 0.98, filter: "blur(3px)" },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: isCompact ? 0.55 : 0.72, ease: EASE },
      },
    },
    right: {
      hidden: { opacity: 0, x: slide, y: isCompact ? 16 : 28, scale: 0.98, filter: "blur(3px)" },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: isCompact ? 0.55 : 0.72, ease: EASE },
      },
    },
  };
}

/**
 * Scroll fly-in — fires when section enters the viewport (once).
 * Uses Framer whileInView so the hidden → visible transition always runs.
 */
export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
}) {
  const reduceMotion = useReducedMotion();
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const variants = buildVariants(isCompact);
  const v = variants[variant] || variants.up;

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.22, margin: "0px 0px -10% 0px" }}
      variants={{
        hidden: v.hidden,
        visible: {
          ...v.visible,
          transition: { ...v.visible.transition, delay: delay / 1000 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
