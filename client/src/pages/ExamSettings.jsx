import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus } from 'lucide-react'

export default function ExamSettings() {
  const [exams, setExams] = useState([])
  const [formData, setFormData] = useState({
    exam_type: 'IAT',
    exam_name: '',
    semester: '1',
    start_date: '',
    end_date: '',
    exams_per_day: 2 // default for IAT
  })
  
  // Schedule builder states
  const [activeExam, setActiveExam] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [semesterSubjects, setSemesterSubjects] = useState([])
  const [newSchedule, setNewSchedule] = useState({
    exam_date: '',
    session: '08:30 AM - 10:00 AM',
    subject_id: ''
  })
  const [isCustom, setIsCustom] = useState(false)
  const [customSession, setCustomSession] = useState('')
  
  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    const res = await axios.get('/exams')
    setExams(res.data)
  }

  const handleTypeChange = (type) => {
    let perDay = 1;
    if (type === 'IAT') perDay = 2;
    if (type === 'VTU') perDay = 1;
    if (type === 'TYL') perDay = 1;
    setFormData({ ...formData, exam_type: type, exams_per_day: perDay })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Default times since they are set at the schedule slot level
    const start_time = '09:00'
    const duration = '3'
    const end_time = '12:00'
    
    await axios.post('/exams', { ...formData, start_time, duration, end_time })
    setFormData({ ...formData, exam_name: '' })
    fetchExams()
  }

  const getAvailableSlots = () => {
    return [
      { label: 'Morning Slot 1 (08:30 AM - 10:00 AM)', value: '08:30 AM - 10:00 AM' },
      { label: 'Morning Slot 2 (10:15 AM - 11:45 AM)', value: '10:15 AM - 11:45 AM' },
      { label: 'Afternoon Slot 1 (12:15 PM - 01:45 PM)', value: '12:15 PM - 01:45 PM' },
      { label: 'Afternoon Slot 2 (02:00 PM - 03:30 PM)', value: '02:00 PM - 03:30 PM' },
      { label: '-- Add Custom Slot --', value: 'CUSTOM' }
    ]
  }

  const selectExamForSchedule = async (exam) => {
    setActiveExam(exam)
    setIsCustom(false)
    setCustomSession('')
    setNewSchedule({
      exam_date: exam.start_date,
      session: '08:30 AM - 10:00 AM',
      subject_id: ''
    })
    
    // Fetch subjects for that semester
    const subjectsRes = await axios.get(`/subjects?semester=${exam.semester || 1}`)
    setSemesterSubjects(subjectsRes.data)
    if (subjectsRes.data.length > 0) {
      setNewSchedule(prev => ({ 
        ...prev, 
        subject_id: subjectsRes.data[0].id,
        session: '08:30 AM - 10:00 AM'
      }))
    }

    // Fetch existing schedule
    fetchSchedule(exam.id)
  }

  const fetchSchedule = async (examId) => {
    const res = await axios.get(`/exams/${examId}/schedule`)
    setSchedule(res.data)
  }

  const handleAddSchedule = async (e) => {
    e.preventDefault()
    if (!newSchedule.subject_id || !newSchedule.exam_date) return;
    
    const payload = {
      ...newSchedule,
      session: isCustom ? customSession : newSchedule.session
    }
    
    await axios.post(`/exams/${activeExam.id}/schedule`, payload)
    setIsCustom(false)
    setCustomSession('')
    fetchSchedule(activeExam.id)
  }

  const handleDeleteSchedule = async (id) => {
    await axios.delete(`/exams/schedule/${id}`)
    fetchSchedule(activeExam.id)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="glass-card">
        <h2 className="text-xl font-bold mb-4">Create New Exam</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1">Exam Type</label>
              <select 
                className="input-field"
                value={formData.exam_type}
                onChange={e => handleTypeChange(e.target.value)}
              >
                <option value="IAT">IAT (Internal Assessment Test)</option>
                <option value="VTU">VTU (University Exam)</option>
                <option value="TYL">TYL (Test Your Learning)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-muted mb-1">Semester</label>
              <select 
                className="input-field"
                value={formData.semester}
                onChange={e => setFormData({ ...formData, semester: e.target.value })}
              >
                {[1,2,3,4,5,6,7,8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-muted mb-1">Exams Per Day</label>
              <input 
                type="number" min="1"
                className="input-field disabled:opacity-50"
                value={formData.exams_per_day}
                onChange={e => setFormData({ ...formData, exams_per_day: parseInt(e.target.value) })}
                disabled={formData.exam_type === 'VTU'}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-muted mb-1">Exam Name</label>
              <input 
                type="text" required
                className="input-field"
                value={formData.exam_name}
                onChange={e => setFormData({ ...formData, exam_name: e.target.value })}
                placeholder="e.g. Even Semester IAT 1"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Start Date</label>
              <input type="date" required className="input-field" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">End Date</label>
              <input type="date" required className="input-field" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
            
          </div>
          <div className="pt-2">
            <button type="submit" className="btn btn-primary w-full"><Plus size={18} /> Create Exam Event</button>
          </div>
        </form>
      </div>

      <div className="glass-card">
        <h2 className="text-xl font-bold mb-2">Recent Exams</h2>
        <p className="text-xs text-muted mb-4">Click on any exam below to manage its daily subject schedule.</p>
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-muted">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Semester</th>
                <th className="p-3 font-medium">Dates</th>
                <th className="p-3 font-medium">Exams/Day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {exams.map(e => (
                <tr 
                  key={e.id} 
                  onClick={() => selectExamForSchedule(e)}
                  className={`cursor-pointer transition-colors ${activeExam?.id === e.id ? 'bg-sky-950/40 border-l-2 border-sky-500' : 'hover:bg-slate-800/20'}`}
                >
                  <td className="p-3 text-slate-200 font-medium">{e.exam_name}</td>
                  <td className="p-3 text-accent">{e.exam_type}</td>
                  <td className="p-3 text-slate-300">Semester {e.semester || '1'}</td>
                  <td className="p-3">{e.start_date} to {e.end_date}</td>
                  <td className="p-3">{e.exams_per_day}</td>
                </tr>
              ))}
              {exams.length === 0 && (
                <tr><td colSpan="6" className="p-4 text-center text-muted">No exams configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeExam && (
        <div className="glass-card border border-sky-900/50">
          <h2 className="text-xl font-bold text-sky-400 mb-2">Daily Schedule Builder</h2>
          <p className="text-xs text-muted mb-6">Define which subjects are examined on which dates for <span className="text-slate-200 font-semibold">{activeExam.exam_name}</span> (Semester {activeExam.semester}).</p>

          <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8 bg-slate-900/40 p-4 rounded-lg border border-slate-800">
            <div>
              <label className="block text-xs text-muted mb-1">Exam Date</label>
              <input 
                type="date" 
                required 
                min={activeExam.start_date}
                max={activeExam.end_date}
                className="input-field" 
                value={newSchedule.exam_date} 
                onChange={e => setNewSchedule({ ...newSchedule, exam_date: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Time Slot</label>
              <select 
                required 
                className="input-field" 
                value={newSchedule.session} 
                onChange={e => {
                  const val = e.target.value;
                  setIsCustom(val === 'CUSTOM');
                  setNewSchedule({ ...newSchedule, session: val });
                }} 
              >
                {getAvailableSlots().map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
              {isCustom && (
                <div className="mt-2">
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter Custom Slot (e.g. 04:00 PM - 05:30 PM)" 
                    className="input-field border-sky-500 bg-sky-950/20" 
                    value={customSession} 
                    onChange={e => setCustomSession(e.target.value)} 
                  />
                </div>
              )}
            </div>
            <div className="col-span-1 md:col-span-2 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Subject</label>
                <select 
                  className="input-field" 
                  value={newSchedule.subject_id} 
                  onChange={e => setNewSchedule({ ...newSchedule, subject_id: e.target.value })}
                >
                  {semesterSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.subject_code} - {sub.subject_name}</option>
                  ))}
                  {semesterSubjects.length === 0 && <option value="">No subjects found for Semester {activeExam.semester}</option>}
                </select>
              </div>
              <button type="submit" disabled={semesterSubjects.length === 0} className="btn btn-primary py-2 px-4 whitespace-nowrap">Add Slot</button>
            </div>
          </form>

          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-muted">
                <tr>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Slot</th>
                  <th className="p-3 font-medium">Subject Code</th>
                  <th className="p-3 font-medium">Subject Name</th>
                  <th className="p-3 font-medium text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {schedule.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/20 group">
                    <td className="p-3 text-slate-200">{s.exam_date}</td>
                    <td className="p-3 text-accent font-medium">{s.session}</td>
                    <td className="p-3 font-mono text-sky-400">{s.subject_code}</td>
                    <td className="p-3 text-slate-300">{s.subject_name}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleDeleteSchedule(s.id)} 
                        className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {schedule.length === 0 && (
                  <tr><td colSpan="5" className="p-4 text-center text-muted">No schedule items added yet. Add them above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
