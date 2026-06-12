"use client";

import type { Interview } from "./types";

type InterviewCardProps = {
  interview: Interview;
  playingUrl: string | null;
  audioProgress: number;
  audioCurrentTime: number;
  audioDuration: number;
  onToggleAudio: (url: string) => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatTime: (time: number) => string;
  playLabel?: string;
  pauseLabel?: string;
  videoUnsupportedLabel?: string;
};

export function InterviewCard({
  interview,
  playingUrl,
  audioProgress,
  audioCurrentTime,
  audioDuration,
  onToggleAudio,
  onSeek,
  formatTime,
  playLabel = "Play Interview",
  pauseLabel = "Pause",
  videoUnsupportedLabel = "Your browser does not support video playback.",
}: InterviewCardProps) {
  const isVideo = interview.media_type === "video";
  const isPlaying =
    !isVideo && playingUrl === interview.media_url && !!interview.media_url;

  return (
    <div
      className={`bg-slate-50 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-stretch w-full overflow-hidden ${
        isVideo ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-blue-600 font-black text-[10px] md:text-[12px] uppercase tracking-[0.4em] mb-4">
        {interview.person}
      </p>
      <h4
        className={`text-2xl md:text-3xl font-bold font-serif italic ${
          interview.location_meta || interview.content ? "mb-2" : "mb-6"
        }`}
      >
        {interview.title}
      </h4>
      {interview.location_meta ? (
        <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">
          {interview.location_meta}
        </p>
      ) : null}
      {interview.content ? (
        <p className="text-slate-600 text-base md:text-lg mb-8 leading-relaxed">
          {interview.content}
        </p>
      ) : null}

      {isVideo ? (
        <div className="w-full rounded-2xl overflow-hidden shadow-lg bg-black aspect-video relative">
          <video
            controls
            className="w-full h-full object-cover"
            poster={interview.image_url ?? undefined}
          >
            <source src={interview.media_url} type="video/mp4" />
            {videoUnsupportedLabel}
          </video>
        </div>
      ) : (
        <>
          {isPlaying ? (
            <div className="w-full space-y-4 mb-8">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 font-mono tracking-widest mb-1">
                <span>{formatTime(audioCurrentTime)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>
              <div className="relative h-6 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioProgress}
                  onChange={onSeek}
                  className="w-full appearance-none bg-transparent cursor-pointer z-10"
                />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[4px] bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex">
            <button
              type="button"
              onClick={() => onToggleAudio(interview.media_url)}
              className={`text-[10px] md:text-[12px] font-black uppercase tracking-widest px-8 md:px-10 py-3 md:py-4 rounded-full transition-all shadow-lg active:scale-95 flex items-center gap-3 ${
                isPlaying
                  ? "bg-blue-600 text-white"
                  : "border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {isPlaying ? pauseLabel : playLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
