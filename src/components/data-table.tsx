"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type DataTableColumn<T> = {
  key: string
  header: string
  sortable?: boolean
  sortValue?: (row: T) => string | number
  /** Applied to `<th>` and `<td>` for this column (width, alignment) */
  columnClassName?: string
  render: (row: T, index: number) => React.ReactNode
}

export function DataTable<T>({
  data,
  columns,
  tableClassName,
}: {
  data: T[]
  columns: DataTableColumn<T>[]
  /** Applied to the inner `<table>` element */
  tableClassName?: string
}) {
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")

  const sorted = React.useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortable || !col.sortValue) return data

    const copied = [...data]
    copied.sort((a, b) => {
      const av = col.sortValue?.(a)
      const bv = col.sortValue?.(b)
      if (av === bv) return 0
      if (av === undefined || bv === undefined) return 0
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === "asc" ? cmp : -cmp
    })

    return copied
  }, [columns, data, sortDir, sortKey])

  return (
    <Table className={cn(tableClassName)}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.columnClassName}>
              {col.sortable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    if (sortKey === col.key) {
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                    } else {
                      setSortKey(col.key)
                      setSortDir("asc")
                    }
                  }}
                >
                  <span className="mr-1">{col.header}</span>
                  {sortKey === col.key ? (
                    sortDir === "asc" ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )
                  ) : null}
                </Button>
              ) : (
                col.header
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row, idx) => (
          <TableRow key={idx}>
            {columns.map((col) => (
              <TableCell key={col.key} className={col.columnClassName}>
                {col.render(row, idx)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

