import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2 } from 'lucide-react'

export default function Classrooms() {
  const [rooms, setRooms] = useState([])
  const [activeTab, setActiveTab] = useState('classroom')
  const [newRoom, setNewRoom] = useState({ room_name: '', room_type: 'classroom', vtu_capacity: 30, internal_capacity: 40 })

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    const res = await axios.get('/classrooms')
    setRooms(res.data)
  }

  const handleAddRoom = async (e) => {
    e.preventDefault()
    await axios.post('/classrooms', { ...newRoom, room_type: activeTab })
    setNewRoom({ room_name: '', room_type: activeTab, vtu_capacity: 30, internal_capacity: activeTab === 'lab' ? 20 : 40 })
    fetchRooms()
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this room?')) {
      await axios.delete(`/classrooms/${id}`)
      fetchRooms()
    }
  }

  const handleUpdateCapacity = async (id, vtu, int) => {
    await axios.put(`/classrooms/${id}`, { vtu_capacity: vtu, internal_capacity: int })
    fetchRooms() // refresh, or just rely on local state if optimized
  }

  const filteredRooms = rooms.filter(r => r.room_type === activeTab)

  return (
    <div className="space-y-6">
      <div className="glass-card">
        <h2 className="text-xl font-bold mb-6">Facility Management</h2>
        
        <div className="flex space-x-2 border-b border-slate-800 mb-6">
          <button 
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'classroom' ? 'border-sky-400 text-sky-400' : 'border-transparent text-muted hover:text-slate-200'}`}
            onClick={() => { setActiveTab('classroom'); setNewRoom({...newRoom, internal_capacity: 40}); }}
          >
            Classrooms
          </button>
          <button 
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'lab' ? 'border-sky-400 text-sky-400' : 'border-transparent text-muted hover:text-slate-200'}`}
            onClick={() => { setActiveTab('lab'); setNewRoom({...newRoom, internal_capacity: 20}); }}
          >
            Laboratories
          </button>
        </div>

        <form onSubmit={handleAddRoom} className="flex gap-4 items-end mb-8 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Name / Number</label>
            <input type="text" required placeholder={activeTab === 'lab' ? 'e.g. ME001' : 'e.g. Room 51'} className="input-field" value={newRoom.room_name} onChange={e => setNewRoom({...newRoom, room_name: e.target.value})} />
          </div>
          <div className="w-32">
            <label className="block text-xs text-muted mb-1">VTU Cap</label>
            <input type="number" required className="input-field" value={newRoom.vtu_capacity} onChange={e => setNewRoom({...newRoom, vtu_capacity: parseInt(e.target.value)})} />
          </div>
          <div className="w-32">
            <label className="block text-xs text-muted mb-1">Internal Cap</label>
            <input type="number" required className="input-field" value={newRoom.internal_capacity} onChange={e => setNewRoom({...newRoom, internal_capacity: parseInt(e.target.value)})} />
          </div>
          <button type="submit" className="btn btn-primary"><Plus size={18} /> Add</button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredRooms.map(room => (
            <div key={room.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative group hover:border-sky-500/50 transition-colors">
              <button 
                onClick={() => handleDelete(room.id)}
                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
              
              <div className="font-bold text-accent mb-3 text-lg">{room.room_name}</div>
              
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-muted uppercase tracking-wider mb-1">VTU Capacity</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm focus:border-sky-400 focus:outline-none" 
                    defaultValue={room.vtu_capacity}
                    onBlur={e => handleUpdateCapacity(room.id, e.target.value, room.internal_capacity)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted uppercase tracking-wider mb-1">Internal Capacity</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm focus:border-sky-400 focus:outline-none" 
                    defaultValue={room.internal_capacity}
                    onBlur={e => handleUpdateCapacity(room.id, room.vtu_capacity, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          {filteredRooms.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted border border-dashed border-slate-700 rounded-xl">
              No {activeTab}s configured. Add one above.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
