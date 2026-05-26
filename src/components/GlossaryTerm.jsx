import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/* ──────────────────────────────────────────────────────────────────
   GlossaryTerm Component
   Styles a matching glossary word with a dotted underline and shows
   a rich glassmorphic absolute tooltip upon hover or click.
   ────────────────────────────────────────────────────────────────── */
export function GlossaryTerm({ term, definition }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      className="relative inline-block cursor-help border-b border-dotted border-coastal-sage hover:text-coastal-sage font-semibold select-text transition-colors duration-200"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip((prev) => !prev);
      }}
    >
      {term}
      <AnimatePresence>
        {showTooltip && (
          <motion.span
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-coastal-dark/95 border border-coastal-teal/30 p-3 rounded-xl shadow-2xl text-[12.5px] font-sans font-normal normal-case tracking-normal text-coastal-light/95 leading-relaxed select-none z-[9999] pointer-events-none block"
            style={{ transformOrigin: 'bottom center' }}
          >
            <strong className="text-coastal-sage font-bold block mb-1 text-[13px] uppercase tracking-wider">
              {term}
            </strong>
            {definition}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────
   highlightGlossaryTerms Utility
   Parses a raw text block, detects exact term occurrences (matching
   longer phrases first to avoid partial splits), and wraps them with
   the interactive GlossaryTerm tooltip component.
   ────────────────────────────────────────────────────────────────── */
export function highlightGlossaryTerms(text, glossary) {
  if (!text || typeof text !== 'string' || !glossary || !Array.isArray(glossary)) {
    return text;
  }

  // Sort terms by length descending to match longer phrases first (e.g. "foliar water uptake" before "water")
  const sortedGlossary = [...glossary].sort((a, b) => b.term.length - a.term.length);

  // Escape terms for regex boundaries safety
  const escapedTerms = sortedGlossary.map((g) =>
    g.term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  );

  if (escapedTerms.length === 0) return text;

  // Create a regex to match terms on exact word boundaries (case-insensitive)
  const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');

  const parts = text.split(regex);

  return parts.map((part, index) => {
    // split captures the match groups at odd indexes
    const isMatched = index % 2 !== 0;
    if (isMatched) {
      const matchTerm = part.toLowerCase();
      const glossaryEntry = glossary.find((g) => g.term.toLowerCase() === matchTerm);
      if (glossaryEntry) {
        return (
          <GlossaryTerm
            key={`${part}-${index}`}
            term={part}
            definition={glossaryEntry.definition}
          />
        );
      }
    }
    return part;
  });
}
