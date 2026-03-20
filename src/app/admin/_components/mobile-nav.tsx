"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/tributes", label: "Tributes" },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/interviews", label: "Interviews" },
]

export function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()

  const value =
    items.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      ?.href ?? "/admin"

  return (
    <div className="md:hidden">
      <Select
        value={value}
        onValueChange={(next) => router.push(next)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Navigate" />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.href} value={i.href}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

