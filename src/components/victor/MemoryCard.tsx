"use client";

import React from "react";
import { Memory } from "./types";
import { QuoteIcon } from "./constants";

interface MemoryCardProps {
  memory: Memory;
  onClick: (memory: Memory) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick }) => {
  const isTextOnly = !memory.image;
  const isLongText = memory.message.length > 200;

  return (
    <div
      onClick={() => onClick(memory)}
      className={`group relative flex flex-col rounded-2xl transition-all duration-500 overflow-hidden border border-slate-200 bg-white cursor-pointer hover:border-blue-500/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06),0_0_20px_rgba(59,130,246,0.05)]`}
    >
      {/* Background Texture for Text-Only Cards */}
      {isTextOnly && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      )}

      {/* Image Section */}
      {memory.image && (
        <div className="relative aspect-16/10 overflow-hidden">
          <img
            src={memory.image}
            alt={`Memory by ${memory.author}`}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-white/90 via-transparent to-transparent opacity-0 group-hover:opacity-40 transition-opacity" />
        </div>
      )}

      {/* Content Section */}
      <div
        className={`flex flex-col p-6 md:p-8 ${isTextOnly ? "min-h-55 justify-center" : ""}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`shrink-0 w-10 h-10 rounded-full ${memory.color} flex items-center justify-center text-white font-bold text-sm ring-4 ring-white shadow-lg`}
          >
            {memory.initials}
          </div>
          <div className="flex flex-col">
            <span className="text-slate-900 font-bold text-sm tracking-tight">
              {memory.author}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
              {memory.date}
            </span>
          </div>
          <div className="ml-auto opacity-10 group-hover:opacity-30 transition-opacity text-slate-900">
            <QuoteIcon />
          </div>
        </div>

        <div className="relative">
          <p
            className={`font-serif italic leading-relaxed text-slate-600 transition-colors group-hover:text-slate-900 line-clamp-8 ${
              isTextOnly && memory.message.length < 100
                ? "text-lg md:text-xl"
                : "text-base md:text-lg"
            }`}
          >
            &ldquo;{memory.message}&rdquo;
          </p>

          {isLongText && (
            <div className="mt-6 flex items-center gap-2 text-blue-600 group-hover:text-blue-500 transition-all">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Read Full Story
              </span>
              <svg
                className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Decorative bottom bar that illuminates on hover */}
      <div className="h-1 w-0 bg-linear-to-r from-transparent via-blue-600/30 to-transparent transition-all duration-700 group-hover:w-full" />
    </div>
  );
};
