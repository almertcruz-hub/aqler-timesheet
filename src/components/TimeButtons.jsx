function TimeButtons({ onTimeIn, onTimeOut, onRequestOvertime, onLeaveRequest, activeTimeIn, isLoading }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

      {/* TIME IN */}
      <button
        onClick={onTimeIn}
        disabled={isLoading || !!activeTimeIn}
        className={`${
          isLoading || activeTimeIn
            ? "bg-slate-700 cursor-not-allowed p-6 rounded-2xl shadow-lg text-left border border-slate-800/20"
            : "bg-teal-600/80 hover:bg-teal-500/80 transition p-6 rounded-2xl shadow-lg text-left border border-teal-400/20"
        }`}
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#09e9da">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
          <h3 className="text-lg font-semibold">Time In</h3>
        </div>
        <p className="text-green-100 text-sm mt-1">Start your work session</p>
      </button>

      {/* TIME OUT */}
      <button
        onClick={onTimeOut}
        disabled={isLoading || !activeTimeIn}
        className={`${
          isLoading || !activeTimeIn
            ? "bg-slate-700 cursor-not-allowed p-6 rounded-2xl shadow-lg text-left border border-slate-800/20"
            : "bg-amber-600/80 hover:bg-amber-500/80 transition p-6 rounded-2xl shadow-lg text-left border border-amber-400/20"
        }`}
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
          </svg>
          <h3 className="text-lg font-semibold">Time Out</h3>
        </div>
        <p className="text-red-100 text-sm mt-1">End your work session</p>
      </button>

      {/* REQUEST OVERTIME */}
      <button
        onClick={onRequestOvertime}
        className="bg-green-600/80 hover:bg-green-500/80 transition p-6 rounded-2xl shadow-lg text-left border border-green-400/20"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <h3 className="text-lg font-semibold">Request Overtime</h3>
        </div>
        <p className="text-green-100 text-sm mt-1">Request additional hours</p>
      </button>

      {/* LEAVE REQUEST */}
      <button
        onClick={onLeaveRequest}
        className="bg-blue-600/80 hover:bg-blue-500/80 transition p-6 rounded-2xl shadow-lg text-left border border-blue-400/20"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h3 className="text-lg font-semibold">Request Leave</h3>
        </div>
        <p className="text-blue-100 text-sm mt-1">Request time off</p>
      </button>

    </div>
  )
}

export default TimeButtons