interface HeroSectionProps {
  headline: string
  subhead: string
  question?: string
}

export default function HeroSection({ headline, subhead, question }: HeroSectionProps) {
  return (
    <div className="bg-white py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 mb-5 leading-tight">
          {headline}
        </h1>
        <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed">
          {subhead}
        </p>
        {question && (
          <p className="text-lg text-gray-700 font-medium">
            {question}
          </p>
        )}
      </div>
    </div>
  )
}

