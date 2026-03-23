'use client'

import { useState, useEffect } from 'react'
import { getLevelInfo, BADGE_CONFIG, type BadgeType } from '@/lib/gamification-config'

interface GamificationData {
  xp: number
  streak_days: number
  badges: Array<{ badge_type: string; earned_at: string }>
}

export default function GamificationWidget() {
  const [data, setData] = useState<GamificationData | null>(null)

  useEffect(() => {
    fetch('/api/gamification')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))
  }, [])

  if (!data) return null

  const { current, next, progressXp, totalXp, progressPct } = getLevelInfo(data.xp)
  const badgeTypes = Object.keys(BADGE_CONFIG) as BadgeType[]
  const earnedSet = new Set(data.badges.map(b => b.badge_type))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      {/* XP bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-blue-700">Lv.{current.level}</span>
            <span className="text-sm font-semibold text-gray-700">{current.title}</span>
          </div>
          <span className="text-xs text-gray-400 font-medium">{data.xp} XP total</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {next && (
          <p className="text-xs text-gray-400 mt-1.5">
            {progressXp} / {totalXp} XP to <span className="font-medium text-gray-500">Lv.{next.level} {next.title}</span>
          </p>
        )}
      </div>

      {/* Streak */}
      {data.streak_days > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
          <span className="text-lg">🔥</span>
          <div>
            <p className="text-sm font-bold text-orange-700">{data.streak_days}-day streak!</p>
            <p className="text-xs text-orange-500">Keep submitting daily to grow it</p>
          </div>
        </div>
      )}

      {/* Badges */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Badges</p>
        <div className="grid grid-cols-2 gap-2">
          {badgeTypes.map(type => {
            const cfg = BADGE_CONFIG[type]
            const earned = earnedSet.has(type)
            return (
              <div
                key={type}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition ${
                  earned
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-100 opacity-50 grayscale'
                }`}
              >
                <span className="text-xl">{cfg.emoji}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold leading-tight ${earned ? 'text-gray-900' : 'text-gray-500'}`}>
                    {cfg.label}
                  </p>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5 truncate">{cfg.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
