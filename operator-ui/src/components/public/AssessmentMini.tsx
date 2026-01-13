'use client'

import { useState } from 'react'

interface Question {
  id: string
  label: string
  options: string[]
}

interface AssessmentMiniProps {
  questions: Question[]
  onComplete: (answers: Record<string, string>) => void
}

export default function AssessmentMini({ questions, onComplete }: AssessmentMiniProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)

  const handleAnswer = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      onComplete(newAnswers)
    }
  }

  if (currentQuestion >= questions.length) {
    return null
  }

  const question = questions[currentQuestion]

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {question.label}
        </h3>
        <div className="space-y-2">
          {question.options.map((option) => (
            <button
              key={option}
              onClick={() => handleAnswer(question.id, option)}
              className="block w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

