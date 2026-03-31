"use client";

import React from "react";
import { Memory } from "./types";
import { QuoteIcon } from "./constants";

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  memory,
  onClose,
}) => {
  if (!memory) return null;

  const isLongMessage = memory.message.length > 350;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 md:p-8">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white border border-slate-200 rounded-2xl md:rounded-3xl w-full max-w-6xl max-h-[95vh] md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-20 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-800 transition-all hover:scale-110 active:scale-95 border border-slate-100"
          aria-label="Close modal"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Media Side */}
        {memory.image && (
          <div className="w-full md:w-[55%] bg-slate-50 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 max-h-[30vh] md:max-h-full">
            <img
              src={memory.image}
              alt={`Memory by ${memory.author}`}
              className="w-full h-full object-cover md:object-contain"
            />
          </div>
        )}

        {/* Text Content Side */}
        <div
          className={`flex flex-col flex-grow overflow-hidden ${memory.image ? "w-full md:w-[45%]" : "w-full"}`}
        >
          <div className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-14 lg:p-16">
            {/* Header Info */}
            <div className="flex items-center gap-4 mb-8 md:mb-12">
              <div
                className={`flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${memory.color} flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-xl ring-4 ring-white`}
              >
                {memory.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">
                  {memory.author}
                </span>
                <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] text-blue-600 font-black mt-1">
                  {memory.date}
                </span>
              </div>
            </div>

            {/* The Message */}
            <div className="relative">
              <div className="absolute -top-6 -left-4 opacity-5 scale-100 md:scale-150 text-slate-900">
                <QuoteIcon />
              </div>
              <div className="prose prose-slate max-w-none">
                <p
                  className={`font-serif italic text-slate-700 leading-relaxed selection:bg-blue-100 selection:text-blue-900 ${
                    isLongMessage
                      ? "text-lg md:text-2xl"
                      : "text-xl md:text-4xl"
                  }`}
                >
                  "{memory.message}"
                </p>
              </div>
            </div>

            {/* Footer Sign-off */}
            <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-slate-100 flex flex-col gap-2">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                Memorial Entry
              </p>
              <p className="text-slate-500 text-xs md:text-sm font-medium">
                This tribute is part of the Victor Grossman digital archive.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};
