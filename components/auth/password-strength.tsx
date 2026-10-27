'use client'

import { useEffect, useState } from 'react'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0)
  const [feedback, setFeedback] = useState<string[]>([])

  useEffect(() => {
    if (!password) {
      setStrength(0)
      setFeedback([])
      return
    }

    let score = 0
    const newFeedback: string[] = []

    // Length checks
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (password.length >= 16) score++

    // Character variety
    if (/[a-z]/.test(password)) score++
    else newFeedback.push('Thêm chữ cái thường')

    if (/[A-Z]/.test(password)) score++
    else newFeedback.push('Thêm chữ cái hoa')

    if (/[0-9]/.test(password)) score++
    else newFeedback.push('Thêm số')

    if (/[^a-zA-Z0-9]/.test(password)) score++
    else newFeedback.push('Thêm ký tự đặc biệt')

    // Common patterns
    if (!/(.)\1{2,}/.test(password)) score++
    else newFeedback.push('Tránh ký tự lặp lại')

    setStrength(Math.min(score, 5))
    setFeedback(newFeedback)
  }, [password])

  if (strength === 0) return null

  const strengthLevels = ['rất yếu', 'yếu', 'trung bình', 'mạnh', 'rất mạnh']
  const strengthColors = ['bg-error', 'bg-warning', 'bg-yellow-500', 'bg-success', 'bg-success']
  const strengthTextColors = ['text-error', 'text-warning', 'text-yellow-600 dark:text-yellow-400', 'text-success', 'text-success']

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < strength ? strengthColors[strength - 1] : 'bg-muted/30'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${strengthTextColors[strength - 1]}`}>
          {strengthLevels[strength - 1]}
        </span>
      </div>

      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1 ml-1">
          {feedback.map((tip, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="text-warning">•</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
