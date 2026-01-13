interface DisclosureBlockProps {
  text: string
}

export default function DisclosureBlock({ text }: DisclosureBlockProps) {
  return (
    <div className="bg-gray-50 border-t border-gray-200 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-600 leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  )
}

