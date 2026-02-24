import { Link } from "@tanstack/react-router";

import { Footer } from "./footer";
import { Header } from "./header";

export function NotFoundContent() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-[60vh]"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white min-h-full flex items-center justify-center px-4 py-20">
        <div className="text-center">
          <h1 className="text-3xl font-medium text-neutral-700 mb-4 font-serif">
            Page Not Found
          </h1>

          <div className="text-[200px] leading-none font-serif text-neutral-800 mb-8">
            404
          </div>

          <p className="text-base text-neutral-600 max-w-md mx-auto mb-8">
            We couldn't find the page you were looking for. If you think this is
            an error, you can{" "}
            <a
              href="mailto:support@hyprnote.com"
              className="text-stone-700 underline hover:text-stone-900 transition-colors"
            >
              let us know
            </a>
            .
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Go back home
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
