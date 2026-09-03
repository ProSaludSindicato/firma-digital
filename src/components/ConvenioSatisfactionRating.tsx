import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { convenioFirmaSatisfactionUrl } from "@/lib/prosaludConvenioApi";

export const SATISFACTION_SCORE_LABELS = {
  1: "Muy mala",
  2: "Mala",
  3: "Regular",
  4: "Buena",
  5: "Excelente",
} as const;

export const SATISFACTION_TAGLINE =
  "Mejoramos nuestros procesos pensando en ti";

export type SatisfactionScore = keyof typeof SATISFACTION_SCORE_LABELS;

type ConvenioSatisfactionRatingProps = {
  token: string;
  canRate: boolean;
  initialScore?: number | null;
  onRated?: (score: SatisfactionScore) => void;
};

function isSatisfactionScore(value: number): value is SatisfactionScore {
  return value >= 1 && value <= 5;
}

export function ConvenioSatisfactionRating({
  token,
  canRate,
  initialScore = null,
  onRated,
}: ConvenioSatisfactionRatingProps) {
  const [hovered, setHovered] = useState<SatisfactionScore | null>(null);
  const [selected, setSelected] = useState<SatisfactionScore | null>(
    initialScore !== null && isSatisfactionScore(initialScore) ? initialScore : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<SatisfactionScore | null>(
    initialScore !== null && isSatisfactionScore(initialScore) ? initialScore : null,
  );
  const [error, setError] = useState<string | null>(null);

  if (submittedScore !== null) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-6 py-5 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30 sm:px-8 sm:py-6">
        <p className="text-base font-semibold text-foreground sm:text-lg">
          Gracias por tu calificación
        </p>
        <p className="mt-1.5 text-sm text-foreground/60 sm:text-base">
          {submittedScore} de 5 · {SATISFACTION_SCORE_LABELS[submittedScore]}
        </p>
      </div>
    );
  }

  if (!canRate) {
    return null;
  }

  const preview = hovered ?? selected;

  const handleSelect = async (score: SatisfactionScore) => {
    if (isSubmitting) {
      return;
    }

    setSelected(score);
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(convenioFirmaSatisfactionUrl(token), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        code?: string;
      };

      if (res.status === 409 && json.code === "already_rated") {
        setSubmittedScore(score);
        onRated?.(score);
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "No se pudo guardar la calificación.");
      }

      setSubmittedScore(score);
      onRated?.(score);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar la calificación. Intenta de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="satisfaction-rating-card relative">
      <div className="satisfaction-rating-card__border" aria-hidden />
      <div className="satisfaction-rating-card__inner px-6 py-6 text-center sm:px-8 sm:py-7">
        <div className="mx-auto max-w-sm space-y-2">
          <p className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
            ¿Cómo te pareció este proceso de firma digital?
          </p>
          <p className="text-sm leading-relaxed text-foreground/55 sm:text-base">
            Solo una puntuación de 1 a 5. Nos ayuda a seguir mejorando el trámite para los
            afiliados.
          </p>
        </div>

        <div
          className="mt-5 flex items-center justify-center gap-1.5 sm:gap-2"
          role="radiogroup"
          aria-label="Calificación del proceso de firma, de 1 a 5"
          onMouseLeave={() => setHovered(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setHovered(null);
            }
          }}
        >
          {([1, 2, 3, 4, 5] as const).map((score) => {
            const filled = preview !== null && score <= preview;
            return (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={selected === score}
                aria-label={`${score} de 5: ${SATISFACTION_SCORE_LABELS[score]}`}
                disabled={isSubmitting}
                onMouseEnter={() => setHovered(score)}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible")) {
                    setHovered(score);
                  }
                }}
                onClick={() => void handleSelect(score)}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-colors sm:h-[3.25rem] sm:w-[3.25rem]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-60",
                  filled ? "text-amber-500" : "text-muted-foreground/35 hover:text-amber-400",
                )}
              >
                <Star
                  className={cn("h-9 w-9 sm:h-10 sm:w-10", filled && "fill-current")}
                  aria-hidden
                />
              </button>
            );
          })}
          {isSubmitting ? (
            <Loader2 className="ml-1 h-5 w-5 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <p className="mt-3 min-h-6 text-sm text-foreground/55 sm:text-base">
          {preview ? `${preview} · ${SATISFACTION_SCORE_LABELS[preview]}` : "1 Muy mala · 5 Excelente"}
        </p>

        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

        <p className="mt-4 text-sm leading-relaxed text-foreground/45 sm:text-[0.9375rem]">
          {SATISFACTION_TAGLINE}
        </p>
      </div>
    </div>
  );
}
