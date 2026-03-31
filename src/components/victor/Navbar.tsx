"use client";

import React, { useState, useEffect } from "react";
import { Section } from "./types";

interface NavbarProps {
  currentSection: Section;
  onNavigate: (section: Section) => void;
  lang: "en" | "de";
  setLang: (lang: "en" | "de") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onNavigate,
  lang,
  setLang,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: Section.Home, label: lang === "en" ? "Home" : "Start" },
    { id: Section.About, label: lang === "en" ? "About" : "Über" },
    { id: Section.Funeral, label: lang === "en" ? "Funeral" : "Trauerfeier" },
    { id: Section.Works, label: lang === "en" ? "Books" : "Bücher" },
    { id: Section.Blogs, label: lang === "en" ? "Bulletins" : "Berichte" },
    { id: Section.Films, label: lang === "en" ? "Films" : "Filme" },
    { id: Section.Articles, label: lang === "en" ? "Articles" : "Artikel" },
    { id: Section.Photos, label: lang === "en" ? "Photos" : "Fotos" },
    {
      id: Section.Memories,
      label: lang === "en" ? "Memories" : "Erinnerungen",
    },
    {
      id: Section.Interviews,
      label: lang === "en" ? "Interviews" : "Interviews",
    },
  ];

  const handleMobileNav = (id: Section) => {
    onNavigate(id);
    setIsMenuOpen(false);
  };

  const isLight = isScrolled || isMenuOpen || currentSection !== Section.Home;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          isLight
            ? "bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm py-3"
            : "bg-black/10 backdrop-blur-[2px] py-5"
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
            onClick={() => onNavigate(Section.Home)}
          >
            <span
              className={`font-bold tracking-tight text-lg md:text-xl transition-colors ${
                isLight ? "text-slate-900" : "text-white drop-shadow-sm"
              }`}
            >
              Victor Grossman
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-8">
            <div className="flex items-center gap-5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`text-[13px] font-black uppercase tracking-widest transition-all hover:text-blue-500 whitespace-nowrap flex-shrink-0 ${
                    currentSection === item.id
                      ? "text-blue-600"
                      : isLight
                        ? "text-slate-900"
                        : "text-white/90 hover:text-white drop-shadow-sm"
                  }`}
                >
                  {item.label}
                  <div
                    className={`h-[2px] bg-blue-600 transition-all duration-300 ${currentSection === item.id ? "w-full mt-1" : "w-0 mt-1"}`}
                  />
                </button>
              ))}
            </div>

            <div
              className={`flex items-center gap-2 border-l pl-6 ml-2 transition-colors ${
                isLight ? "border-slate-200" : "border-white/20"
              }`}
            >
              <button
                onClick={() => setLang("en")}
                className={`text-[11px] font-black px-2 py-1 rounded transition-all ${
                  lang === "en"
                    ? isLight
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-900"
                    : isLight
                      ? "text-slate-400 hover:text-slate-900"
                      : "text-white/50 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("de")}
                className={`text-[11px] font-black px-2 py-1 rounded transition-all ${
                  lang === "de"
                    ? isLight
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-900"
                    : isLight
                      ? "text-slate-400 hover:text-slate-900"
                      : "text-white/50 hover:text-white"
                }`}
              >
                DE
              </button>
            </div>
          </div>

          <button
            className={`xl:hidden p-2 transition-colors ${isLight ? "text-slate-900" : "text-white"}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-7 h-5 relative flex flex-col justify-between">
              <span
                className={`w-full h-0.5 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? "rotate-45 translate-y-2" : ""}`}
              />
              <span
                className={`w-full h-0.5 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? "opacity-0" : "opacity-100"}`}
              />
              <span
                className={`w-full h-0.5 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
              />
            </div>
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[90] bg-white transition-all duration-500 xl:hidden ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full pt-32 px-10 pb-10 overflow-y-auto">
          <div className="flex gap-4 mb-8 pb-8 border-b border-slate-100">
            <button
              onClick={() => setLang("en")}
              className={`text-sm font-black px-4 py-2 rounded-xl ${lang === "en" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400"}`}
            >
              English
            </button>
            <button
              onClick={() => setLang("de")}
              className={`text-sm font-black px-4 py-2 rounded-xl ${lang === "de" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400"}`}
            >
              Deutsch
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMobileNav(item.id)}
                className={`text-left text-3xl font-serif italic font-bold tracking-tight transition-all duration-300 ${
                  currentSection === item.id
                    ? "text-blue-600 pl-4 border-l-4 border-blue-600"
                    : "text-slate-400 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
