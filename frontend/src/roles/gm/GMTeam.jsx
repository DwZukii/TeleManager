import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { BarChart3, Users, Phone, PieChart as PieChartIcon } from 'lucide-react'

// Moved unchanged out of GMDashboard. Rebuilt in phase 6.
export default function GMTeam({ managersList, agentsList }) {
  const [managerSearch, setManagerSearch] = useState('')
  const [expandedManagers, setExpandedManagers] = useState({})

  const renderDirectoryTab = () => {
    const managers = managersList.filter(m => m.email.toLowerCase().includes(managerSearch.toLowerCase()));
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white border border-gray-100 rounded shadow-sm overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><span className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-blue-600 flex-shrink-0"><Users className="w-5 h-5" /></span> Manager Directory</h3><p className="text-xs text-gray-400 font-medium mt-0.5">{managers.length} managers</p></div>
            <div className="relative w-full sm:w-56 flex-shrink-0"><input type="text" placeholder="Search managers..." value={managerSearch} onChange={e => setManagerSearch(e.target.value)} className="w-full pl-4 pr-4 py-2 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white font-medium" /></div>
          </div>
          <div className="p-4 sm:p-6">
            {managers.length === 0 ? (<div className="text-center py-8"><p className="font-bold text-gray-500">No managers found.</p></div>) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map(m => {
                  const team = agentsList.filter(a => a.manager_email === m.email);
                  return (
                    <div key={m.id} className="bg-white border-2 border-gray-100 rounded overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-300">
                      <div className="p-5 border-b border-blue-100 bg-blue-50/40">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl uppercase shadow-sm flex-shrink-0">{m.email.charAt(0)}</div>
                          <div className="min-w-0">
                            {m.full_name && <h4 className="font-extrabold text-gray-900 text-lg truncate leading-tight">{m.full_name}</h4>}
                            <p className={`text-sm truncate font-bold text-gray-500 ${!m.full_name && 'text-lg text-gray-900'}`}>{m.email}</p>
                          </div>
                        </div>
                        {m.contact_number ? (<a href={`tel:${m.contact_number}`} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-sm border border-indigo-100 w-full justify-center"><Phone className="w-4 h-4" />{m.contact_number}</a>) : (<div className="inline-flex items-center gap-1.5 text-sm text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-sm border border-gray-200 w-full justify-center">No contact number</div>)}
                      </div>
                      <div className="p-4 bg-white">
                        {team.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-3">No staff assigned.</p> : (() => {
                          const isExpanded = expandedManagers[m.id];
                          const visibleTeam = isExpanded ? team : team.slice(0, 3);
                          const hasMore = team.length > 3;
                          return (
                            <>
                              <div className="grid grid-cols-1 gap-2">{visibleTeam.map((a) => (<div key={a.id} className="flex items-center gap-3 p-3 rounded bg-gray-50 w-full text-left"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-sm uppercase flex-shrink-0">{a.email.charAt(0)}</div><p className="text-sm font-medium text-gray-700 truncate">{a.email}</p></div>))}</div>
                              {hasMore && (<button onClick={() => setExpandedManagers(prev => ({...prev, [m.id]: !prev[m.id]}))} className="w-full mt-3 py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-sm border border-gray-100 hover:border-indigo-100 transition-colors flex items-center justify-center shadow-sm">{isExpanded ? 'Hide Staff \u2191' : `View All ${team.length} Staff \u2193`}</button>)}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }


  return renderDirectoryTab()
}
