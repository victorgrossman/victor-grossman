import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "./login-form"

export default function AdminLoginPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}

