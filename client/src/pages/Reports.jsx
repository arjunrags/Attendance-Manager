import { useState, useEffect } from 'react'
import axios from 'axios'
import { Upload, Download, RefreshCw, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Reports() {
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [floorsConfig, setFloorsConfig] = useState([{ f: 1, g: ['CSE', 'ISE'] }, { f: 2, g: ['ECE', 'ME'] }])
  const [studentList, setStudentList] = useState([])
  const [seatingPlan, setSeatingPlan] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Dynamic generation options
  const [useClassrooms, setUseClassrooms] = useState(true)
  const [useLabs, setUseLabs] = useState(false)
  const [singleSeating, setSingleSeating] = useState(false)

  const sanitizeFilename = (value) => {
    const sanitized = String(value || '')
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')

    return sanitized || 'Exam'
  }
  const [classCapOverride, setClassCapOverride] = useState('')
  const [labCapOverride, setLabCapOverride] = useState('')

  // Schedule and Seating states
  const [schedule, setSchedule] = useState([])
  const [selectedScheduleId, setSelectedScheduleId] = useState('')

  // Manual fallback inputs (when schedule is empty)
  const [manualSubjectId, setManualSubjectId] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [manualSession, setManualSession] = useState('09:00 - 12:00')
  const [semesterSubjects, setSemesterSubjects] = useState([])

  useEffect(() => {
    axios.get('/exams').then(res => {
      setExams(res.data)
      if (res.data.length > 0) {
        setSelectedExam(res.data[0].id)
        applyExamDefaults(res.data[0])
      }
    })
  }, [])

  const applyExamDefaults = (exam) => {
    if (!exam) return;
    if (exam.exam_type === 'IAT') {
      setUseClassrooms(true)
      setUseLabs(false)
      setSingleSeating(false)
    } else if (exam.exam_type === 'VTU') {
      setUseClassrooms(true)
      setUseLabs(false)
      setSingleSeating(true)
    } else if (exam.exam_type === 'TYL') {
      setUseClassrooms(false)
      setUseLabs(true)
      setSingleSeating(false)
    }
  }

  const handleExamChange = (examId) => {
    setSelectedExam(examId)
    const exam = exams.find(e => e.id === parseInt(examId))
    applyExamDefaults(exam)
  }

  useEffect(() => {
    if (selectedExam) {
      // 1. Fetch saved seating
      axios.get(`/seating/load/${selectedExam}`).then(res => {
        setSeatingPlan(res.data.seatingPlan || [])
      }).catch(() => setSeatingPlan([]))

      // 2. Fetch configured schedule
      axios.get(`/exams/${selectedExam}/schedule`).then(res => {
        setSchedule(res.data)
        if (res.data.length > 0) {
          setSelectedScheduleId(res.data[0].id)
        } else {
          setSelectedScheduleId('')
        }
      }).catch(() => setSchedule([]))

      // 3. Fetch subjects for this exam's semester for manual override
      const exam = exams.find(e => e.id === parseInt(selectedExam))
      if (exam) {
        axios.get(`/subjects?semester=${exam.semester || 1}`).then(res => {
          setSemesterSubjects(res.data)
          if (res.data.length > 0) {
            setManualSubjectId(res.data[0].id)
          } else {
            setManualSubjectId('')
          }
        }).catch(() => setSemesterSubjects([]))
        
        setManualDate(exam.start_date || '')
        setManualSession(`${exam.start_time || '09:00'} - ${exam.end_time || '12:00'}`)
      }
    }
  }, [selectedExam, exams])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target.result
        const rows = text.split('\n').filter(r => r.trim())
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase())
        
        const usnIdx = headers.findIndex(h => h.includes('usn'))
        const nameIdx = headers.findIndex(h => h.includes('name'))
        const deptIdx = headers.findIndex(h => h.includes('dept') || h.includes('branch'))
        const semIdx = headers.findIndex(h => h.includes('sem'))
        
        const data = rows.slice(1).map(row => {
          const cols = row.split(',').map(c => c.trim())
          const usn = cols[usnIdx] || ''
          
          let extractedDept = (deptIdx !== -1 && cols[deptIdx]) ? cols[deptIdx].trim() : 'Unknown'
          let extractedSem = (semIdx !== -1 && cols[semIdx]) ? cols[semIdx].trim() : ''
          
          // Smart USN parsing fallback (e.g. 1CR25CS001, 1cr24is045, or 24cs001)
          const cleanUsn = usn.trim().toUpperCase()
          const match = cleanUsn.match(/[A-Z0-9]*?(\d{2})([A-Z]{2,4})(\d+)/)
          if (match) {
            const year = parseInt(match[1])
            const deptCode = match[2]
            
            if (!extractedSem) {
              // Map year to starting semester of that year group
              if (year === 25) extractedSem = '1' // 1st year (Sem 1 & 2)
              else if (year === 24) extractedSem = '3' // 2nd year (Sem 3 & 4)
              else if (year === 23) extractedSem = '5' // 3rd year (Sem 5 & 6)
              else if (year === 22) extractedSem = '7' // 4th year (Sem 7 & 8)
              else extractedSem = '1' // fallback
            }
            
            if (extractedDept === 'Unknown' || !extractedDept) {
              if (deptCode === 'CS' || deptCode === 'CSE') extractedDept = 'CSE'
              else if (deptCode === 'IS' || deptCode === 'ISE') extractedDept = 'ISE'
              else if (deptCode === 'EC' || deptCode === 'ECE') extractedDept = 'ECE'
              else if (deptCode === 'ME') extractedDept = 'ME'
              else if (deptCode === 'CV') extractedDept = 'CV'
              else extractedDept = deptCode // fallback to raw code
            }
          }
          
          // Ensure fallbacks are set
          if (!extractedSem) extractedSem = '1'
          if (!extractedDept) extractedDept = 'Unknown'
          
          return {
            u: usn,
            n: cols[nameIdx] || '',
            g: extractedDept,
            s: extractedSem
          }
        }).filter(s => s.u)
        
        setStudentList(data)
        setError('')
      } catch (err) {
        setError('Error parsing CSV. Ensure it has USN, Name, and Dept columns.')
      }
    }
    reader.readAsText(file)
  }

  const handleGenerate = async () => {
    if (!selectedExam || studentList.length === 0) return
    setLoading(true)
    setError('')
    
    try {
      const exam = exams.find(e => e.id === parseInt(selectedExam))
      
      // Filter student list to ONLY include same academic year group students
      const filteredStudents = studentList.filter(s => {
        const studentSemVal = parseInt(s.s || 1)
        const examSemVal = parseInt(exam.semester || 1)
        
        // Year groups mapping:
        // Sem 1 & 2 -> Year Group 1 (admitted 25)
        // Sem 3 & 4 -> Year Group 2 (admitted 24)
        // Sem 5 & 6 -> Year Group 3 (admitted 23)
        // Sem 7 & 8 -> Year Group 4 (admitted 22)
        const studentYearGroup = Math.ceil(studentSemVal / 2)
        const examYearGroup = Math.ceil(examSemVal / 2)
        
        return studentYearGroup === examYearGroup
      })

      if (filteredStudents.length === 0) {
        setError(`No students loaded match the exam's semester (Semester ${exam.semester || 1})`)
        setLoading(false)
        return
      }

      const allowedRoomTypes = [];
      if (useClassrooms) allowedRoomTypes.push('classroom');
      if (useLabs) allowedRoomTypes.push('lab');
      
      const res = await axios.post('/seating/generate', {
        examId: exam.id,
        examType: exam.exam_type,
        studentList: filteredStudents,
        floorsConfig,
        options: {
          allowedRoomTypes,
          singleSeating,
          capacityOverrides: {
            classroom: classCapOverride || undefined,
            lab: labCapOverride || undefined
          }
        }
      })
      setSeatingPlan(res.data.seatingPlan)
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = () => {
    if (seatingPlan.length === 0) return
    
    const exam = exams.find(e => e.id === parseInt(selectedExam))
    let subjectCode = 'N/A'
    let subjectName = 'N/A'
    let scheduleDate = exam.start_date
    let scheduleSession = `${exam.start_time} - ${exam.end_time}`

    const activeSchedule = schedule.find(s => s.id === parseInt(selectedScheduleId))
    if (activeSchedule) {
      subjectCode = activeSchedule.subject_code
      subjectName = activeSchedule.subject_name
      scheduleDate = activeSchedule.exam_date
      scheduleSession = activeSchedule.session
    } else {
      const sub = semesterSubjects.find(s => s.id === parseInt(manualSubjectId))
      if (sub) {
        subjectCode = sub.subject_code
        subjectName = sub.subject_name
      }
      scheduleDate = manualDate
      scheduleSession = manualSession
    }
    
    const doc = new jsPDF()
    
    seatingPlan.forEach((room, index) => {
      if (index > 0) doc.addPage()
      
      doc.setFontSize(16)
      doc.text('SURE-SEAT PRO SEATING ARRANGEMENT', 105, 15, { align: 'center' })
      
      doc.setFontSize(11)
      doc.text(`Exam: ${exam.exam_name} (${exam.exam_type})`, 14, 25)
      doc.text(`Date: ${scheduleDate}`, 14, 32)
      doc.text(`Time: ${scheduleSession}`, 14, 39)
      doc.text(`Subject: ${subjectCode} - ${subjectName}`, 14, 46)
      
      doc.text(`Room: ${room.roomName}`, 140, 25)
      doc.text(`Departments: ${room.depts.join(', ')}`, 140, 32)
      doc.text(`Total Students: ${room.students.length}`, 140, 39)
      
      // 2-column layout mapping
      const maxRows = Math.max(room.col1.length, room.col2.length)
      const tableData = []
      
      for (let i = 0; i < maxRows; i++) {
        const s1 = room.col1[i]
        const s2 = room.col2[i]
        
        tableData.push([
          s1 ? s1.seat : '', s1 ? s1.u : '', s1 ? s1.n : '', s1 ? s1.g : '',
          s2 ? s2.seat : '', s2 ? s2.u : '', s2 ? s2.n : '', s2 ? s2.g : ''
        ])
      }

      autoTable(doc, {
        startY: 52,
        head: [['Seat', 'USN', 'Name', 'Dept', 'Seat', 'USN', 'Name', 'Dept']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [2, 6, 23] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 35 },
          3: { cellWidth: 15 },
          4: { cellWidth: 10 },
          5: { cellWidth: 25 },
          6: { cellWidth: 35 },
          7: { cellWidth: 15 }
        }
      })
      
      // Signature row at the bottom
      const finalY = doc.lastAutoTable?.finalY || 45
      doc.setFontSize(10)
      doc.text('Invigilator Signature: _______________________', 14, finalY + 20)
      doc.text('HOD Signature: _______________________', 130, finalY + 20)
    })
    
    const safeExamName = sanitizeFilename(exam?.exam_name)
    doc.save(`Seating_Plan_${safeExamName}.pdf`)
  }

  const exportAllPDF = () => {
    if (seatingPlan.length === 0 || schedule.length === 0) return
    
    const exam = exams.find(e => e.id === parseInt(selectedExam))
    const doc = new jsPDF()
    let isFirstPage = true

    schedule.forEach((activeSchedule) => {
      const subjectCode = activeSchedule.subject_code
      const subjectName = activeSchedule.subject_name
      const scheduleDate = activeSchedule.exam_date
      const scheduleSession = activeSchedule.session

      seatingPlan.forEach((room) => {
        if (!isFirstPage) {
          doc.addPage()
        } else {
          isFirstPage = false
        }
        
        doc.setFontSize(16)
        doc.text('SURE-SEAT PRO SEATING ARRANGEMENT', 105, 15, { align: 'center' })
        
        doc.setFontSize(11)
        doc.text(`Exam: ${exam.exam_name} (${exam.exam_type})`, 14, 25)
        doc.text(`Date: ${scheduleDate}`, 14, 32)
        doc.text(`Time: ${scheduleSession}`, 14, 39)
        doc.text(`Subject: ${subjectCode} - ${subjectName}`, 14, 46)
        
        doc.text(`Room: ${room.roomName}`, 140, 25)
        doc.text(`Departments: ${room.depts.join(', ')}`, 140, 32)
        doc.text(`Total Students: ${room.students.length}`, 140, 39)
        
        // 2-column layout mapping
        const maxRows = Math.max(room.col1.length, room.col2.length)
        const tableData = []
        
        for (let i = 0; i < maxRows; i++) {
          const s1 = room.col1[i]
          const s2 = room.col2[i]
          
          tableData.push([
            s1 ? s1.seat : '', s1 ? s1.u : '', s1 ? s1.n : '', s1 ? s1.g : '',
            s2 ? s2.seat : '', s2 ? s2.u : '', s2 ? s2.n : '', s2 ? s2.g : ''
          ])
        }

        autoTable(doc, {
          startY: 52,
          head: [['Seat', 'USN', 'Name', 'Dept', 'Seat', 'USN', 'Name', 'Dept']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [2, 6, 23] },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 15 },
            4: { cellWidth: 10 },
            5: { cellWidth: 25 },
            6: { cellWidth: 35 },
            7: { cellWidth: 15 }
          }
        })
        
        // Signature row at the bottom
        const finalY = doc.lastAutoTable?.finalY || 45
        doc.setFontSize(10)
        doc.text('Invigilator Signature: _______________________', 14, finalY + 20)
        doc.text('HOD Signature: _______________________', 130, finalY + 20)
      })
    })
    
    const safeExamName = sanitizeFilename(exam?.exam_name)
    doc.save(`All_Schedules_Seating_Plan_${safeExamName}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="glass-card lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Generation Setup</h2>
            <label className="block text-sm text-muted mb-1">Select Exam</label>
            <select className="input-field" value={selectedExam} onChange={e => handleExamChange(e.target.value)}>
              {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.exam_type} - Sem {e.semester})</option>)}
            </select>
          </div>

          {schedule.length > 0 ? (
            <div>
              <label className="block text-sm text-muted mb-1">Select Scheduled Slot</label>
              <select className="input-field" value={selectedScheduleId} onChange={e => setSelectedScheduleId(e.target.value)}>
                {schedule.map(s => (
                  <option key={s.id} value={s.id}>{s.exam_date} ({s.session}) - {s.subject_code}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4 border border-slate-800 p-4 rounded-lg bg-slate-900/30">
              <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Manual Slot Override (No schedule found)</div>
              <div>
                <label className="block text-sm text-muted mb-1">Select Subject</label>
                <select className="input-field" value={manualSubjectId} onChange={e => setManualSubjectId(e.target.value)}>
                  {semesterSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>)}
                  {semesterSubjects.length === 0 && <option value="">No subjects found for Semester {exams.find(e => e.id === parseInt(selectedExam))?.semester || 1}</option>}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Exam Date</label>
                  <input type="date" className="input-field" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Session / Slot</label>
                  <input type="text" className="input-field" placeholder="e.g. 09:00 - 12:00" value={manualSession} onChange={e => setManualSession(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-muted mb-1">Upload Student Data (CSV)</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-muted" />
                <p className="text-sm text-slate-300 font-medium">Click to upload CSV</p>
                <p className="text-xs text-muted mt-1">{studentList.length} students loaded</p>
                {studentList.length > 0 && (
                   <p className="text-[10px] text-sky-400 mt-1 text-center max-w-[220px] truncate">
                     Sems: {[...new Set(studentList.map(s => s.s))].sort().join(', ')} | 
                     Depts: {[...new Set(studentList.map(s => s.g))].sort().join(', ')}
                   </p>
                 )}
              </div>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 mb-2">Dynamic Options</h3>
            <div className="flex space-x-4">
              <label className="flex items-center text-sm text-muted">
                <input type="checkbox" checked={useClassrooms} onChange={e => setUseClassrooms(e.target.checked)} className="mr-2" /> Classrooms
              </label>
              <label className="flex items-center text-sm text-muted">
                <input type="checkbox" checked={useLabs} onChange={e => setUseLabs(e.target.checked)} className="mr-2" /> Labs
              </label>
              <label className="flex items-center text-sm text-muted">
                <input type="checkbox" checked={singleSeating} onChange={e => setSingleSeating(e.target.checked)} className="mr-2" /> 1-Per-Bench
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs text-muted mb-1">Classroom Cap Override</label>
                <input type="number" className="input-field py-1 text-sm" placeholder="Default" value={classCapOverride} onChange={e => setClassCapOverride(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Lab Cap Override</label>
                <input type="number" className="input-field py-1 text-sm" placeholder="Default" value={labCapOverride} onChange={e => setLabCapOverride(e.target.value)} />
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={loading || !selectedExam || studentList.length === 0 || (!useClassrooms && !useLabs)}
            className="btn btn-primary w-full py-3"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />}
            Generate Seating Plan
          </button>
          
          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        </div>

        <div className="glass-card lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Generated Plan Preview</h2>
            {seatingPlan.length > 0 && (
              <div className="flex gap-2">
                {schedule.length > 0 && (
                  <button onClick={exportAllPDF} className="btn bg-sky-600 hover:bg-sky-500 text-white py-2 px-3 text-xs md:text-sm">
                    <Download size={16} className="mr-1" /> Export All Slots
                  </button>
                )}
                <button onClick={exportPDF} className="btn bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 text-xs md:text-sm">
                  <Download size={16} className="mr-1" /> {schedule.length > 0 ? 'Export Current Slot' : 'Export Seating Plan'}
                </button>
              </div>
            )}
          </div>

          {seatingPlan.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted border border-dashed border-slate-700 rounded-lg p-8">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>No seating plan generated yet.</p>
              <p className="text-sm mt-2 opacity-60">Upload student data and click generate.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {seatingPlan.map((room, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="font-bold text-accent">{room.roomName}</div>
                    <div className="text-sm text-slate-300 mt-1">{room.students.length} Students</div>
                    <div className="text-xs text-muted mt-2">{room.depts.join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
