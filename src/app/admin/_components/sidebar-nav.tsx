"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

import {
  BookOpen,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Mic,
  Newspaper,
  MessageSquareText,
} from "lucide-react"

type NavLink = { href: string; label: string }

const iconByHref: Record<string, React.ComponentType<{ className?: string }>> =
  {
    "/admin": LayoutDashboard,
    "/admin/photos": ImageIcon,
    "/admin/tributes": MessageSquareText,
    "/admin/books": BookOpen,
    "/admin/articles": Newspaper,
    "/admin/interviews": Mic,
  }

export function SidebarNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname()

  return (
    <nav className="mt-6 flex flex-col gap-1">
      {links.map((l) => {
        const Icon = iconByHref[l.href] ?? FileText
        const isActive =
          l.href === "/admin"
            ? pathname === "/admin"
            : pathname === l.href || pathname.startsWith(l.href + "/")

        return (
          <Button
            key={l.href}
            variant={isActive ? "secondary" : "ghost"}
            asChild
            className="h-14 justify-start gap-3 rounded-xl px-5 text-foreground hover:text-foreground"
          >
            <Link href={l.href} aria-current={isActive ? "page" : undefined}>
              <Icon className="size-5 opacity-90" />
              <span className="text-base font-medium">{l.label}</span>
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

