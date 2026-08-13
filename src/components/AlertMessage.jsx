function AlertMessage({ message }) {
  if (!message) return null
  return (
    <div className="mb-6 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
      {message}
    </div>
  )
}

export default AlertMessage