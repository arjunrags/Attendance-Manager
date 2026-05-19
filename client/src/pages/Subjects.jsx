import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Edit2 } from 'lucide-react'

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [scheme, setScheme] = useState('2022 Scheme')
  const [semester, setSemester] = useState('1')
  
  const [newSubject, setNewSubject] = useState({ subject_code: '', subject_name: '' })
  const [editingId, setEditingId] = useState(null)
  const [editSubject, setEditSubject] = useState({ subject_code: '', subject_name: '' })

  useEffect(() => {
    fetchSubjects()
  }, [scheme, semester])

  const fetchSubjects = async () => {
    const res = await axios.get(`/subjects?scheme=${scheme}&semester=${semester}`)
    setSubjects(res.data)
  }

  const handleAddSubject = async (e) => {
    e.preventDefault()
    if (!newSubject.subject_code || !newSubject.subject_name) return;
    
    await axios.post('/subjects', { 
        ...newSubject, 
        scheme, 
        semester: parseInt(semester) 
    })
    setNewSubject({ subject_code: '', subject_name: '' })
    fetchSubjects()
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this subject?')) {
      await axios.delete(`/subjects/${id}`)
      fetchSubjects()
    }
  }

  const startEdit = (sub) => {
    setEditingId(sub.id)
    setEditSubject({ subject_code: sub.subject_code, subject_name: sub.subject_name })
  }

  const handleSaveEdit = async () => {
    await axios.put(`/subjects/${editingId}`, {
      ...editSubject,
      scheme,
      semester: parseInt(semester)
    })
    setEditingId(null)
    fetchSubjects()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="glass-card">
        <h2 className="text-xl font-bold mb-6">Subject Database</h2>
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm text-muted mb-1">Scheme</label>
            <input 
              type="text" 
              className="input-field" 
              value={scheme} 
              onChange={e => setScheme(e.target.value)}
              placeholder="e.g. 2022 Scheme"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-muted mb-1">Semester</label>
            <input 
              type="number" 
              min="1" max="8"
              className="input-field" 
              value={semester} 
              onChange={e => setSemester(e.target.value)}
            />
          </div>
        </div>

        <form onSubmit={handleAddSubject} className="flex gap-4 items-end mb-8 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
          <div className="w-32">
            <label className="block text-xs text-muted mb-1">Subject Code</label>
            <input type="text" required className="input-field" value={newSubject.subject_code} onChange={e => setNewSubject({...newSubject, subject_code: e.target.value})} placeholder="e.g. 22MAT11" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">Subject Name</label>
            <input type="text" required className="input-field" value={newSubject.subject_name} onChange={e => setNewSubject({...newSubject, subject_name: e.target.value})} placeholder="e.g. Engineering Mathematics" />
          </div>
          <button type="submit" className="btn btn-primary"><Plus size={18} /> Add</button>
        </form>

        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-muted">
              <tr>
                <th className="p-3 font-medium w-32">Code</th>
                <th className="p-3 font-medium">Subject Name</th>
                <th className="p-3 font-medium w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {subjects.map(s => (
                <tr key={s.id} className="hover:bg-slate-800/20 group">
                  <td className="p-3 font-mono text-accent">
                    {editingId === s.id ? (
                      <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none" value={editSubject.subject_code} onChange={e => setEditSubject({...editSubject, subject_code: e.target.value})} />
                    ) : s.subject_code}
                  </td>
                  <td className="p-3 text-slate-200">
                    {editingId === s.id ? (
                      <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none" value={editSubject.subject_name} onChange={e => setEditSubject({...editSubject, subject_name: e.target.value})} />
                    ) : s.subject_name}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {editingId === s.id ? (
                      <button onClick={handleSaveEdit} className="text-emerald-400 hover:text-emerald-300">Save</button>
                    ) : (
                      <>
                        <button onClick={() => startEdit(s)} className="text-slate-500 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(s.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && (
                <tr><td colSpan="3" className="p-4 text-center text-muted">No subjects found for this scheme/semester. Add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
