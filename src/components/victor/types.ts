export interface Memory {
  id: string;
  author: string;
  email?: string;
  date: string;
  message: string;
  initials: string;
  color: string;
  image?: string;
  is_verified?: boolean;
}

export interface ArchivePhoto {
  id: string;
  url: string;
  caption?: string;
  contributor: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
}

export interface Bulletin {
  id: string;
  bulletin_number?: string | null;
  title: string;
  content: string;
  published_date?: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  created_at: string;
  title: string;
  content: string;
  excerpt?: string;
  image_url?: string;
  category: string;
  author?: string;
  is_published: boolean;
}

export type InterviewMediaType = "audio" | "video";

export interface Interview {
  id: string;
  title: string;
  person: string;
  role?: string | null;
  content?: string | null;
  image_url?: string | null;
  media_type: InterviewMediaType;
  media_url: string;
  location_meta?: string | null;
  sort_order: number;
  created_at?: string;
}

export enum Section {
  Home = "home",
  Funeral = "funeral",
  Photos = "photos",
  Memories = "memories",
  Works = "works",
  Articles = "articles",
  Blogs = "blogs",
  Interviews = "interviews",
  Films = "films",
  About = "about",
}
