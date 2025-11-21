import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, DollarSign, LogOut, Users, Briefcase, CheckCircle, Plus, FileText, Trash2, Edit, Save, X, History, AlertTriangle, HeartPulse, CheckSquare } from 'lucide-react';

// --- DATOS DE EJEMPLO ---
const initialUsers = [
  { 
    id: 1, name: 'Admin General', email: 'admin@nexo.com', password: '123', role: 'admin', rate: 0,
    birthDate: '1980-01-01', curp: 'ADMIN010180HDFXXX01', bloodType: 'O+', allergies: 'Ninguna' 
  },
  { 
    id: 2, name: 'Natalie Lazaro', email: 'bombero@nexo.com', password: '123', role: 'bombero', rate: 100,
    birthDate: '1995-05-15', curp: 'LAZA950515HDFXXX02', bloodType: 'A+', allergies: 'Penicilina' 
  },
];

const initialEvents = [
  { 
    id: 101, name: 'Festival de Música X', date: '2025-11-20', startTime: '10:00', endTime: '18:00', location: 'Parque Central', type: 'Social', quota: 5, deadline: '2025-11-19' 
  },
  { 
    id: 102, name: 'Guardia Nocturna', date: '2025-12-01', startTime: '20:00', endTime: '06:00', location: 'Estación Norte', type: 'Operativo', quota: 2, deadline: '2025-11-30' 
  },
];

const initialAssignments = [
  { eventId: 101, userId: 2 }
];

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(initialUsers);
  const [events, setEvents] = useState(initialEvents);
  const [assignments, setAssignments] = useState(initialAssignments);
  // SHIFTS AHORA GUARDA: historicRate (para no afectar nómina pasada) y overtime (horas extra)
  const [shifts, setShifts] = useState([]); 
  
  const [adminView, setAdminView] = useState('events'); 

  // --- FUNCIÓN DE CIERRE AUTOMÁTICO DE TURNOS ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Revisar turnos activos
      const updatedShifts = shifts.map(shift => {
        if (!shift.endTime) {
          const event = events.find(e => e.id === shift.eventId);
          if (event) {
            // Construir fecha fin del evento
            const eventEnd = new Date(`${event.date}T${event.endTime}`);
            // Si ya pasó la hora fin del evento, cerramos el turno automáticamente
            if (now > eventEnd) {
              // Buscamos la tarifa del usuario para congelarla
              const worker = users.find(u => u.id === shift.userId);
              return { 
                ...shift, 
                endTime: new Date().toISOString(), 
                autoClosed: true, // Marca interna
                historicRate: worker ? worker.rate : 0 // SNAPSHOT DE TARIFA
              };
            }
          }
        }
        return shift;
      });
      
      // Solo actualizamos si hubo cambios para evitar re-renders infinitos
      if (JSON.stringify(updatedShifts) !== JSON.stringify(shifts)) {
        setShifts(updatedShifts);
      }
    }, 60000); // Revisar cada minuto (60000 ms)

    return () => clearInterval(interval);
  }, [shifts, events, users]);

  const handleLogin = (email, password) => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) {
      setUser(foundUser);
    } else {
      alert("Credenciales incorrectas.");
    }
  };

  const handleLogout = () => setUser(null);

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  if (user.role === 'admin') {
    return (
      <AdminDashboard 
        user={user} 
        onLogout={handleLogout} 
        users={users}
        setUsers={setUsers}
        events={events}
        setEvents={setEvents}
        assignments={assignments}
        setAssignments={setAssignments}
        shifts={shifts} 
        view={adminView}
        setView={setAdminView}
      />
    );
  }

  if (user.role === 'bombero') {
    return (
      <FirefighterDashboard 
        user={user} 
        onLogout={handleLogout}
        events={events}
        assignments={assignments}
        setAssignments={setAssignments}
        shifts={shifts}
        setShifts={setShifts}
        currentUserData={user} // Pasamos datos actuales para obtener tarifa al momento
      />
    );
  }
}

// --- PANTALLA DE LOGIN ---
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-red-600 p-3 rounded-full">
            <User className="text-white w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">NEXO</h1>
        <p className="text-center text-slate-500 mb-6">Sistema de Gestión de Bomberos</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Correo</label>
            <input type="email" className="mt-1 w-full p-2 border rounded bg-slate-50" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Contraseña</label>
            <input type="password" className="mt-1 w-full p-2 border rounded bg-slate-50" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {/* Aseguramos type="submit" */}
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition">Iniciar Sesión</button>
        </form>
        <div className="mt-6 text-xs text-center text-slate-400"><p>Admin: admin@nexo.com / 123</p><p>Bombero: bombero@nexo.com / 123</p></div>
      </div>
    </div>
  );
}

// --- PANEL DE ADMINISTRADOR ---
function AdminDashboard({ user, onLogout, users, setUsers, events, setEvents, assignments, setAssignments, shifts, view, setView }) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [tempRate, setTempRate] = useState(0);
  
  // Estado para edición de eventos
  const [editingEvent, setEditingEvent] = useState(null);

  // --- GESTIÓN DE USUARIOS ---
  const handleDeleteUser = (id) => {
    if (confirm("¿Estás seguro de despedir a este empleado?")) {
      setUsers(users.filter(u => u.id !== id));
      setAssignments(assignments.filter(a => a.userId !== id));
    }
  };

  const startEditingUser = (user) => { setEditingUserId(user.id); setTempRate(user.rate); };
  const saveRate = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, rate: parseFloat(tempRate) } : u));
    setEditingUserId(null);
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newUser = {
      id: Date.now(),
      name: formData.get('name'),
      email: formData.get('email'),
      password: 'temp',
      role: formData.get('role'),
      rate: parseFloat(formData.get('rate') || 0),
      birthDate: formData.get('birthDate'),
      curp: formData.get('curp'),
      bloodType: formData.get('bloodType'),
      allergies: formData.get('allergies'),
    };
    setUsers([...users, newUser]);
    alert("Usuario registrado.");
    e.target.reset();
  };

  // --- GESTIÓN DE EVENTOS (CREAR Y EDITAR) ---
  const handleEventSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const eventDate = formData.get('eventDate');
    const startTime = formData.get('startTime');
    
    // VALIDACIÓN: NO FECHAS PASADAS
    const eventDateTime = new Date(`${eventDate}T${startTime}`);
    const now = new Date();
    
    // Permitimos editar eventos pasados solo para corregir datos, pero no crear nuevos en el pasado
    if (!editingEvent && eventDateTime < now) {
      alert("Error: No puedes crear eventos con fecha u hora en el pasado.");
      return;
    }

    const eventData = {
      name: formData.get('eventName'),
      date: eventDate,
      startTime: startTime,
      endTime: formData.get('endTime'),
      location: formData.get('location'),
      type: formData.get('type'),
      quota: parseInt(formData.get('quota')),
      deadline: formData.get('deadline'),
    };

    if (editingEvent) {
      // MODIFICAR EVENTO EXISTENTE
      setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, ...eventData } : ev));
      alert("Evento modificado correctamente.");
      setEditingEvent(null);
    } else {
      // CREAR NUEVO
      setEvents([...events, { id: Date.now(), ...eventData }]);
      alert("Evento creado.");
    }
    e.target.reset();
  };

  const startEditingEvent = (event) => {
    setEditingEvent(event);
    // Scroll hacia arriba para ver el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditEvent = () => {
    setEditingEvent(null);
  }

  // --- CÁLCULO DE NÓMINA ---
  const calculatePayroll = () => {
    // Solo procesamos turnos completados
    const completedShifts = shifts.filter(s => s.endTime);
    
    return completedShifts.map(shift => {
      const worker = users.find(u => u.id === shift.userId);
      const event = events.find(e => e.id === shift.eventId);
      
      if (!worker || !event) return null; 

      // 1. OBTENER LA TARIFA CORRECTA (SNAPSHOT)
      // Si el turno tiene 'historicRate', usamos esa. Si no (es viejo), usamos la actual del worker.
      const rateToUse = shift.historicRate !== undefined ? shift.historicRate : worker.rate;

      // 2. CÁLCULO BASE (5 Horas Fijas)
      const basePay = 5 * rateToUse;

      // 3. CÁLCULO EXTRAS (Con redondeo > 30min)
      let overtimePay = 0;
      let roundedOvertime = 0;

      if (shift.overtime) {
        // Regla: "Las horas se cuentan completas después de 30min"
        // Interpretación estándar: Redondeo matemático (1.5 -> 2, 1.4 -> 1)
        roundedOvertime = Math.round(shift.overtime);
        overtimePay = roundedOvertime * rateToUse;
      }

      const totalPay = basePay + overtimePay;
      const monthKey = event.date ? event.date.substring(0, 7) : 'Sin Fecha'; 

      return {
        id: shift.id,
        workerId: worker.id,
        workerName: worker.name,
        eventName: event.name,
        eventDate: event.date,
        monthKey: monthKey,
        paidHours: 5,
        overtimeHours: roundedOvertime,
        totalPay: totalPay,
        rateUsed: rateToUse
      };
    }).filter(item => item !== null);
  };

  const payrollData = calculatePayroll();

  // Agrupaciones
  const summaryByEmployee = Object.values(payrollData.reduce((acc, curr) => {
    if (!acc[curr.workerId]) acc[curr.workerId] = { name: curr.workerName, total: 0, shifts: 0 };
    acc[curr.workerId].total += curr.totalPay;
    acc[curr.workerId].shifts += 1;
    return acc;
  }, {}));

  const historyByMonth = payrollData.reduce((acc, curr) => {
    if (!acc[curr.monthKey]) acc[curr.monthKey] = [];
    acc[curr.monthKey].push(curr);
    return acc;
  }, {});
  const sortedMonths = Object.keys(historyByMonth).sort().reverse();

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-slate-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2"><Briefcase className="text-red-500" /><span className="font-bold text-xl">Panel Administrativo</span></div>
        <div className="flex items-center gap-4"><span className="text-sm">{user.name}</span><button onClick={onLogout} className="text-xs bg-slate-700 px-3 py-1 rounded flex items-center gap-1"><LogOut size={14}/> Salir</button></div>
      </nav>

      <div className="flex">
        <div className="w-64 bg-white h-[calc(100vh-64px)] shadow-md hidden md:block p-4 space-y-2">
          <button onClick={() => setView('events')} className={`w-full text-left p-3 rounded flex gap-2 ${view === 'events' ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50'}`}><Calendar size={18}/> Eventos</button>
          <button onClick={() => setView('users')} className={`w-full text-left p-3 rounded flex gap-2 ${view === 'users' ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50'}`}><Users size={18}/> Personal</button>
          <button onClick={() => setView('payroll')} className={`w-full text-left p-3 rounded flex gap-2 ${view === 'payroll' ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50'}`}><DollarSign size={18}/> Nómina</button>
        </div>

        <main className="flex-1 p-8 overflow-auto h-[calc(100vh-64px)]">
          
          {/* VISTA EVENTOS */}
          {view === 'events' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow border-t-4 border-red-500">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold">{editingEvent ? `Editando: ${editingEvent.name}` : 'Crear Nuevo Evento'}</h2>
                  {editingEvent && <button onClick={cancelEditEvent} className="text-sm text-slate-500 underline">Cancelar Edición</button>}
                </div>
                
                <form onSubmit={handleEventSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="eventName" required placeholder="Nombre del Evento" defaultValue={editingEvent?.name} className="border p-2 rounded" />
                  <input name="location" required placeholder="Ubicación" defaultValue={editingEvent?.location} className="border p-2 rounded" />
                  <input name="eventDate" type="date" required defaultValue={editingEvent?.date} className="border p-2 rounded" />
                  <input name="type" placeholder="Tipo" defaultValue={editingEvent?.type} className="border p-2 rounded" />
                  <div className="flex gap-2">
                    <div className="w-full"><span className="text-xs text-slate-500">Inicio</span><input name="startTime" type="time" required defaultValue={editingEvent?.startTime} className="border p-2 rounded w-full" /></div>
                    <div className="w-full"><span className="text-xs text-slate-500">Fin</span><input name="endTime" type="time" required defaultValue={editingEvent?.endTime} className="border p-2 rounded w-full" /></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-full"><span className="text-xs text-slate-500">Cupo</span><input name="quota" type="number" required defaultValue={editingEvent?.quota} className="border p-2 rounded w-full" /></div>
                    <div className="w-full"><span className="text-xs text-slate-500">Cierre</span><input name="deadline" type="date" required defaultValue={editingEvent?.deadline} className="border p-2 rounded w-full" /></div>
                  </div>
                  <button type="submit" className={`md:col-span-2 text-white p-2 rounded hover:opacity-90 flex justify-center gap-2 ${editingEvent ? 'bg-blue-600' : 'bg-red-600'}`}>
                    {editingEvent ? <><Save size={16}/> Guardar Cambios</> : <><Plus size={16}/> Crear Evento</>}
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-4">Estado de Eventos</h2>
                {events.map(event => {
                  const assignedCount = assignments.filter(a => a.eventId === event.id).length;
                  return (
                    <div key={event.id} className="border p-4 rounded mb-4 flex justify-between items-center hover:bg-slate-50 transition">
                      <div>
                        <h3 className="font-bold">{event.name}</h3>
                        <p className="text-sm text-slate-500">{event.date} | {event.startTime} - {event.endTime}</p>
                        <p className="text-xs text-slate-400">Cupo: {assignedCount} / {event.quota}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">Asignados: {assignedCount}</span>
                         <button onClick={() => startEditingEvent(event)} className="text-blue-600 hover:bg-blue-100 p-2 rounded border border-blue-200" title="Modificar Evento">
                           <Edit size={16}/>
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISTA USUARIOS */}
          {view === 'users' && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-4 border-b pb-2">Registrar Personal</h2>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <input name="name" required placeholder="Nombre Completo" className="border p-2 rounded" />
                <input name="email" type="email" required placeholder="Correo Electrónico" className="border p-2 rounded" />
                <input name="curp" required placeholder="CURP" className="border p-2 rounded uppercase" maxLength={18} />
                <input name="birthDate" type="date" required className="border p-2 rounded" />
                <select name="bloodType" className="border p-2 rounded"><option value="">Tipo de Sangre</option><option value="A+">A+</option><option value="O+">O+</option></select>
                <input name="allergies" placeholder="Alergias" className="border p-2 rounded" />
                <select name="role" className="border p-2 rounded"><option value="bombero">Bombero</option><option value="admin">Administrador</option></select>
                <input name="rate" type="number" placeholder="Tarifa ($/hr)" className="border p-2 rounded" />
                <button type="submit" className="md:col-span-2 bg-slate-800 text-white p-2 rounded">Registrar</button>
              </form>
              <h3 className="font-bold mb-2">Directorio</h3>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50"><tr><th className="p-2">Nombre</th><th className="p-2">Rol</th><th className="p-2">Tarifa</th><th className="p-2 text-center">Acciones</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="p-2">{u.name}</td>
                      <td className="p-2 capitalize">{u.role}</td>
                      <td className="p-2">
                        {editingUserId === u.id ? (
                          <div className="flex gap-1"><input type="number" value={tempRate} onChange={(e)=>setTempRate(e.target.value)} className="w-20 border rounded"/><button onClick={()=>saveRate(u.id)} className="text-green-600"><Save size={16}/></button></div>
                        ) : <span>${u.rate}</span>}
                      </td>
                      <td className="p-2 flex justify-center gap-2">
                        {u.role !== 'admin' && <><button onClick={()=>startEditingUser(u)} className="text-blue-600"><Edit size={16}/></button><button onClick={()=>handleDeleteUser(u.id)} className="text-red-600"><Trash2 size={16}/></button></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA NOMINA */}
          {view === 'payroll' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><DollarSign className="text-green-600" /> Resumen Total de Pagos</h2>
                <table className="w-full text-sm">
                  <thead className="bg-slate-100"><tr><th className="p-3 text-left">Empleado</th><th className="p-3 text-center">Eventos</th><th className="p-3 text-right">Total a Pagar</th></tr></thead>
                  <tbody>
                    {summaryByEmployee.length === 0 && <tr><td colSpan="3" className="p-3 text-center text-slate-400">Sin datos</td></tr>}
                    {summaryByEmployee.map((sum, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-3 font-bold text-slate-700">{sum.name}</td>
                        <td className="p-3 text-center">{sum.shifts}</td>
                        <td className="p-3 text-right font-bold text-green-700 text-lg">${sum.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><History className="text-slate-600" /> Archivo de Nómina Mensual</h2>
                {sortedMonths.map(month => (
                  <div key={month} className="mb-6 border rounded-lg overflow-hidden">
                    <div className="bg-slate-800 text-white p-3 font-bold">Periodo: {month}</div>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-left">Bombero</th><th className="p-3">Evento</th><th className="p-3 text-right">Fecha</th><th className="p-3 text-right">Extras</th><th className="p-3 text-right">Total</th></tr></thead>
                      <tbody>
                        {historyByMonth[month].map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="p-3">{item.workerName}</td>
                            <td className="p-3 text-slate-600">{item.eventName}</td>
                            <td className="p-3 text-right">{item.eventDate}</td>
                            <td className="p-3 text-right font-mono text-blue-600">{item.overtimeHours > 0 ? `+${item.overtimeHours}h` : '-'}</td>
                            <td className="p-3 text-right font-bold text-green-700">${item.totalPay.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- PANEL DE BOMBERO ---
function FirefighterDashboard({ user, onLogout, events, assignments, setAssignments, shifts, setShifts, currentUserData }) {
  const [tab, setTab] = useState('my-events');
  // Estado local para manejar input de horas extra por evento
  const [overtimeInputs, setOvertimeInputs] = useState({});
  const [showOvertimeFor, setShowOvertimeFor] = useState({});

  const myEventIds = assignments.filter(a => a.userId === user.id).map(a => a.eventId);
  const myEvents = events.filter(e => myEventIds.includes(e.id));
  
  const availableEvents = events.filter(e => {
    const isAssigned = myEventIds.includes(e.id);
    if (isAssigned) return false;
    const assignedCount = assignments.filter(a => a.eventId === e.id).length;
    const today = new Date().toISOString().split('T')[0];
    return assignedCount < e.quota && e.deadline >= today;
  });

  const myHistory = shifts.filter(s => s.userId === user.id && s.endTime).map(s => {
    const evt = events.find(e => e.id === s.eventId);
    const rate = s.historicRate || user.rate;
    const base = 5 * rate;
    const extra = s.overtime ? Math.round(s.overtime) * rate : 0;
    const monthKey = evt?.date ? evt.date.substring(0, 7) : 'Varios';
    return { ...s, eventName: evt?.name, date: evt?.date, monthKey, pay: base + extra, extraHours: s.overtime ? Math.round(s.overtime) : 0 };
  });

  const historyByMonth = myHistory.reduce((acc, curr) => {
    if (!acc[curr.monthKey]) acc[curr.monthKey] = { shifts: [], total: 0 };
    acc[curr.monthKey].shifts.push(curr);
    acc[curr.monthKey].total += curr.pay;
    return acc;
  }, {});
  const sortedHistoryMonths = Object.keys(historyByMonth).sort().reverse();

  const handleSelfAssign = (eventId) => {
    if (confirm("¿Deseas inscribirte?")) setAssignments([...assignments, { eventId, userId: user.id }]);
  };

  const handleClockIn = (eventId) => {
    // Al iniciar turno, NO guardamos la tarifa aún. Se guarda al finalizar.
    const newShift = { id: Date.now(), userId: user.id, eventId, startTime: new Date().toISOString(), endTime: null, overtime: 0 };
    setShifts([...shifts, newShift]);
  };

  const handleClockOut = (eventId) => {
    // Al finalizar manual, guardamos snapshot de tarifa
    const updated = shifts.map(s => s.userId === user.id && s.eventId === eventId && !s.endTime ? 
      { ...s, endTime: new Date().toISOString(), historicRate: currentUserData.rate } : s);
    setShifts(updated);
  };

  // Guardar Horas Extra
  const handleSaveOvertime = (shiftId) => {
    const val = parseFloat(overtimeInputs[shiftId]);
    if (isNaN(val) || val < 0) return alert("Ingresa un número válido de horas.");

    const updated = shifts.map(s => {
      if (s.id === shiftId) {
        return { ...s, overtime: val };
      }
      return s;
    });
    setShifts(updated);
    alert("Horas extra registradas.");
    // Ocultar casilla
    setShowOvertimeFor({ ...showOvertimeFor, [shiftId]: false });
  };

  const getActiveShift = (eventId) => shifts.find(s => s.userId === user.id && s.eventId === eventId && !s.endTime);
  const getCompletedShift = (eventId) => shifts.find(s => s.userId === user.id && s.eventId === eventId && s.endTime);

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-red-700 text-white p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-2"><User /><span className="font-bold text-xl">Portal Bombero</span></div>
        <div className="flex items-center gap-4"><span className="text-sm">{user.name}</span><button onClick={onLogout} className="text-xs bg-red-800 px-3 py-1 rounded flex items-center gap-1"><LogOut size={14}/> Salir</button></div>
      </nav>

      <div className="flex justify-center bg-white shadow-sm mb-6">
        <button onClick={() => setTab('my-events')} className={`px-6 py-3 border-b-2 font-medium ${tab === 'my-events' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500'}`}>Mis Eventos</button>
        <button onClick={() => setTab('available')} className={`px-6 py-3 border-b-2 font-medium ${tab === 'available' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500'}`}>Disponibles</button>
        <button onClick={() => setTab('history')} className={`px-6 py-3 border-b-2 font-medium ${tab === 'history' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500'}`}>Historial</button>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        {tab === 'my-events' && (
          <div className="space-y-4">
            {myEvents.map(event => {
              const activeShift = getActiveShift(event.id);
              const completedShift = getCompletedShift(event.id); 

              return (
                <div key={event.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
                  <div className="flex justify-between items-start">
                    <div><h3 className="text-xl font-bold text-slate-800">{event.name}</h3><p className="text-slate-500 text-sm">{event.date} | {event.startTime} - {event.endTime}</p></div>
                    <div>
                      {completedShift ? (
                        <div className="text-right">
                          <button disabled className="bg-slate-300 text-slate-500 px-4 py-2 rounded font-bold flex items-center gap-2 cursor-not-allowed mb-2"><CheckCircle size={18}/> COMPLETADO</button>
                          {/* --- CASILLA HORAS EXTRA --- */}
                          <div className="mt-2 border-t pt-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={showOvertimeFor[completedShift.id] || false}
                                onChange={(e) => setShowOvertimeFor({...showOvertimeFor, [completedShift.id]: e.target.checked})}
                                className="rounded text-red-600 focus:ring-red-500"
                              />
                              <span className="font-medium text-slate-700">¿Horas Extra?</span>
                            </label>
                            
                            {showOvertimeFor[completedShift.id] && (
                              <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  placeholder="Hrs (ej 1.5)" 
                                  className="w-24 border p-1 rounded text-sm"
                                  value={overtimeInputs[completedShift.id] || ''}
                                  onChange={(e) => setOvertimeInputs({...overtimeInputs, [completedShift.id]: e.target.value})}
                                />
                                <button 
                                  onClick={() => handleSaveOvertime(completedShift.id)}
                                  className="bg-slate-800 text-white px-2 py-1 rounded text-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            )}
                            {completedShift.overtime > 0 && (
                              <p className="text-xs text-green-600 mt-1 font-bold">Registrado: {completedShift.overtime} hrs extra</p>
                            )}
                          </div>
                        </div>
                      ) : activeShift ? (
                        <button onClick={() => handleClockOut(event.id)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold shadow">FINALIZAR TURNO</button>
                      ) : (
                        <button onClick={() => handleClockIn(event.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2 shadow"><Clock size={18}/> INICIAR TURNO</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'available' && (
          <div className="space-y-4">
            {availableEvents.map(event => (
              <div key={event.id} className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
                <div><h3 className="font-bold text-lg">{event.name}</h3><p className="text-sm text-slate-500">{event.date}</p></div>
                <button onClick={() => handleSelfAssign(event.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-1"><Plus size={16}/> Inscribirme</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-6">
            {sortedHistoryMonths.map(month => (
              <div key={month} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center"><span className="font-bold text-lg capitalize">Periodo: {month}</span><div className="bg-green-600 px-3 py-1 rounded text-sm font-bold">Total Mes: ${historyByMonth[month].total.toFixed(2)}</div></div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Evento</th><th className="p-4">Fecha</th><th className="p-4 text-right">Pago (5hrs + Extra)</th></tr></thead>
                  <tbody>
                    {historyByMonth[month].shifts.map(h => (
                      <tr key={h.id} className="border-b hover:bg-slate-50">
                        <td className="p-4 font-medium">{h.eventName}</td>
                        <td className="p-4 text-slate-500">{h.date}</td>
                        <td className="p-4 text-right font-bold text-green-700">
                          ${h.pay.toFixed(2)}
                          {h.extraHours > 0 && <span className="block text-xs text-slate-400 font-normal">({h.extraHours}h extra incluidas)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}