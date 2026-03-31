"use client"

import React, { useState, useRef } from "react";
import { CameraIcon } from "./constants";

interface TributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    author: string,
    email: string,
    message: string,
    image?: string,
  ) => Promise<boolean>;
}

export const TributeModal: React.FC<TributeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (author && email && message) {
      setStatus("submitting");
      const success = await onSubmit(author, email, message, image);
      if (success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    }
  };

  const resetForm = () => {
    setAuthor("");
    setEmail("");
    setMessage("");
    setImage(undefined);
    setStatus("idle");
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetForm, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-8 shadow-2xl max-h-[90vh] overflow-y-auto transition-all animate-in fade-in zoom-in duration-300">
        {status === "success" ? (
          <div className="py-10 text-center space-y-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight font-serif italic">
              Check your inbox
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              We've received your tribute. To prevent spam, please check{" "}
              <span className="text-blue-600 font-semibold">{email}</span> for a
              verification link. Your post will appear on the wall once
              confirmed.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 mt-8 text-xs shadow-lg shadow-blue-500/20"
            >
              Back to Archive
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 font-serif italic">
                  Leave a Tribute
                </h2>
                <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-black">
                  Honor Victor's Legacy
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="w-6 h-6"
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
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Author Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g., Jonathan E."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="to confirm your post..."
                  />
                  <p className="text-[9px] text-slate-500 mt-2 italic font-serif tracking-tight">
                    Your tribute will be posted once you confirm your email
                    address.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Tribute Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none font-serif italic"
                    placeholder="Share a memory or condolences..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Reference Photo (Optional)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full aspect-[21/9] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden ${image ? "border-blue-500/50" : ""}`}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt="Preview"
                        className="w-full h-full object-cover brightness-95"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-300 group">
                        <CameraIcon />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-2 group-hover:text-slate-500">
                          Click to upload image
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="flex-1 px-4 py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 text-[10px] shadow-lg shadow-blue-500/20"
                >
                  {status === "submitting" ? "Processing..." : "Submit Tribute"}
                </button>
              </div>
              {status === "error" && (
                <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest text-center mt-4">
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};
