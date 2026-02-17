import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Footer } from "./footer";
import { Header } from "./header";

export function NotFoundContent() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-6xl w-full mx-auto border-x border-neutral-100 bg-white flex items-center justify-center px-4 py-32">
        <div className="text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-neutral-400 mb-6">
            404
          </p>

          <h1 className="text-4xl sm:text-5xl font-serif text-neutral-900 mb-4">
            Page not found
          </h1>

          <p className="text-base text-neutral-500 max-w-sm mx-auto mb-10">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function NotFoundDocument() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <Footer />
    </div>
  );
}
