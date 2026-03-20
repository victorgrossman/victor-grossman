"use client"

import * as React from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { FormProvider } from "react-hook-form"

export function Form<TFieldValues extends FieldValues>({
  form,
  children,
}: {
  form: UseFormReturn<TFieldValues>
  children: React.ReactNode
}) {
  return <FormProvider {...form}>{children}</FormProvider>
}

