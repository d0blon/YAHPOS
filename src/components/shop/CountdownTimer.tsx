"use client"

import { useState, useEffect } from 'react'

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 42,
    seconds: 18
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        } else {
          clearInterval(timer)
          return prev
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const padZero = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Vence en:</span>
      <div className="flex items-center gap-1 font-heading">
        <span className="bg-gray-950 text-white font-bold text-sm px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-800">
          {padZero(timeLeft.hours)}
        </span>
        <span className="text-gray-400 font-black text-sm">:</span>
        <span className="bg-gray-950 text-white font-bold text-sm px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-800">
          {padZero(timeLeft.minutes)}
        </span>
        <span className="text-gray-400 font-black text-sm">:</span>
        <span className="bg-gray-950 text-white font-bold text-sm px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-800">
          {padZero(timeLeft.seconds)}
        </span>
      </div>
    </div>
  )
}
