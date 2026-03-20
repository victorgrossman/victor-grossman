import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Memorial Admin CMS</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Sign in to manage Photos, Tributes, Books, Articles and Interviews.
          </p>
          <Button asChild className="w-full sm:w-fit" variant="secondary">
            <Link href="/admin">Go to admin</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
