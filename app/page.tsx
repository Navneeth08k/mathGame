import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Home() {
  const supabase = getSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Math Battle
              </Link>
            </div>

            <nav className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md">
                Login
              </Link>
              <Link href="/signup" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md">
                Sign Up
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-12 md:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6">Challenge Your Math Skills in Real-Time Battles</h1>
                <p className="text-lg text-gray-600 mb-8">
                  Compete against friends or random opponents in fast-paced math challenges. Improve your skills, climb
                  the leaderboard, and become a Math Battle champion!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild size="lg" className="text-lg">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg">
                    <Link href="/leaderboard">View Leaderboard</Link>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="bg-blue-100 p-8 rounded-lg shadow-lg max-w-md w-full">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Sample Problem</h2>
                    <p className="text-gray-600">How fast can you solve this?</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg mb-6 text-center">
                    <p className="text-3xl font-bold text-blue-800">12 × 8 = ?</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Time remaining: 00:05</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                      <div className="bg-blue-600 h-2.5 rounded-full w-1/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
                <p className="text-gray-600">
                  Create your account and set up your profile to start your math battle journey.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Find Opponents</h3>
                <p className="text-gray-600">
                  Use quick matchmaking to find random opponents or challenge your friends directly.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Battle & Climb</h3>
                <p className="text-gray-600">
                  Solve math problems faster than your opponent, win matches, and climb the leaderboard.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} Math Battle. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
