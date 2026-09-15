import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

function ThemeToggle() {
  const [isLight, setIsLight] = useState(() =>
    document.documentElement.classList.contains('light')
  )

  function toggleTheme() {
    const nextIsLight = !isLight

    document.documentElement.classList.toggle('light', nextIsLight)
    document.documentElement.style.colorScheme = nextIsLight ? 'light' : 'dark'
    localStorage.setItem('timesheet-theme', nextIsLight ? 'light' : 'dark')
    setIsLight(nextIsLight)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Use dark theme' : 'Use light theme'}
      title={isLight ? 'Use dark theme' : 'Use light theme'}
      className="fixed bottom-4 right-4 z-[100] inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
    >
      {isLight ? <Moon size={19} /> : <Sun size={19} />}
    </button>
  )
}

export default ThemeToggle
