import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useBrew } from '../context/BrewContext'
import DailyCup from '../components/DailyCup'
import EntryCard from '../components/EntryCard'
import { buildMonthMatrix, brewDaysInMonth, dayKey, entriesForDay } from '../utils/calendar'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export default function CalendarPage() {
  const { entries } = useBrew()
  const navigate = useNavigate()
  const today = new Date()
  const [viewMonth, setViewMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [selectedDate, setSelectedDate] = useState(today)

  const matrix = useMemo(
    () => buildMonthMatrix(viewMonth.year, viewMonth.month),
    [viewMonth],
  )
  const brewDays = useMemo(
    () => brewDaysInMonth(entries, viewMonth.year, viewMonth.month),
    [entries, viewMonth],
  )
  const selectedEntries = useMemo(
    () => entriesForDay(entries, selectedDate),
    [entries, selectedDate],
  )
  const selectedDayKey = dayKey(selectedDate.getTime())

  function shiftMonth(delta) {
    const next = new Date(viewMonth.year, viewMonth.month + delta, 1)
    const day = Math.min(selectedDate.getDate(), daysInMonth(next.getFullYear(), next.getMonth()))
    setViewMonth({ year: next.getFullYear(), month: next.getMonth() })
    setSelectedDate(new Date(next.getFullYear(), next.getMonth(), day))
  }

  function selectDay(date) {
    if (!date) return
    setSelectedDate(date)
    if (date.getFullYear() !== viewMonth.year || date.getMonth() !== viewMonth.month) {
      setViewMonth({ year: date.getFullYear(), month: date.getMonth() })
    }
  }

  return (
    <motion.main
      className="calendar-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="calendar-page__header">
        <button
          type="button"
          className="calendar-page__back"
          onClick={() => navigate('/')}
          aria-label="Back to feed"
        >
          ←
        </button>
        <h1 className="calendar-page__month">{monthLabel(viewMonth.year, viewMonth.month)}</h1>
        <div className="calendar-page__nav">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="calendar-page__weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
      </div>

      <div className="calendar-page__grid">
        {matrix.flat().map((cell, index) => {
          if (!cell.date) return <span key={`blank-${index}`} className="calendar-page__blank" />

          const day = cell.date.getDate()
          const selected = dayKey(cell.date.getTime()) === selectedDayKey
          const hasBrews = brewDays.has(day)
          return (
            <button
              key={cell.date.toISOString()}
              type="button"
              className="calendar-page__day"
              data-selected={selected}
              data-has-brews={hasBrews}
              onClick={() => selectDay(cell.date)}
              aria-label={`${cell.date.toLocaleDateString([], { month: 'long', day: 'numeric' })}${hasBrews ? ', has brews' : ''}`}
              aria-pressed={selected}
            >
              <span>{day}</span>
              {hasBrews && <i className="calendar-page__dot" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <DailyCup todayEntries={selectedEntries} streak={0} historical />

      {selectedEntries.length === 0 ? (
        <p className="calendar-page__empty">No brews logged on this day.</p>
      ) : (
        <div className="feed-page__list calendar-page__list">
          {selectedEntries.map((entry, index) => (
            <EntryCard key={entry.id} entry={entry} index={index} />
          ))}
        </div>
      )}
    </motion.main>
  )
}
