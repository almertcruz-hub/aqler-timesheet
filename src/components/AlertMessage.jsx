import { Info } from 'lucide-react'

function AlertMessage({ message }) {
  if (!message) return null

  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
      <Info className="mt-0.5 shrink-0 text-amber-300" size={17} />
      {message}
    </div>
  )
}

export default AlertMessage
