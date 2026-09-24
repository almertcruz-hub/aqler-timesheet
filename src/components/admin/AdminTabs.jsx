import { Bell, Clock3 } from 'lucide-react'

function AdminTabs({ displayedTab, onChange }) {
  return (
    <div className="mb-6 inline-flex rounded-xl border border-slate-800 bg-slate-900/70 p-1">
      <button
        type="button"
        onClick={() => onChange('logs')}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
          displayedTab === 'logs'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <Clock3 size={16} />
        Work logs
      </button>

      <button
        type="button"
        onClick={() => onChange('reminders')}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
          displayedTab === 'reminders'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <Bell size={16} />
        Email reminders
      </button>
    </div>
  )
}

export default AdminTabs
