'use client'

import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: '#FBF6EC',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div className="text-center px-6">
        {/* Big ink blot */}
        <div className="mb-6 flex justify-center">
          <svg viewBox="0 0 120 120" className="w-32 h-32 opacity-80">
            <path
              d="M60 10 C 80 12 100 30 98 55 C 96 75 80 92 60 94 C 38 96 18 80 16 58 C 14 36 34 12 60 10 Z"
              fill="#312E81"
            />
            <text
              x="60"
              y="68"
              textAnchor="middle"
              fill="#FBF6EC"
              fontSize="36"
              fontFamily="'Fredoka', sans-serif"
              fontWeight="700"
            >
              403
            </text>
          </svg>
        </div>

        <h1
          style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700 }}
          className="text-4xl text-[#1B1830] mb-2"
        >
          Wrong room.
        </h1>
        <p className="text-[#5A5275] mb-8 text-lg">
          This area is for admins only. Your pencil doesn't have access here.
        </p>

        <Link
          href="/lobby"
          className="inline-flex items-center gap-2 bg-[#312E81] text-[#FBF6EC] px-6 py-3 rounded-2xl font-semibold shadow-[0_6px_0_-1px_#1F1B5C] hover:shadow-[0_8px_0_-1px_#1F1B5C] transition-shadow"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          Back to lobby
        </Link>
      </div>
    </div>
  )
}