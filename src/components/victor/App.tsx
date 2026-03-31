"use client";

import React, { useState, useRef, useEffect } from "react";
import { Navbar } from "./Navbar";
import { MemoryCard } from "./MemoryCard";
import { TributeModal } from "./TributeModal";
import { MemoryDetailModal } from "./MemoryDetailModal";
import { ScrollRevealParagraph } from "./ScrollRevealParagraph";
import { ArticleReader } from "./ArticleReader";
import {
  Section,
  Memory,
  ArchivePhoto,
  Article,
  Book,
  Bulletin,
} from "./types";
import { PlusIcon, CameraIcon, BookIcon } from "./constants";
import { supabase, isSupabaseConfigured } from "@/lib/victor/supabase";

const App: React.FC = () => {
  const [lang, setLang] = useState<"en" | "de">("de");
  const [currentSection, setCurrentSection] = useState<Section>(Section.Home);
  const [view, setView] = useState<"main" | "gallery" | "articles">("main");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [archivePhotos, setArchivePhotos] = useState<ArchivePhoto[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksPage, setBooksPage] = useState(0);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [bulletinsPage, setBulletinsPage] = useState(0);
  const [pendingMainSection, setPendingMainSection] = useState<Section | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(
    null,
  );
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEulogyExpanded, setIsEulogyExpanded] = useState(false);
  const [isEulogy2Expanded, setIsEulogy2Expanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentYear = new Date().getFullYear();

  const sectionRefs = {
    [Section.Home]: useRef<HTMLElement>(null),
    [Section.About]: useRef<HTMLElement>(null),
    [Section.Funeral]: useRef<HTMLElement>(null),
    [Section.Photos]: useRef<HTMLElement>(null),
    [Section.Memories]: useRef<HTMLElement>(null),
    [Section.Works]: useRef<HTMLElement>(null),
    [Section.Articles]: useRef<HTMLElement>(null),
    [Section.Blogs]: useRef<HTMLElement>(null),
    [Section.Interviews]: useRef<HTMLElement>(null),
    [Section.Films]: useRef<HTMLElement>(null),
  };

  const sectionOrder: Section[] = [
    Section.Home,
    Section.About,
    Section.Funeral,
    Section.Works,
    Section.Blogs,
    Section.Films,
    Section.Articles,
    Section.Photos,
    Section.Memories,
    Section.Interviews,
  ];

  useEffect(() => {
    fetchMemories();
    fetchArchivePhotos();
    fetchArticles();
    fetchBooks();
    fetchBulletins();
  }, [lang]);

  useEffect(() => {
    setBooksPage(0);
  }, [books.length]);

  useEffect(() => {
    setBulletinsPage(0);
  }, [bulletins.length]);

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
        setAudioCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleEnded = () => {
      setPlayingUrl(null);
      setAudioProgress(0);
      setAudioCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    const updateActiveSection = () => {
      if (view !== "main") return;

      const threshold = window.innerHeight * 0.35;
      let active = Section.Home;

      for (const section of sectionOrder) {
        const el = sectionRefs[section].current;
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - threshold <= 0) {
          active = section;
        } else {
          break;
        }
      }

      setCurrentSection((prev) => (prev === active ? prev : active));
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [view]);

  const scrollToMainSection = (
    section: Section,
    behavior: ScrollBehavior = "smooth",
  ) => {
    if (section === Section.Home) {
      window.scrollTo({ top: 0, behavior });
      return;
    }

    sectionRefs[section]?.current?.scrollIntoView({
      behavior,
      block: "start",
    });
  };

  useEffect(() => {
    if (view !== "main" || !pendingMainSection) return;

    const targetSection = pendingMainSection;
    setPendingMainSection(null);

    // Wait for main layout mount before scrolling to target section.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToMainSection(targetSection);
      });
    });
  }, [view, pendingMainSection]);

  const handleToggleAudio = (url: string) => {
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) {
        if (audioRef.current.src !== url) {
          audioRef.current.src = url;
          audioRef.current.load();
        }
        audioRef.current
          .play()
          .catch((e) => console.error("Audio playback failed", e));
        setPlayingUrl(url);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      const time = (seekTo / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setAudioProgress(seekTo);
      setAudioCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const fetchArchivePhotos = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const approvedQuery = await supabase
        .from("photos")
        .select("id,title,image_url,created_at")
        .or("status.eq.approved,status.is.null")
        .order("created_at", { ascending: false });

      // Backward compatibility: if moderation columns are not migrated yet,
      // retry without status filter so existing photos still render.
      let data = approvedQuery.data;
      let error = approvedQuery.error;
      if (error && (error.message || "").toLowerCase().includes("status")) {
        const legacyQuery = await supabase
          .from("photos")
          .select("id,title,image_url,created_at")
          .order("created_at", { ascending: false });
        data = legacyQuery.data;
        error = legacyQuery.error;
      }

      if (error) throw error;
      setArchivePhotos(
        (data ?? []).map((row) => ({
          id: row.id,
          url: row.image_url,
          caption: row.title ?? "",
          contributor: "Victor Grossman Archive",
          created_at: row.created_at,
        })),
      );
    } catch (err) {
      console.error("Error fetching photos:", err);
    }
  };

  const fetchArticles = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id,created_at,title,content,excerpt,image_url,category,author,is_published",
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error("Error fetching articles:", err);
    }
  };

  const fetchMemories = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("tributes")
        .select("id,name,message,image_url,created_at,status")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMemories(
        data?.map((d) => ({
          id: d.id,
          author: d.name,
          message: d.message,
          image: d.image_url || undefined,
          initials:
            d.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "??",
          color: "bg-slate-900",
          date: new Date(d.created_at).toLocaleDateString(
            lang === "en" ? "en-US" : "de-DE",
            { year: "numeric", month: "long", day: "numeric" },
          ),
        })) || [],
      );
    } catch (err) {
      console.error("Error fetching memories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBooks = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("books")
        .select("id,title,author,description,image_url,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBooks(data ?? []);
    } catch (err) {
      console.error("Error fetching books:", err);
    }
  };

  const fetchBulletins = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("bulletins")
        .select("id,bulletin_number,title,content,published_date,created_at")
        .order("published_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBulletins(data ?? []);
    } catch (err) {
      console.error("Error fetching bulletins:", err);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Canvas to Blob conversion failed"));
            },
            "image/jpeg",
            0.7,
          );
        };
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSupabaseConfigured()) return;

    const submittedBy = lang === "en" ? "Website visitor" : "Website-Besucher";
    const inferredCaption = file.name.replace(/\.[^.]+$/, "").trim();

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const uploadPath = `photos/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("victor-public")
        .upload(uploadPath, compressed, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("victor-public")
        .getPublicUrl(uploadPath);

      const publicUrl = publicData?.publicUrl ?? "";
      if (!publicUrl) {
        throw new Error("Could not generate public URL for uploaded photo.");
      }

      const { error: insertError } = await supabase.from("photos").insert([
        {
          title: inferredCaption || null,
          image_url: publicUrl,
          submitted_by: submittedBy,
          status: "pending",
          approved_at: null,
          rejected_at: null,
        },
      ]);

      if (insertError) {
        await supabase.storage.from("victor-public").remove([uploadPath]);
        throw insertError;
      }

      alert(
        lang === "en"
          ? "Your photo was submitted for review and will appear after approval."
          : "Dein Foto wurde zur Pruefung eingereicht und erscheint nach Freigabe.",
      );
    } catch (err: unknown) {
      console.error("Archive photo upload failure:", err);
      const msg =
        err instanceof Error ? err.message : String(err ?? "Unknown error");
      if (
        /bucket|storage|policy|row-level security|permission|violates/i.test(
          msg,
        )
      ) {
        alert(
          lang === "en"
            ? "Upload failed due to storage/RLS setup. Please run SQL migration 0004 and fix-rls-all-sections.sql in Supabase, then try again."
            : "Upload fehlgeschlagen wegen Storage/RLS-Konfiguration. Bitte SQL-Migration 0004 und fix-rls-all-sections.sql in Supabase ausfuehren und erneut versuchen.",
        );
      } else {
        alert("Upload failed: " + msg);
      }
    } finally {
      setIsUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleSubmitTribute = async (
    author: string,
    _email: string,
    message: string,
    image?: string,
  ) => {
    if (!isSupabaseConfigured()) return false;
    let pendingImageUrl: string | null = null;
    let uploadPath = "";

    if (image) {
      const imageResp = await fetch(image);
      const imageBlob = await imageResp.blob();
      uploadPath = `tributes/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("victor-public")
        .upload(uploadPath, imageBlob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("Tribute image upload failure:", uploadError);
        return false;
      }

      const { data: publicData } = supabase.storage
        .from("victor-public")
        .getPublicUrl(uploadPath);
      pendingImageUrl = publicData?.publicUrl ?? null;
    }

    const { error } = await supabase.from("tributes").insert([
      {
        name: author,
        message,
        image_url: pendingImageUrl,
        status: "pending",
      },
    ]);

    if (error && uploadPath) {
      await supabase.storage.from("victor-public").remove([uploadPath]);
    }

    if (error) return false;
    fetchMemories();
    return true;
  };

  const handleNavigate = (section: Section) => {
    setCurrentSection(section);

    if (section === Section.Photos) {
      setPendingMainSection(null);
      setView("gallery");
      window.scrollTo(0, 0);
      return;
    }

    if (section === Section.Articles) {
      setPendingMainSection(null);
      setView("articles");
      window.scrollTo(0, 0);
      return;
    }

    if (view !== "main") {
      setPendingMainSection(section);
      setView("main");
      return;
    }

    scrollToMainSection(section);
  };

  const allPhotos = [
    ...archivePhotos.map((p) => ({
      url: p.url,
      contributor: p.contributor,
      caption: p.caption || "",
      id: p.id,
    })),
    ...memories
      .filter((m) => m.image)
      .map((m) => ({
        url: m.image!,
        contributor: m.author,
        caption: m.message.slice(0, 50) + "...",
        id: m.id,
      })),
  ];

  const filmArticles = articles.filter((a) => {
    const category = (a.category || "").toLowerCase();
    return category.includes("film") || category.includes("video");
  });

  const booksPerPage = 6;
  const totalBooksPages = Math.max(1, Math.ceil(books.length / booksPerPage));
  const currentBooksPage = Math.min(booksPage, totalBooksPages - 1);
  const visibleBooks = books.slice(
    currentBooksPage * booksPerPage,
    (currentBooksPage + 1) * booksPerPage,
  );

  const bulletinsPerPage = 4;
  const totalBulletinPages = Math.max(
    1,
    Math.ceil(bulletins.length / bulletinsPerPage),
  );
  const currentBulletinsPage = Math.min(bulletinsPage, totalBulletinPages - 1);
  const visibleBulletins = bulletins.slice(
    currentBulletinsPage * bulletinsPerPage,
    (currentBulletinsPage + 1) * bulletinsPerPage,
  );

  const t = {
    en: {
      bio1_title: "The Beginning",
      bio1_range: "1928 — 1951",
      bio1_text:
        "Born Stephen Wechsler in New York City, Victor's journey began in the vibrant political atmosphere of a Jewish-American family. By the time he reached Harvard University, his world-view had sharpened into a commitment to social justice that would define every subsequent year of his long life.",
      bio2_title: "The Danube Leap",
      bio2_text:
        "Facing the prospect of a military tribunal for his past affiliations, Stephen made his move. On August 12, 1952, he swam across the Danube near Linz, seeking asylum in the Soviet Zone. It was a swim away from one life, and toward another that would last over seven decades.",
      bio3_title: "Witness to Two Worlds",
      bio3_text:
        "Reborn as Victor Grossman in the GDR, he became a unique historical anomaly—the only person to graduate from both Harvard University and Karl Marx University in Leipzig. For decades, he served as an author, activist, journalist, translator, and bridge between East and West.",
      memorial_title: "Eulogy & Memorial",
      photo_archive: "Photographic Archive",
      photo_sub: "A curated history through images and shared memories",
      photo_upload: "Upload Photo",
      memories_title: "Wall of Memories",
      memories_btn: "Post Tribute",
      books_title: "Books & Publications",
      articles_title: "Selected Articles",
      bulletins_title: "Berlin Bulletins",
      interviews_title: "Interviews & Discussions",
      films_title: "Documentaries & Film",
      footer_tag:
        "Dedicated to preserving the narrative of a life that crossed borders.",
      back_home: "Back to Home",
      read_more: "Read Full Eulogy",
      read_less: "Read Less",
      view_all_articles: "View All Articles",
      articles_archive: "Article Archive",
      articles_desc: "A collection of writings, bulletins, and thoughts.",
    },
    de: {
      bio1_title: "Der Anfang",
      bio1_range: "1928 — 1951",
      bio1_text:
        "Geboren als Stephen Wechsler in New York City, begann Victors Reise in der lebendigen politischen Atmosphäre einer jüdisch-amerikanischen Familie. Als er die Harvard University erreichte, hatte sich sein Weltbild zu einem Engagement für soziale Gerechtigkeit geschärft.",
      bio2_title: "Der Sprung in die Donau",
      bio2_text:
        "Angesichts eines drohenden Militärgerichtsverfahrens wegen seiner früheren Zugehörigkeiten handelte Stephen. Am 12. August 1952 durchschwamm er bei Linz die Donau und floh von der US-Besatzungszone in die sowjetische Besatzungszone in Österreich.",
      bio3_title: "Zeuge zweier Welten",
      bio3_text:
        "Als Victor Grossman in der DDR wiedergeboren, wurde er zu einer einzigartigen historischen Anomalie – der einzigen Person, die sowohl die Harvard University als auch die Karl-Marx-Universität in Leipzig absolvierte. Jahrzehntelang arbeitete er als Autor, Aktivist, Journalist, Übersetzer und Brücke zwischen Ost und West.",
      memorial_title: "Trauerrede & Gedenken",
      photo_archive: "Fotografisches Archiv",
      photo_sub: "Eine kuratierte Geschichte durch Bilder und Erinnerungen",
      photo_upload: "Foto hochladen",
      memories_title: "Wand der Erinnerungen",
      memories_btn: "Beitrag schreiben",
      books_title: "Bücher & Publikationen",
      articles_title: "Ausgewählte Artikel",
      bulletins_title: "Berlin Bulletins",
      interviews_title: "Interviews & Gespräche",
      films_title: "Dokumentationen & Film",
      footer_tag:
        "Gewidmet der Bewahrung der Erzählung eines Lebens, das Grenzen überschritt.",
      back_home: "Zurück zum Start",
      read_more: "Vollständigen Nachruf lesen",
      read_less: "Weniger lesen",
      view_all_articles: "Alle Artikel ansehen",
      articles_archive: "Artikel Archiv",
      articles_desc: "Eine Sammlung von Schriften, Berichten und Gedanken.",
    },
  }[lang];

  if (fullscreenPhoto) {
    return (
      <div
        className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
        onClick={() => setFullscreenPhoto(null)}
      >
        <button className="absolute top-6 right-6 text-white w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-all">
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
        <img
          src={fullscreenPhoto}
          className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-300"
        />
      </div>
    );
  }

  // Dedicated Articles View
  if (view === "articles") {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col">
        <Navbar
          currentSection={currentSection}
          onNavigate={handleNavigate}
          lang={lang}
          setLang={setLang}
        />
        <main className="flex-grow pt-32 px-4 md:px-6 pb-24 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-slate-100 pb-12">
            <div>
              <div className="flex items-center gap-3 mb-4 text-blue-600">
                <BookIcon />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                  Victor Grossman
                </span>
              </div>
              <h2 className="text-3xl md:text-6xl font-serif italic font-bold tracking-tight">
                {t.articles_archive}
              </h2>
              <p className="text-slate-500 mt-3 font-medium text-base md:text-lg">
                {t.articles_desc}
              </p>
            </div>
            <button
              onClick={() => handleNavigate(Section.Home)}
              className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors py-3 px-6 md:px-8 border border-slate-100 rounded-full whitespace-nowrap"
            >
              {t.back_home}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="group cursor-pointer flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300"
              >
                <div className="aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden relative">
                  {article.image_url ? (
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 font-serif italic text-4xl">
                      VG
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                      {article.category}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-[1px] bg-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {new Date(article.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold font-serif italic mb-3 leading-tight group-hover:text-blue-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed font-medium">
                    {article.excerpt || "Read full article..."}
                  </p>
                </div>
              </div>
            ))}
            {articles.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="font-serif italic text-xl">
                  Articles coming soon...
                </p>
              </div>
            )}
          </div>
        </main>
        <ArticleReader
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      </div>
    );
  }

  if (view === "gallery") {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col">
        <Navbar
          currentSection={currentSection}
          onNavigate={handleNavigate}
          lang={lang}
          setLang={setLang}
        />
        <main className="flex-grow pt-32 px-4 md:px-6 pb-24 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-6xl font-serif italic font-bold tracking-tight">
                {t.photo_archive}
              </h2>
              <p className="text-slate-500 mt-3 font-medium text-base md:text-lg">
                {t.photo_sub}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <input
                type="file"
                ref={photoInputRef}
                className="hidden"
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              <button
                disabled={isUploading}
                onClick={() => photoInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 md:px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CameraIcon />
                )}{" "}
                {t.photo_upload}
              </button>
              <button
                onClick={() => setView("main")}
                className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors py-3 px-6 md:px-8 border border-slate-100 rounded-full"
              >
                {t.back_home}
              </button>
            </div>
          </div>
          <div className="masonry-grid columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {allPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setFullscreenPhoto(photo.url)}
                className="masonry-item group relative overflow-hidden rounded-xl bg-slate-50 shadow-sm transition-all hover:shadow-xl cursor-zoom-in mb-4"
              >
                <img
                  src={photo.url}
                  className="w-full h-auto transition-all duration-700"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-[10px] font-medium tracking-wide line-clamp-2">
                    {photo.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const interview1Url =
    "https://prinomaaszkdknrluweo.supabase.co/storage/v1/object/public/victor%20grossman/SF-18-05-14-Victor%20Grossman-si.mp3";
  const interview2Url =
    "https://prinomaaszkdknrluweo.supabase.co/storage/v1/object/public/victor%20grossman/Victor%20Grossman%20Begegnungen%20mit%20Pete%20Seeger%20Berliner%20Rundfunk%2006.%20Mai%201979.mp3";

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      <Navbar
        currentSection={currentSection}
        onNavigate={handleNavigate}
        lang={lang}
        setLang={setLang}
      />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section
          ref={sectionRefs[Section.Home]}
          className="relative h-[100dvh] md:h-[95vh] flex flex-col justify-end overflow-hidden"
        >
          <div className="absolute inset-0 z-0">
            <img
              src="https://bilder.deutschlandfunk.de/FI/LE/_3/70/FILE_37094d6d0577fb2093d8e96b3ff84bd9/2630844420-victor-2019-jpg-100-1920x1080.jpg"
              alt="Victor Grossman"
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-20 md:pb-24 w-full text-center md:text-left">
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <div className="max-w-5xl mx-auto md:mx-0">
                <h1 className="text-lg md:text-2xl lg:text-4xl xl:text-5xl font-bold text-white mb-6 tracking-tighter leading-tight drop-shadow-[0_4px_32px_rgba(0,0,0,0.8)]">
                  Victor Grossman - Stephen Wechsler
                </h1>
                <div className="flex flex-col gap-6 text-white font-serif italic text-lg md:text-2xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                  <p className="font-bold tracking-tight">1928 – 2025</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BIOGRAPHY SECTION */}
        <section
          ref={sectionRefs[Section.About]}
          className="relative bg-white pt-20 pb-24 md:pt-32 md:pb-40"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-24 md:mb-40 flex flex-col items-center text-center">
              <div className="max-w-4xl space-y-8 md:space-y-12">
                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-blue-600">
                  {t.bio1_title}
                </span>
                <h2 className="text-4xl md:text-8xl font-serif italic font-bold text-slate-900 tracking-tight leading-none">
                  {t.bio1_range}
                </h2>
                <ScrollRevealParagraph
                  text={t.bio1_text}
                  className="text-xl md:text-5xl font-serif leading-tight text-slate-700 italic"
                />
              </div>
            </div>

            <div className="relative mb-24 md:mb-40 py-20 md:py-32 border-y border-slate-100 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] md:opacity-[0.03] pointer-events-none select-none">
                <span className="text-[60vw] md:text-[40vw] font-black italic">
                  1952
                </span>
              </div>
              <div className="max-w-5xl mx-auto text-center space-y-8 md:space-y-12 relative z-10">
                <h3 className="text-3xl md:text-8xl font-serif italic font-bold text-slate-900 tracking-tight leading-none">
                  {t.bio2_title}
                </h3>
                <ScrollRevealParagraph
                  text={t.bio2_text}
                  className="text-lg md:text-4xl font-serif leading-relaxed text-slate-800 italic"
                />
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="max-w-4xl space-y-8 md:space-y-12">
                <h2 className="text-3xl md:text-8xl font-serif italic font-bold text-slate-900 tracking-tight leading-none">
                  {t.bio3_title}
                </h2>
                <p className="text-lg md:text-4xl font-serif italic text-slate-700 leading-relaxed">
                  {t.bio3_text}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FUNERAL SECTION */}
        <section
          ref={sectionRefs[Section.Funeral]}
          className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-32 bg-slate-50 rounded-[2rem] md:rounded-[4rem] mb-24 md:mb-32"
        >
          <div className="max-w-4xl mx-auto space-y-24">
            {/* Eulogy 1: Sevim Dagdelen */}
            <div className="space-y-8 md:space-y-12">
              <div className="flex items-center gap-4 md:gap-6 text-blue-600 mb-8 md:mb-10">
                <div className="w-12 md:w-16 h-[2px] bg-blue-600/40 rounded-full" />
                <h2 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-slate-400">
                  {t.memorial_title}
                </h2>
              </div>
              <h3 className="text-3xl md:text-6xl font-bold text-slate-900 font-serif italic tracking-tight leading-tight">
                Trauerrede für Victor Grossman von Sevim Dagdelen
              </h3>
              <div
                className={`prose prose-slate max-w-none text-slate-700 font-serif italic text-lg md:text-2xl leading-relaxed transition-all relative ${!isEulogyExpanded ? "max-h-[500px] md:max-h-[700px] overflow-hidden" : ""}`}
              >
                <div className="space-y-6 md:space-y-8 text-slate-800">
                  <p>Liebe Freunde,</p>
                  <p>
                    Ein Bild von Victor Grossman ist mir unwiderruflich im
                    Herzen geblieben. Auf der „Fiesta de Solidaridad“ in
                    Berlin-Lichtenberg traf ich Victor vor zwei Jahren. Da war
                    er bereits 95 Jahre alt. Es hatte zu regnen angefangen – in
                    Strömen. Es war kein guter Unterstand weit und breit zu
                    sehen. Victor bestand aber darauf, zu bleiben. Erst als sein
                    Hemd schon völlig durchnässt war, konnten wir ihn überreden,
                    sich von meinem Mann nach Hause fahren zu lassen.
                  </p>
                  <p>
                    Dieses Bild sagt viel über Victor. Victor war ein Kämpfer –
                    durch und durch. Manche kämpfen in ihrer Jugend, manche im
                    Berufsalter – manche aber ein Leben lang. Victor gehörte zu
                    den Letzteren.
                  </p>
                  <p>
                    Letztes Jahr mussten ihn seine Kinder noch liebevoll davon
                    abhalten, mit der Gaza-Flottille mitzufahren, um gegen das
                    Unrecht an den Palästinensern zu protestieren. So tief saß
                    in ihm der Wille, den Kampf nie aufzugeben. Und das sagt
                    sich nicht einfach so dahin.
                  </p>
                  <p>
                    Nikolai Ostrowski hat es in seinem Buch „Wie der Stahl
                    gehärtet wurde“ auf bewegende Weise formuliert:
                  </p>
                  <p className="pl-4 md:pl-8 border-l-4 border-blue-500 bg-white p-6 md:p-12 rounded-2xl md:rounded-3xl shadow-xl italic my-8 md:my-12 text-xl md:text-3xl leading-snug">
                    Das Wertvollste, was der Mensch besitzt, ist das Leben. Es
                    wird ihm nur einmal gegeben, und er muss es so nützen, dass
                    ihn später sinnlos vertane Jahre nicht qualvoll gereuen, die
                    Schande einer unwürdigen, nichtigen Vergangenheit ihn nicht
                    bedrückt und dass er sterbend sagen kann: Mein ganzes Leben,
                    meine ganze Kraft habe ich dem Herrlichsten auf der Welt –
                    dem Kampf für die Befreiung der Menschheit – geweiht.
                  </p>
                  <p>
                    Victor hat sich diesen Kampf um die Befreiung der Menschheit
                    zur Lebensaufgabe gemacht – und bereits als Kind seine
                    Entscheidung getroffen. Mit acht Jahren sammelte er auf dem
                    Times Square in New York Spenden für die Internationalen
                    Brigaden, der Spanischen Republik, die sich dem Faschismus
                    Francos und seinen Unterstützern Hitler und Mussolini
                    entgegenstellten. Für Victor hatte der Zweite Weltkrieg 1936
                    mit dem Angriff der Franquisten begonnen. Erst der Sieg der
                    Alliierten – vor allem der Sieg der Sowjetunion hier in
                    Berlin – konnte diese Niederlage gegen den Faschismus
                    revidieren.
                  </p>
                  <p>
                    Mit acht Jahren schien Victor seine Richtung bereits
                    gefunden zu haben. Auf andere, ganz besonders junge Menschen
                    zuzugehen, das war sein Leben. Es war deshalb
                    selbstverständlich, dass Victor mit 90 Jahren eine lange
                    Lesereise in die USA unternahm, um seine Analysen einer
                    breiten Leserschaft vorzustellen und Menschen zu gewinnen,
                    den Kampf um die Befreiung der Menschheit mitzugragen.
                    Victors Entscheidung, diesen Kampf aufzunehmen, war
                    unumstößlich. Und um ihn führen zu können, war er bereit,
                    existentielle Schritte zu gehen, auch um seine Position in
                    diesem Kampf zu verbessern.
                  </p>
                  <p>
                    Victor Grossman war Mitglied der Kommunistischen Partei der
                    USA. Um der Verfolgung durch CIA und FBI während der
                    McCarthy Zeit zu entkommen, desertierte er, in Bayern
                    stationiert, aus der US-Armee. Am 12. August 1952
                    durchschwamm er bei Linz die Donau und floh von der
                    US-Besatzungszone in die sowjetische Besatzungszone in
                    Österreich.
                  </p>
                  <p>
                    Eine Entscheidung für das Leben – und eine Entscheidung für
                    die Sowjetunion, die er, solange ich ihn kannte, niemals
                    bereute. Aus Stephen Wechsler, so sein Name in den USA,
                    wurde Victor Grossman in der DDR. Der Namenswechsel war mehr
                    als Schutz für die Familie und sich selbst. Er war die neue,
                    die kommunistische Identität – ein „nom de combat“, wie es
                    auf Französisch so schön heißt, ein Kampfname. Wie viel Mut
                    muss ein Mensch haben, um eine solche, einsame Entscheidung
                    zu treffen? Sein erfolgreiches Leben, mit vielen Freunden,
                    der geliebten amerikanischen Kunst, Kultur und Sprache und
                    Familie, hinter sich lassen zu müssen, um sich der Vorladung
                    des US-Militärgerichts zu entziehen und zugleich ein völlig
                    neues, unbekanntes Leben zu beginnen?
                  </p>
                  <p>
                    Victor Grossman war ein Intellektueller. Er scherzte gern,
                    dass er der Einzige sei, der sowohl einen Abschluss der
                    berühmten Harvard-Universität in Cambridge als auch der
                    Karl-Marx-Universität in Leipzig innehatte. Ein organischer
                    Intellektueller, hätte Antonio Gramsci gesagt. Denn was ihn
                    wirklich formte, war weniger die akademische Ausbildung,
                    sondern die Jahre als ungelernter Arbeiter in Buffalo in New
                    York. Ein Dutzend Genossen hatte der Zellenvorsitzende der
                    KP in Harvard gefragt, ob sie nach dem Studium in die
                    Produktion gehen würden. Drei von ihnen hatten sich
                    bereiterklärt – darunter Victor Grossman. Buffalo war
                    Victors Schule. Hier begriff er, was die Realität der
                    Arbeiter in den USA wirklich bedeutete. Buffalo war der Ort,
                    an dem er „viel lernte“, so seine eigene Aussage. Ein Ort
                    der Ausbeutung, des Rassismus, der Unterdrückung des
                    Menschen durch den Menschen.
                  </p>
                  <p>
                    Die DDR sah Victor als Widerspruchsgesellschaft, in der
                    große Errungenschaften – soziale Sicherheit, Antifaschismus,
                    Frauenemanzipation und die Unterstützung
                    antiimperialistischer Kämpfe – schweren Mängeln
                    gegenüberstanden. Victor sprach offen von den verpassten
                    Chancen in den siebziger und achtziger Jahren bei der
                    Schaffung innerparteilicher Demokratie, der Krise der
                    Planwirtschaft und einer Führung, die zunehmend den Bezug
                    zur Realität verlor. Die Niederlage der DDR war für Victor
                    auch eine persönliche Niederlage. Aber anders als viele
                    andere war für ihn entscheidend, dass künftige Generationen
                    aus dieser Niederlage lernen sollten – nicht nur aus den
                    Mängeln, sondern gerade auch aus den Errungenschaften.
                  </p>
                  <p>
                    Victor – und das macht ihn so besonders – war nicht bereit,
                    sich an die Ideologie der Sieger anzupassen. So stark war
                    er. Victors Entscheidung für die Sowjetunion war zugleich
                    eine klare Entscheidung gegen den US-Imperialismus. Victor
                    wusste genau, wie die koloniale Unterdrückungsmaschinerie
                    der USA durch Kriege und Interventionen im Globalen Süden
                    funktionierte. Jemand wie US-Präsident Trump war für ihn
                    keine Ausnahme, sondern brachte dieses System, das auf die
                    gnadenlose Bereicherung einiger weniger ganz Reicher setzt,
                    nur auf den Punkt. Zu diesem System einer global plündernden
                    und mordenden US-Oligarchie musste es eine Alternative geben
                    – muss es eine Antwort geben. Seine Solidarität galt den
                    unterdrückten Völkern weltweit: Südafrika, Vietnam, Angola,
                    Palästina. Klar gegen die Politik des imperialistischen
                    Vorpostens im Nahen Osten, setzte Victor auf Frieden und
                    Versöhnung zwischen Israelis und Palästinensern. Seine
                    scharfsinnigen Analysen stellte er diesem Kampf um Befreiung
                    zur Verfügung.
                  </p>
                  <p>
                    Oft hört man bei Verstorbenen, sie seien humorvoll gewesen –
                    vielleicht auch, um den Tod etwas weniger endgültig
                    erscheinen zu lassen. Humor ist ja, wie Walter Benjamin
                    formuliert hatte, ein Act einer urteilslosen Vollstreckung,
                    einer rechtsaussetzenden Gewalt. Victor liebte diese
                    rechtsaussetzende Gewalt. Victor liebte jüdische Witze. Wie
                    etwa den: Treffen sich zwei Juden im Zug. Sagt der eine zum
                    anderen: „Ei.“ Sagt der andere: „Eieiei.“ Antwortet der
                    erste: „Lass uns lieber nicht über Politik reden.“
                  </p>
                  <p>
                    Liebe Trauergemeinde, Victor und ich hatten ein besonderes
                    Verhältnis. Für Victor war nicht wichtig, wo man herkam –
                    schon gar nicht, wo die eigenen Eltern oder Großeltern
                    herkamen, oder welcher Religion man angehörte oder welcher
                    Religion die eigenen Eltern oder Großeltern angehörten. Das
                    spielte für ihn einfach keine Rolle. Er wusste, dass dies
                    immer nur Fragen waren, um jemanden auszuschließen und am
                    Ende auch seine intellektuelle Redlichkeit in Zweifel zu
                    ziehen. So hat Victor mein Herz erobert. Was einer denkt,
                    wie einer handelt, wie er zu den Arbeitern steht, zu den
                    einfachen Leuten – das war wichtig, nicht, worauf andere ihn
                    festzulegen versuchten.
                  </p>
                  <p>
                    Der Kampf um Befreiung ist aber nicht nur ein Kampf um die
                    Lebenden, sondern auch um die Toten. Das musste ich
                    erkennen, als ich im Vorfeld dieser Rede einige der Nachrufe
                    auf Victor Grossman gelesen habe. Unwillkürlich kam mir ein
                    Zitat von Walter Benjamin in den Sinn: „Auch die Toten
                    werden vor dem Feind, wenn er siegt, nicht sicher sein. Und
                    dieser Feind hat zu siegen nicht aufgehört.“ Der Kampf für
                    Befreiung ist auch ein Kampf gegen die Umdeutung des Erbes
                    von Victor Grossman. Denn nur dann haben wir eine Chance,
                    unsere Position im Kampf um Befreiung zu verbessern.
                  </p>
                  <p>Leb wohl, lieber Victor.</p>
                </div>
                {!isEulogyExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-t from-slate-50 to-transparent" />
                )}
              </div>
              <button
                onClick={() => setIsEulogyExpanded(!isEulogyExpanded)}
                className="w-full md:w-auto px-8 md:px-12 py-4 md:py-5 border-2 border-slate-900 rounded-full text-slate-900 font-black uppercase tracking-widest text-[10px] md:text-[12px] hover:bg-slate-900 hover:text-white transition-all shadow-lg active:scale-95"
              >
                {isEulogyExpanded ? t.read_less : t.read_more}
              </button>
            </div>

            {/* Eulogy 2: Sabine Schubert */}
            <div className="space-y-8 md:space-y-12 pt-16 border-t border-slate-200">
              <h3 className="text-3xl md:text-6xl font-bold text-slate-900 font-serif italic tracking-tight leading-tight">
                Trauerrede von Sabine Schubert
              </h3>
              <div
                className={`prose prose-slate max-w-none text-slate-700 font-serif italic text-lg md:text-2xl leading-relaxed transition-all relative ${!isEulogy2Expanded ? "max-h-[500px] md:max-h-[700px] overflow-hidden" : ""}`}
              >
                <div className="space-y-6 md:space-y-8 text-slate-800">
                  <p>Lieber, lieber Victor,</p>
                  <p>
                    diesen Brief hatte ich vor reichlich 2 Jahren zu deinem 95.
                    Geburtstag geschrieben und habe ihn für heute etwas
                    überarbeitet, vor allem gekürzt. Denn über dich kann mensch
                    ja so viel erzählen. 97 Jahre – die muss ein Mensch erstmal
                    schaffen. Und auch für dich gilt: Was für ein Leben!
                  </p>
                  <p>
                    Gefühlt kenne ich dich schon mein ganzes Leben. Wer in der
                    DDR in irgendeiner Form politisch aktiv und auch kulturell
                    unterwegs war, kam an Victor Grossman nicht vorbei. Deshalb
                    habe ich mich damals im Februar 2000 sehr gefreut, dass nach
                    der großen Demo für Mumia im Anschluss ein
                    musikalisch-literarischer Abend im Roten Salon stattfand.
                    Mit Bettina, Suzanna, Jutta, Karsten und dir. Später wusste
                    ich, dass das deine Idee war, denn es gab auf deine
                    Initiative mehrmals so ein Programm, u.a. im Französischen
                    Dom.
                  </p>
                  <p>
                    Anfang 2000 begann ich auch im Infoladen intercambio zu
                    arbeiten und lernte so das Aktionsbündnis für Mumia kennen.
                    Und wer war dabei? Victor Grossman! Ich kannte Victor jetzt
                    persönlich!!! Aus unserer Zusammenarbeit hat sich eine
                    Freundschaft entwickelt, die mich richtig, richtig stolz
                    macht. Denn du bist ein bewundernswerter Mensch, du bist
                    ungeheuer klug und unterhaltsam, dabei bescheiden,
                    hilfsbereit und vor allem humorvoll.
                  </p>
                  <p>
                    Weißt du eigentlich, dass du für eins meiner schönsten und
                    besten Erlebnisse in der DDR „verantwortlich“ bist? Bei
                    Perry Friedman habe ich gelesen, dass die Idee der
                    Hootenanny von dir stammt. Ohne die Hootenanny hätte es kein
                    Festival des politischen Liedes gegeben. Es waren
                    unvergessliche Konzerte und Erlebnisse.
                  </p>
                  <p>
                    Bei Perry habe ich weiterhin gelesen, und du hattest das
                    auch erzählt, dass nach der „Tauwetterperiode“ in den 60ern
                    sämtliches amerikanische zu verschwinden hatte. Wenn ich
                    mich richtig erinnere, hattest du eine eigene Radio-Sendung,
                    die dann nicht mehr ausgestrahlt werden durfte. Aus der
                    Hootenanny wurde der Oktoberklub, nix spontanes mehr… Das
                    muss dir bitter aufgestoßen sein, und doch bist du „bei der
                    Sache“ geblieben. Wir hatten in der DDR die Möglichkeit des
                    Aufbaus einer neuen Gesellschaft, das hatte für dich den
                    Vorrang.
                  </p>
                  <p>
                    Jetzt mir fällt dein Freund Josh ein. Auch mit ihm haben wir
                    einige gemeinsame Veranstaltungen gemacht. Und einmal habt
                    ihr mir anschließend über eure langjährige Freundschaft
                    erzählt, dass ihr mit Vorträgen in der DDR unterwegs wart
                    und anschließend bis in die frühen Morgenstunden auf der
                    Straße standet und diskutiert habt. Josh hatte vor allem die
                    Probleme gesehen, du hattest dagegengehalten, dass wir diese
                    Möglichkeit, die wir für eine neue Gesellschaft haben,
                    nutzen müssen. Trotz alledem! Kann man hier ruhig mal so
                    sagen.
                  </p>
                  <p>
                    Für mich gehören auch Victor Grossman und Angela Davis
                    zusammen. Von dir haben wir ja in der DDR nicht nur viel
                    über die amerikanische Musik, die Protestsongs erfahren,
                    sondern auch über die Geschichte der Bürgerrechtsbewegung.
                    Als dann 2005 das Buch „Unterwegs zu Angela“ von Walter
                    Kaufmann in einer Neuauflage erschien, hast du –
                    folgerichtig – das Vorwort geschrieben. Mit diesem Buch gab
                    es wieder mehrere Veranstaltungen mit Walter und dir. Ich
                    habe euch sogar bis nach Cottbus geschleppt. Dort habt ihr
                    u.a. erzählt, dass ihr drei „män’s“ immer verwechselt
                    wurdet: Friedman, Grossman und Kaufman. Dabei fandet ihr
                    euch überhaupt nicht ähnlich! Ja, es war immer ein Erlebnis
                    mit euch Alten. Es gab für mich viel zu hören und zu lernen.
                  </p>
                  <p>
                    Apropos Bücher. Ich habe mir auf der RLK am Stand der
                    Spanienkämpfer das Buch „Frauen und der spanische Krieg
                    1936-1939“ gekauft. Ich denke, der „Vorreiter“ dieses Buches
                    warst wieder du mit deinem Spanien-Buch. Denn du hattest
                    nicht umsonst eine Frau als Titelbild gewählt. Oder mit den
                    „Rebel Girls“. Du hast mir eine Widmung ins Buch
                    geschrieben: „Für Sabine, eine Rebel Girl!“ Den Rebel gebe
                    ich gerne zurück.
                  </p>
                  <p>
                    Ich gehe nochmal zurück zur Hootenanny. Lin Jaldati gehörte
                    auch dazu. Sie habe ich leider nicht mehr persönlich
                    kennengelernt. Dafür habe ich mehrere Konzerte mit Jalda
                    Rebling erlebt. Und 2013 Jalda und Kathinka zusammen. Jalda
                    erzählte damals, dass Anna Seghers die Lin in die DDR holte,
                    weil die mahnenden Stimmen aus dem eigenen Erleben immer
                    wieder gehört werden müssen und Lin sang immer in ihren
                    Programmen das Lied „Es brennt Brüder, es brennt“. Und
                    weiterhin erzählte Jalda, weil ja Anna und Lin nebeneinander
                    hier auf dem Dorotheenstädtischen Friedhof begraben sind,
                    sie sich vorstellen kann, dass die beiden Damen, abends,
                    wenn alle Besucher weg sind und Ruhe eingekehrt ist, sich
                    unter der Ulme treffen und sich austauschen über Gott und
                    die Welt. Und ich kann mir gut vorstellen, dass du dich zu
                    ihnen gesellst.
                  </p>
                  <p>
                    Ich hatte auch das Glück, deine Familie kennenzulernen.
                    Deine Renate war eine tolle Frau. Sie hatte mir erzählt,
                    dass sie damals von ihren Freundinnen vor dir gewarnt wurde,
                    denn „er sieht aus wie ein Abenteurer“. Und dann kam dein
                    Brief mit den Worten: Ich habe die Liebe meines Lebens
                    verloren. Das hatte mich damals sehr berührt, weil diese
                    Worte mir einen liebenden Menschen zeigten, der das auch
                    sagen bzw. zeigen kann. Obwohl du immer verlegen warst, wenn
                    ich das zu dir sagte. Und so möchte ich mich von dir
                    verabschieden: Victor, ich liebe dich!
                  </p>
                  <p>
                    Eines noch: Vor kurzem fand wieder die RLK statt. Solange du
                    konntest, warst du immer dabei. Denn der Kampf für eine
                    bessere Welt ist immer noch richtig und notwendig. Wir
                    machen weiter Victor, versprochen! No Pasaran!
                  </p>
                </div>
                {!isEulogy2Expanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-t from-slate-50 to-transparent" />
                )}
              </div>
              <button
                onClick={() => setIsEulogy2Expanded(!isEulogy2Expanded)}
                className="w-full md:w-auto px-8 md:px-12 py-4 md:py-5 border-2 border-slate-900 rounded-full text-slate-900 font-black uppercase tracking-widest text-[10px] md:text-[12px] hover:bg-slate-900 hover:text-white transition-all shadow-lg active:scale-95"
              >
                {isEulogy2Expanded ? t.read_less : t.read_more}
              </button>
            </div>
          </div>
        </section>

        {/* BOOKS SECTION */}
        <section
          ref={sectionRefs[Section.Works]}
          className="py-20 md:py-32 bg-white border-y border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between gap-4 mb-12 md:mb-16">
              <div className="flex items-center gap-4">
                <BookIcon />
                <h2 className="text-3xl md:text-5xl font-bold font-serif italic tracking-tight text-slate-900">
                  {t.books_title}
                </h2>
              </div>
              {books.length > booksPerPage && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBooksPage((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentBooksPage === 0}
                    className="w-10 h-10 rounded-full border border-slate-300 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous books"
                  >
                    <svg
                      className="w-5 h-5 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {currentBooksPage + 1}/{totalBooksPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setBooksPage((prev) =>
                        Math.min(totalBooksPages - 1, prev + 1),
                      )
                    }
                    disabled={currentBooksPage >= totalBooksPages - 1}
                    className="w-10 h-10 rounded-full border border-slate-300 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next books"
                  >
                    <svg
                      className="w-5 h-5 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleBooks.map((book) => (
                <article
                  key={book.id}
                  className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    {book.image_url ? (
                      <img
                        src={book.image_url}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-serif italic text-4xl">
                        VG
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                      {book.author}
                    </p>
                    <h3 className="text-xl font-bold font-serif italic text-slate-900 leading-tight">
                      {book.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                      {book.description || "No description available."}
                    </p>
                  </div>
                </article>
              ))}
              {books.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="font-serif italic text-xl">
                    Books coming soon...
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* BULLETINS SECTION */}
        <section
          ref={sectionRefs[Section.Blogs]}
          className="py-20 md:py-32 bg-slate-50 border-y border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between gap-4 mb-12 md:mb-16">
              <h2 className="text-3xl md:text-5xl font-bold font-serif italic tracking-tight text-slate-900">
                {t.bulletins_title}
              </h2>
              {bulletins.length > bulletinsPerPage && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBulletinsPage((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentBulletinsPage === 0}
                    className="w-10 h-10 rounded-full border border-slate-300 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous bulletins"
                  >
                    <svg
                      className="w-5 h-5 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {currentBulletinsPage + 1}/{totalBulletinPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setBulletinsPage((prev) =>
                        Math.min(totalBulletinPages - 1, prev + 1),
                      )
                    }
                    disabled={currentBulletinsPage >= totalBulletinPages - 1}
                    className="w-10 h-10 rounded-full border border-slate-300 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next bulletins"
                  >
                    <svg
                      className="w-5 h-5 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {visibleBulletins.map((bulletin) => (
                <article
                  key={bulletin.id}
                  onClick={() => setSelectedBulletin(bulletin)}
                  className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                      {bulletin.bulletin_number || "Berlin Bulletin"}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {new Date(
                        bulletin.published_date || bulletin.created_at,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-serif italic text-slate-900 mb-3 leading-tight">
                    {bulletin.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed line-clamp-5">
                    {bulletin.content}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-blue-600">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                      Read full bulletin
                    </span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </article>
              ))}
              {bulletins.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="font-serif italic text-xl">
                    Bulletins coming soon...
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FILMS SECTION */}
        <section
          ref={sectionRefs[Section.Films]}
          className="py-20 md:py-32 bg-white border-b border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-6xl font-bold font-serif italic tracking-tight text-slate-900 mb-12 md:mb-16">
              {t.films_title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filmArticles.slice(0, 3).map((film) => (
                <article
                  key={film.id}
                  onClick={() => setSelectedArticle(film)}
                  className="group cursor-pointer bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all"
                >
                  <div className="aspect-video bg-slate-100 overflow-hidden">
                    {film.image_url ? (
                      <img
                        src={film.image_url}
                        alt={film.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-serif italic text-4xl">
                        VG
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold font-serif italic text-slate-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                      {film.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {film.excerpt || "Open to read the full entry."}
                    </p>
                  </div>
                </article>
              ))}
              {filmArticles.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="font-serif italic text-xl">
                    Films coming soon...
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ARTICLES & BULLETINS SECTION (PREVIEW) */}
        <section
          ref={sectionRefs[Section.Articles]}
          className="py-20 md:py-32 bg-slate-50 border-y border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div className="flex items-center gap-4">
                <BookIcon />
                <h2 className="text-3xl md:text-5xl font-bold font-serif italic tracking-tight text-slate-900">
                  {t.articles_title}
                </h2>
              </div>
              <button
                onClick={() => handleNavigate(Section.Articles)}
                className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors py-3 px-6 md:px-8 border border-slate-200 bg-white rounded-full whitespace-nowrap shadow-sm hover:shadow-md"
              >
                {t.view_all_articles}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.slice(0, 3).map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="group cursor-pointer flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden relative">
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 font-serif italic text-4xl">
                        VG
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                        {article.category}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-[1px] bg-slate-300" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold font-serif italic mb-3 leading-tight group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed font-medium">
                      {article.excerpt || "Read full article..."}
                    </p>
                  </div>
                </div>
              ))}
              {articles.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="font-serif italic text-xl">
                    Articles coming soon...
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PHOTO ARCHIVE SECTION */}
        <section
          ref={sectionRefs[Section.Photos]}
          className="py-20 md:py-32 bg-white"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-6">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-6xl font-bold font-serif italic tracking-tight text-slate-900">
                  {t.photo_archive}
                </h2>
                <p className="text-slate-400 font-medium tracking-wide">
                  Historical records and personal snapshots
                </p>
              </div>
              <button
                onClick={() => setView("gallery")}
                className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500 transition-all flex items-center gap-3"
              >
                Full Collection
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {allPhotos.slice(0, 4).map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-sm bg-slate-100 cursor-zoom-in group border border-slate-200"
                  onClick={() => setView("gallery")}
                >
                  <img
                    src={photo.url}
                    className="w-full h-full object-cover brightness-100 group-hover:scale-110 transition-all duration-1000"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WALL OF MEMORIES */}
        <section
          ref={sectionRefs[Section.Memories]}
          className="bg-slate-50 py-20 md:py-32 border-t border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 md:mb-20 space-y-4">
              <h2 className="text-4xl md:text-7xl font-bold text-slate-900 tracking-tighter font-serif italic">
                {t.memories_title}
              </h2>
              <p className="text-slate-400 font-medium text-lg">
                Voices from those whose lives he touched
              </p>
            </div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 md:gap-10 mb-16 md:mb-20">
                {memories.map((m) => (
                  <div key={m.id} className="masonry-item">
                    <MemoryCard memory={m} onClick={setSelectedMemory} />
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-center">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-4 px-10 md:px-14 py-4 md:py-6 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest text-[10px] md:text-[12px] shadow-2xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
              >
                <PlusIcon /> {t.memories_btn}
              </button>
            </div>
          </div>
        </section>

        {/* INTERVIEWS SECTION */}
        <section
          ref={sectionRefs[Section.Interviews]}
          className="py-20 md:py-32 bg-white border-b border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-6xl font-bold font-serif italic tracking-tight text-slate-900 mb-12 md:mb-16">
              {t.interviews_title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              {/* Interview Card 1 */}
              <div className="bg-slate-50 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-stretch w-full overflow-hidden">
                <p className="text-blue-600 font-black text-[10px] md:text-[12px] uppercase tracking-[0.4em] mb-4">
                  Democracy Now!
                </p>
                <h4 className="text-2xl md:text-3xl font-bold mb-6 font-serif italic">
                  The Man Who Swam to the East
                </h4>
                <p className="text-slate-600 text-base md:text-lg mb-8 leading-relaxed">
                  A feature interview on the legacy of the Cold War and his
                  pivotal 1952 decision to defect across the Danube.
                </p>

                {playingUrl === interview1Url && (
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
                        onChange={handleSeek}
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
                )}

                <div className="flex">
                  <button
                    onClick={() => handleToggleAudio(interview1Url)}
                    className={`text-[10px] md:text-[12px] font-black uppercase tracking-widest px-8 md:px-10 py-3 md:py-4 rounded-full transition-all shadow-lg active:scale-95 flex items-center gap-3 ${
                      playingUrl === interview1Url
                        ? "bg-blue-600 text-white"
                        : "border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    {playingUrl === interview1Url ? "Pause" : "Play Interview"}
                  </button>
                </div>
              </div>

              {/* Interview Card 2 */}
              <div className="bg-slate-50 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-stretch w-full overflow-hidden">
                <p className="text-blue-600 font-black text-[10px] md:text-[12px] uppercase tracking-[0.4em] mb-4">
                  Berliner Rundfunk
                </p>
                <h4 className="text-xl md:text-3xl font-bold mb-6 font-serif italic">
                  Victor Grossman Begegnungen mit Pete Seeger (1979)
                </h4>
                <p className="text-slate-600 text-base md:text-lg mb-8 leading-relaxed">
                  Historische Sendung: Victor Grossman im Gespräch über Pete
                  Seeger und die Kraft politischer Lieder.
                </p>

                {playingUrl === interview2Url && (
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
                        onChange={handleSeek}
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
                )}

                <div className="flex">
                  <button
                    onClick={() => handleToggleAudio(interview2Url)}
                    className={`text-[10px] md:text-[12px] font-black uppercase tracking-widest px-8 md:px-10 py-3 md:py-4 rounded-full transition-all shadow-lg active:scale-95 flex items-center gap-3 ${
                      playingUrl === interview2Url
                        ? "bg-blue-600 text-white"
                        : "border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    {playingUrl === interview2Url ? "Pause" : "Play Interview"}
                  </button>
                </div>
              </div>

              {/* Interview Card 3 - Video */}
              <div className="bg-slate-50 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-stretch w-full overflow-hidden md:col-span-2">
                <p className="text-blue-600 font-black text-[10px] md:text-[12px] uppercase tracking-[0.4em] mb-4">
                  Video Portrait
                </p>
                <h4 className="text-2xl md:text-3xl font-bold mb-6 font-serif italic">
                  Ein Leben für die Gerechtigkeit
                </h4>
                <div className="w-full rounded-2xl overflow-hidden shadow-lg bg-black aspect-video relative">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster="https://bilder.deutschlandfunk.de/FI/LE/_3/70/FILE_37094d6d0577fb2093d8e96b3ff84bd9/2630844420-victor-2019-jpg-100-1920x1080.jpg"
                  >
                    <source
                      src="https://ik.imagekit.io/mq26ahrml/VictorG_08052026.mp4?updatedAt=1770766503473"
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 pt-20 md:pt-32 pb-12 md:pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start mb-20 md:mb-32">
            <div className="md:col-span-5 space-y-8 md:space-y-10">
              <div className="flex items-center gap-4 md:gap-6">
                <h3 className="font-bold text-xl md:text-2xl text-slate-900 tracking-tighter">
                  Victor Grossman Archive
                </h3>
              </div>
              <p className="text-slate-500 text-xl md:text-2xl leading-relaxed font-serif italic max-w-md">
                {t.footer_tag}
              </p>
            </div>
            <div className="md:col-span-7 p-8 md:p-16 bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] shadow-xl">
              <p className="text-slate-600 text-xl md:text-3xl italic font-serif leading-snug mb-8">
                &ldquo;History is not just about what happened, but about who
                lived it and why their choices matter.&rdquo;
              </p>
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-8 md:w-10 h-[3px] bg-blue-600 rounded-full" />
                <p className="text-[10px] md:text-[12px] uppercase tracking-[0.4em] md:tracking-[0.5em] text-blue-600 font-black">
                  V. Grossman
                </p>
              </div>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-center md:text-left">
            <span>© {currentYear} • A Life in Service of Truth</span>
            <a
              href="https://samanthkumar.com"
              target="_blank"
              className="hover:text-blue-600 transition-colors"
            >
              Powered by samanthkumar.com
            </a>
          </div>
        </div>
      </footer>

      <TributeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitTribute}
      />
      <MemoryDetailModal
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
      />
      <ArticleReader
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />

      {selectedBulletin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedBulletin(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 md:p-10">
            <button
              onClick={() => setSelectedBulletin(null)}
              className="absolute top-4 right-4 md:top-5 md:right-5 w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:text-slate-900"
              aria-label="Close bulletin"
            >
              <svg
                className="w-5 h-5 mx-auto"
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

            <div className="mb-6 pr-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                  {selectedBulletin.bulletin_number || "Berlin Bulletin"}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {new Date(
                    selectedBulletin.published_date ||
                      selectedBulletin.created_at,
                  ).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-2xl md:text-4xl font-bold font-serif italic text-slate-900 leading-tight">
                {selectedBulletin.title}
              </h3>
            </div>

            <div className="h-1 w-20 bg-blue-600 rounded-full mb-8" />

            <div className="prose prose-slate max-w-none text-slate-800">
              <p className="whitespace-pre-line leading-relaxed text-base md:text-lg">
                {selectedBulletin.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
