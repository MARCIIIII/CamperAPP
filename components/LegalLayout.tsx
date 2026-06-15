import Link from "next/link";

export default function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <Link href="/" className="text-green-200 hover:text-white text-sm">← Zurück</Link>
          <span className="text-green-400">/</span>
          <span className="font-semibold">{title}</span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10 prose prose-sm prose-gray
        prose-headings:text-gray-800 prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-2
        prose-p:text-gray-600 prose-p:leading-relaxed
        prose-li:text-gray-600 prose-a:text-green-700 prose-a:underline
        prose-h2:text-base prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-1">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
        {children}
      </article>
    </main>
  );
}
