"use client";

import { useEffect, useRef, useState } from "react";

/** Reproduce sin audio y sin botón de volumen. En el celular el control nativo lo volvía a activar. */
export default function VideoMudo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const callar = () => {
      video.muted = true;
      video.defaultMuted = true;
      try {
        video.volume = 0;
      } catch {
        /* En iPhone el volumen no se puede setear. */
      }
    };
    callar();
    video.addEventListener("loadedmetadata", callar);
    video.addEventListener("play", callar);
    video.addEventListener("playing", callar);
    video.addEventListener("volumechange", callar);
    const id = window.setInterval(callar, 200);
    return () => {
      window.clearInterval(id);
      video.removeEventListener("loadedmetadata", callar);
      video.removeEventListener("play", callar);
      video.removeEventListener("playing", callar);
      video.removeEventListener("volumechange", callar);
    };
  }, [src]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    try {
      video.volume = 0;
    } catch {
      /* iPhone */
    }
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="relative">
      <video
        ref={(el) => {
          ref.current = el;
          if (el) el.muted = true;
        }}
        src={src}
        muted
        playsInline
        preload="metadata"
        controls={false}
        className={className}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute inset-0 flex items-center justify-center"
        aria-label={playing ? "Pausar video" : "Reproducir video"}
      >
        {playing ? null : (
          <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white">
            Ver
          </span>
        )}
      </button>
    </div>
  );
}
