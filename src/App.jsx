/**
 * 🚒 PROYECTO NEXO - VERSIÓN 9 (CORRECCIÓN PANTALLA BLANCA)
 * ---------------------------------------------------------
 * - Agregada pantalla de error si el rol no coincide.
 * - Normalización de roles (mayúsculas/minúsculas).
 * - Admin: Edición completa.
 * - Bombero: Perfil y Edición.
 */

import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, DollarSign, LogOut, Users, Briefcase, CheckCircle, Plus, FileText, Trash2, Edit, Save, X, History, AlertTriangle, HeartPulse, CheckSquare, Filter, Database, Settings, FileBadge } from 'lucide-react';

// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';

// ===============================================================================
// ⚠️ CONFIGURACIÓN DE FIREBASE ⚠️
// ===============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD4rN95fc9S4HXKMIooo4Kwda1LxfpaSS8",
  authDomain: "proyectonexo-abbd0.firebaseapp.com",
  projectId: "proyectonexo-abbd0",
  storageBucket: "proyectonexo-abbd0.firebasestorage.app",
  messagingSenderId: "500540903600",
  appId: "1:500540903600:web:477500786df3ec5577eb75",
  measurementId: "G-WXEFQ35YEF"
};
// ===============================================================================

let app, auth, db;
const isConfigured = firebaseConfig.apiKey !== ""; 

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Error conectando a Firebase:", e);
  }
}

const COLS = { USERS: 'users', EVENTS: 'events', ASSIGNMENTS: 'assignments', SHIFTS: 'shifts' };

export default function App() {
  if (!isConfigured) return <ConfigurationScreen />;

  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]); 
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [shifts, setShifts] = useState([]);
  
  const [adminView, setAdminView] = useState('events'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error("Error auth:", err));
    const unsubscribe = onAuthStateChanged(auth, (u) => { if(u) console.log("Conectado:", u.uid); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const subscribeTo = (colName, setStateFn) => {
      return onSnapshot(query(collection(db, colName)), (snapshot) => {
        setStateFn(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    };
    // Suscribirse y manejar loading
    const unsubUsers = subscribeTo(COLS.USERS, setUsers);
    const unsubEvents = subscribeTo(COLS.EVENTS, setEvents);
    const unsubAssign = subscribeTo(COLS.ASSIGNMENTS, setAssignments);
    const unsubShifts = subscribeTo(COLS.SHIFTS, (data) => { 
      setShifts(data); 
      setLoading(false); 
    });

    return () => { unsubUsers(); unsubEvents(); unsubAssign(); unsubShifts(); };
  }, []);

  // Auto-cierre de turnos
  useEffect(() => {
    if (loading || shifts.length === 0) return;
    const interval = setInterval(() => {
      const now = new Date();
      shifts.forEach(shift => {
        if (!shift.endTime) {
          const event = events.find(e => e.id === shift.eventId);
          if (event) {
            let eventEnd = new Date(`${event.date}T${event.endTime}`);
            const eventStart = new Date(`${event.date}T${event.startTime}`);
            if (eventEnd < eventStart) eventEnd.setDate(eventEnd.getDate() + 1);
            if (now > eventEnd) {
              const worker = users.find(u => u.id === shift.userId);
              updateDoc(doc(db, COLS.SHIFTS, shift.id), {
                endTime: new Date().toISOString(), autoClosed: true, historicRate: worker ? worker.rate : 0
              });
            }
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [shifts, events, users, loading]);

  const dbAdd = (col, data) => addDoc(collection(db, col), data);
  const dbUpdate = (col, id, data) => updateDoc(doc(db, col, id), data);
  const dbDelete = (col, id) => deleteDoc(doc(db, col, id));

  const seedDatabase = async () => {
    setLoading(true);
    await dbAdd(COLS.USERS, { name: 'Admin General', email: 'admin@nexo.com', password: '123', role: 'admin', rate: 0, birthDate: '1980-01-01', curp: 'ADMIN01', bloodType: 'O+', allergies: 'Ninguna' });
    await dbAdd(COLS.USERS, { name: 'Natalie Lazaro', email: 'bombero@nexo.com', password: '123', role: 'bombero', rate: 100, birthDate: '1995-05-15', curp: 'LAZA95', bloodType: 'A+', allergies: 'Penicilina' });
    alert("Datos creados. Inicia sesión.");
    setLoading(false);
  };

  const handleLogin = (email, password) => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) setUser(foundUser); else alert("Credenciales incorrectas.");
  };

  const handleLogout = () => setUser(null);

  // --- RENDERIZADO SEGURO ---
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando sistema...</div>;
  
  if (!user) return <LoginScreen onLogin={handleLogin} usersCount={users.length} onSeed={seedDatabase} />;
  
  // Normalizamos el rol para evitar errores de mayúsculas/minúsculas
  const role = (user.role || "").toLowerCase().trim();

  if (role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} users={users} events={events} assignments={assignments} shifts={shifts} view={adminView} setView={setAdminView} dbAdd={dbAdd} dbUpdate={dbUpdate} dbDelete={dbDelete} />;
  }
  
  if (role === 'bombero') {
    return <FirefighterDashboard user={user} onLogout={handleLogout} events={events} assignments={assignments} shifts={shifts} currentUserData={users.find(u => u.id === user.id) || user} dbAdd={dbAdd} dbUpdate={dbUpdate} dbDelete={dbDelete} />;
  }

  // PANTALLA DE ERROR (FALLBACK) - Si el rol no coincide con nada
  return (
    <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-4 text-center">
      <AlertTriangle size={48} className="text-red-500 mb-4"/>
      <h1 className="text-2xl font-bold text-red-700">Error de Permisos</h1>
      <p className="text-slate-700 mt-2">El usuario <strong>{user.name}</strong> tiene un rol desconocido: <code>"{user.role}"</code>.</p>
      <p className="text-sm text-slate-500 mb-6">Contacta al administrador para corregir tu rol en la base de datos.</p>
      <button onClick={handleLogout} className="bg-slate-800 text-white px-6 py-2 rounded shadow hover:bg-slate-900">Cerrar Sesión</button>
    </div>
  );
}

// --- PANTALLA DE AYUDA ---
function ConfigurationScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
      <div className="bg-white p-8 rounded-lg max-w-lg">
        <Settings size={48} className="mx-auto text-yellow-500 mb-4"/>
        <h1 className="text-2xl font-bold mb-2">Falta Configuración</h1>
        <p className="text-slate-600 mb-4">Debes pegar tus llaves de Firebase en el código (App.jsx).</p>
        <pre className="bg-slate-100 p-2 text-xs text-left rounded">const firebaseConfig = &#123; ... &#125;;</pre>
      </div>
    </div>
  );
}

// --- LOGIN ---
function LoginScreen({ onLogin, usersCount, onSeed }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6"><div className="bg-red-600 p-3 rounded-full"><User className="text-white w-8 h-8" /></div></div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">NEXO</h1>
        {usersCount === 0 ? (
          <button onClick={onSeed} className="bg-blue-600 text-white px-4 py-2 rounded w-full flex justify-center gap-2"><Database/> Generar Datos de Prueba</button>
        ) : (
          <form onSubmit={(e)=>{e.preventDefault(); onLogin(email, password)}} className="space-y-4">
            <input placeholder="Correo" className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Contraseña" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="w-full bg-red-600 text-white font-bold py-2 rounded">Iniciar Sesión</button>
          </form>
        )}
        {usersCount > 0 && <div className="mt-6 text-xs text-center text-slate-400"><p>Admin: admin@nexo.com / 123</p><p>Bombero: bombero@nexo.com / 123</p></div>}
      </div>
    </div>
  );
}

// --- PANEL ADMIN ---
function AdminDashboard({ user, onLogout, users, events, assignments, shifts, view, setView, dbAdd, dbUpdate, dbDelete }) {
  const [editingUser, setEditingUser] = useState(null); // Objeto completo para edición
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  // -- USUARIOS --
  const handleDeleteUser = async (id) => {
    if (confirm("¿Despedir empleado? Se borrará su historial.")) {
      await dbDelete(COLS.USERS, id);
      assignments.filter(a => a.userId === id).forEach(a => dbDelete(COLS.ASSIGNMENTS, a.id));
    }
  };

  // Prepara el formulario con los datos del usuario
  const startEditingUser = (u) => { 
    setEditingUser(u); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const userData = {
      name: f.get('name'), email: f.get('email'), password: f.get('password') || '123', 
      role: f.get('role'), rate: parseFloat(f.get('rate')||0), 
      birthDate: f.get('birthDate'), curp: f.get('curp'), 
      bloodType: f.get('bloodType'), allergies: f.get('allergies')
    };

    if (editingUser) {
      await dbUpdate(COLS.USERS, editingUser.id, userData);
      alert("Datos actualizados correctamente.");
      setEditingUser(null);
    } else {
      await dbAdd(COLS.USERS, userData);
      alert("Usuario registrado.");
    }
    e.target.reset();
  };

  // -- EVENTOS --
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = { name: f.get('eventName'), date: f.get('eventDate'), startTime: f.get('startTime'), endTime: f.get('endTime'), location: f.get('location'), type: f.get('type'), quota: parseInt(f.get('quota')), deadline: f.get('deadline') };
    
    if (!editingEvent && new Date(`${data.date}T${data.startTime}`) < new Date()) return alert("No puedes crear eventos pasados.");
    
    if (editingEvent) { await dbUpdate(COLS.EVENTS, editingEvent.id, data); alert("Editado."); setEditingEvent(null); }
    else { await dbAdd(COLS.EVENTS, data); alert("Creado."); }
    e.target.reset();
  };

  // -- NÓMINA --
  const calculatePayroll = () => {
    return shifts.filter(s => s.endTime).map(s => {
      const w = users.find(u => u.id === s.userId); const e = events.find(ev => ev.id === s.eventId);
      if (!w || !e) return null;
      const r = s.historicRate !== undefined ? s.historicRate : w.rate;
      const extra = s.overtime ? Math.round(s.overtime) : 0;
      return { id: s.id, workerId: w.id, workerName: w.name, eventName: e.name, monthKey: e.date.substring(0, 7), totalPay: (5 * r) + (extra * r), autoClosed: s.autoClosed };
    }).filter(i => i !== null);
  };
  const payroll = calculatePayroll();
  
  // Filtros nómina
  const months = [...new Set(payroll.map(p => p.monthKey))].sort().reverse();
  if (!months.includes(new Date().toISOString().substring(0,7))) months.unshift(new Date().toISOString().substring(0,7));
  const summary = Object.values(payroll.filter(i => i.monthKey === selectedMonth).reduce((acc, curr) => {
    if (!acc[curr.workerId]) acc[curr.workerId] = { name: curr.workerName, total: 0, shifts: 0 };
    acc[curr.workerId].total += curr.totalPay; acc[curr.workerId].shifts += 1; return acc;
  }, {}));
  const history = payroll.reduce((acc, curr) => { if (!acc[curr.monthKey]) acc[curr.monthKey] = []; acc[curr.monthKey].push(curr); return acc; }, {});

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-slate-900 text-white p-4 flex justify-between items-center"><div className="flex gap-2"><Briefcase className="text-red-500" /><span className="font-bold text-xl">Panel Admin</span></div><div className="flex gap-4"><span className="text-sm">{user.name}</span><button onClick={onLogout} className="text-xs bg-slate-700 px-3 py-1 rounded flex gap-1"><LogOut size={14}/> Salir</button></div></nav>
      <div className="flex">
        <div className="w-64 bg-white h-[calc(100vh-64px)] hidden md:block p-4 space-y-2">
          <button onClick={() => setView('events')} className={`w-full text-left p-3 rounded flex gap-2 ${view==='events'?'bg-red-50 text-red-600':''}`}><Calendar size={18}/> Eventos</button>
          <button onClick={() => setView('users')} className={`w-full text-left p-3 rounded flex gap-2 ${view==='users'?'bg-red-50 text-red-600':''}`}><Users size={18}/> Personal</button>
          <button onClick={() => setView('payroll')} className={`w-full text-left p-3 rounded flex gap-2 ${view==='payroll'?'bg-red-50 text-red-600':''}`}><DollarSign size={18}/> Nómina</button>
        </div>
        <main className="flex-1 p-8 overflow-auto h-[calc(100vh-64px)]">
          
          {/* EVENTOS */}
          {view === 'events' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded shadow border-t-4 border-red-500">
                <div className="flex justify-between mb-4 border-b pb-2"><h2 className="font-bold">{editingEvent ? 'Editando Evento' : 'Nuevo Evento'}</h2>{editingEvent && <button onClick={()=>setEditingEvent(null)} className="text-sm underline">Cancelar</button>}</div>
                <form onSubmit={handleEventSubmit} className="grid grid-cols-2 gap-4">
                  <input name="eventName" required placeholder="Nombre" defaultValue={editingEvent?.name} className="border p-2 rounded" />
                  <input name="location" required placeholder="Ubicación" defaultValue={editingEvent?.location} className="border p-2 rounded" />
                  <input name="eventDate" type="date" required defaultValue={editingEvent?.date} className="border p-2 rounded" />
                  <input name="type" placeholder="Tipo" defaultValue={editingEvent?.type} className="border p-2 rounded" />
                  <div className="flex gap-2"><input name="startTime" type="time" required defaultValue={editingEvent?.startTime} className="border p-2 rounded w-full" /><input name="endTime" type="time" required defaultValue={editingEvent?.endTime} className="border p-2 rounded w-full" /></div>
                  <div className="flex gap-2"><input name="quota" type="number" required defaultValue={editingEvent?.quota} placeholder="Cupo" className="border p-2 rounded w-full" /><input name="deadline" type="date" required defaultValue={editingEvent?.deadline} className="border p-2 rounded w-full" /></div>
                  <button className="col-span-2 bg-red-600 text-white p-2 rounded">{editingEvent ? 'Guardar Cambios' : 'Crear Evento'}</button>
                </form>
              </div>
              <div className="bg-white p-6 rounded shadow"><h2 className="font-bold mb-4">Eventos Activos</h2>{events.map(ev => (<div key={ev.id} className="border p-4 rounded mb-2 flex justify-between items-center"><div><h3 className="font-bold">{ev.name}</h3><p className="text-sm text-slate-500">{ev.date}</p></div><button onClick={()=>{setEditingEvent(ev); window.scrollTo(0,0)}} className="text-blue-600"><Edit size={16}/></button></div>))}</div>
            </div>
          )}

          {/* USUARIOS (FORMULARIO MEJORADO) */}
          {view === 'users' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded shadow border-t-4 border-blue-500">
                <div className="flex justify-between mb-4 border-b pb-2">
                  <h2 className="font-bold">{editingUser ? `Editando a: ${editingUser.name}` : 'Registrar Nuevo Personal'}</h2>
                  {editingUser && <button onClick={()=>setEditingUser(null)} className="text-sm text-red-500 underline">Cancelar Edición</button>}
                </div>
                <form onSubmit={handleUserSubmit} className="grid grid-cols-2 gap-4">
                  <input name="name" required placeholder="Nombre Completo" defaultValue={editingUser?.name} className="border p-2 rounded" />
                  <input name="email" type="email" required placeholder="Email" defaultValue={editingUser?.email} className="border p-2 rounded" />
                  <input name="password" placeholder="Contraseña (Opcional al editar)" defaultValue={editingUser ? editingUser.password : '123'} className="border p-2 rounded" />
                  <input name="curp" required placeholder="CURP" defaultValue={editingUser?.curp} className="border p-2 rounded uppercase" />
                  <input name="birthDate" type="date" required defaultValue={editingUser?.birthDate} className="border p-2 rounded" />
                  <select name="bloodType" defaultValue={editingUser?.bloodType} className="border p-2 rounded"><option value="">Tipo de Sangre</option><option value="A+">A+</option><option value="O+">O+</option><option value="B+">B+</option></select>
                  <input name="allergies" placeholder="Alergias" defaultValue={editingUser?.allergies} className="border p-2 rounded" />
                  <select name="role" defaultValue={editingUser?.role || 'bombero'} className="border p-2 rounded"><option value="bombero">Bombero</option><option value="admin">Admin</option></select>
                  <input name="rate" type="number" placeholder="Tarifa ($/hr)" defaultValue={editingUser?.rate} className="border p-2 rounded" />
                  <button className={`col-span-2 text-white p-2 rounded ${editingUser ? 'bg-blue-600' : 'bg-slate-800'}`}>{editingUser ? 'Actualizar Datos' : 'Registrar Usuario'}</button>
                </form>
              </div>
              
              <div className="bg-white p-6 rounded shadow">
                <h2 className="font-bold mb-4">Directorio</h2>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50"><tr><th>Nombre</th><th>CURP</th><th>Rol</th><th>Tarifa</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b hover:bg-slate-50">
                        <td className="p-2">{u.name}<br/><span className="text-xs text-slate-400">{u.email}</span></td>
                        <td className="p-2 text-xs font-mono">{u.curp}</td>
                        <td className="p-2 capitalize">{u.role}</td>
                        <td className="p-2 font-bold">${u.rate}</td>
                        <td className="p-2 flex gap-2">
                          <button onClick={()=>startEditingUser(u)} className="text-blue-600 hover:bg-blue-100 p-1 rounded" title="Editar Datos Completos"><Edit size={16}/></button>
                          {u.role!=='admin' && <button onClick={()=>handleDeleteUser(u.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={16}/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NÓMINA */}
          {view === 'payroll' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
                <div className="flex justify-between mb-4"><h2 className="font-bold flex gap-2"><DollarSign/> Resumen</h2><select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="border rounded p-1">{months.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                <table className="w-full text-sm"><thead className="bg-slate-100"><tr><th>Empleado</th><th className="text-center">Eventos</th><th className="text-right">Total</th></tr></thead><tbody>{summary.map((s,i)=>(<tr key={i} className="border-b"><td className="p-2">{s.name}</td><td className="text-center">{s.shifts}</td><td className="text-right font-bold text-green-700">${s.total}</td></tr>))}</tbody></table>
              </div>
              <div className="bg-white p-6 rounded shadow"><h2 className="font-bold mb-4 flex gap-2"><History/> Histórico</h2>{Object.keys(history).sort().reverse().map(m=>(<div key={m} className="mb-4 border rounded"><div className="bg-slate-800 text-white p-2 font-bold">{m}</div><table className="w-full text-sm"><tbody>{history[m].map(i=>(<tr key={i.id} className="border-b"><td className="p-2">{i.workerName}</td><td className="p-2">{i.eventName} {i.autoClosed && <span className="text-red-500 text-[10px] border border-red-200 px-1 rounded">AUTO</span>}</td><td className="p-2 text-right font-bold text-green-700">${i.totalPay}</td></tr>))}</tbody></table></div>))}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- PANEL BOMBERO ---
function FirefighterDashboard({ user, onLogout, events, assignments, shifts, currentUserData, dbAdd, dbUpdate, dbDelete }) {
  const [tab, setTab] = useState('my-events');
  const [overtime, setOvertime] = useState({});
  const [showOvertime, setShowOvertime] = useState({});

  const myEventIds = assignments.filter(a => a.userId === user.id).map(a => a.eventId);
  const myEvents = events.filter(e => myEventIds.includes(e.id));
  const available = events.filter(e => !myEventIds.includes(e.id) && assignments.filter(a => a.eventId === e.id).length < e.quota && e.deadline >= new Date().toISOString().split('T')[0]);
  
  const history = shifts.filter(s => s.userId === user.id && s.endTime).map(s => {
    const e = events.find(ev => ev.id === s.eventId);
    const r = s.historicRate || user.rate;
    return { ...s, eventName: e?.name, date: e?.date, pay: (5*r) + (Math.round(s.overtime||0)*r) };
  });

  const handleClockIn = async (id) => dbAdd(COLS.SHIFTS, { userId: user.id, eventId: id, startTime: new Date().toISOString(), endTime: null, overtime: 0 });
  const handleClockOut = async (id) => {
    const s = shifts.find(sh => sh.userId === user.id && sh.eventId === id && !sh.endTime);
    if (s) dbUpdate(COLS.SHIFTS, s.id, { endTime: new Date().toISOString(), historicRate: currentUserData.rate });
  };
  const saveOvertime = async (id) => { await dbUpdate(COLS.SHIFTS, id, { overtime: parseFloat(overtime[id]||0) }); alert("Guardado."); setShowOvertime({...showOvertime, [id]: false}); };

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-red-700 text-white p-4 flex justify-between shadow-lg"><div className="flex gap-2 font-bold items-center"><User/> Portal Bombero</div><div className="flex gap-4 items-center"><span className="text-sm">Hola, {user.name}</span><button onClick={onLogout} className="text-xs bg-red-800 px-3 py-1 rounded hover:bg-red-900">Salir</button></div></nav>
      <div className="flex justify-center bg-white shadow mb-6">
        <button onClick={()=>setTab('my-events')} className={`p-3 ${tab==='my-events'?'text-red-600 border-b-2 border-red-600':''}`}>Mis Eventos</button>
        <button onClick={()=>setTab('available')} className={`p-3 ${tab==='available'?'text-red-600 border-b-2 border-red-600':''}`}>Disponibles</button>
        <button onClick={()=>setTab('history')} className={`p-3 ${tab==='history'?'text-red-600 border-b-2 border-red-600':''}`}>Historial</button>
        <button onClick={()=>setTab('profile')} className={`p-3 ${tab==='profile'?'text-red-600 border-b-2 border-red-600':''}`}>Mi Perfil</button>
      </div>
      <main className="max-w-4xl mx-auto p-6">
        
        {/* TAB: PERFIL */}
        {tab === 'profile' && (
          <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-red-600">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-slate-100 p-4 rounded-full"><FileBadge size={48} className="text-slate-600"/></div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{currentUserData.name}</h2>
                <p className="text-slate-500">{currentUserData.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded border">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Información Laboral</p>
                <div className="mt-2 space-y-2">
                  <p className="text-sm"><strong>Rol:</strong> <span className="capitalize">{currentUserData.role}</span></p>
                  <p className="text-sm"><strong>Tarifa Actual:</strong> ${currentUserData.rate}/hora</p>
                  <p className="text-sm"><strong>ID Sistema:</strong> {currentUserData.id.substring(0,8)}...</p>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded border border-blue-100">
                <p className="text-xs text-blue-400 uppercase tracking-wider font-bold">Información Médica y Personal</p>
                <div className="mt-2 space-y-2">
                  <p className="text-sm"><strong>CURP:</strong> <span className="font-mono">{currentUserData.curp}</span></p>
                  <p className="text-sm"><strong>Fecha Nacimiento:</strong> {currentUserData.birthDate}</p>
                  <p className="text-sm"><strong>Tipo de Sangre:</strong> <span className="bg-red-200 text-red-800 px-1 rounded font-bold text-xs">{currentUserData.bloodType}</span></p>
                  <p className="text-sm"><strong>Alergias:</strong> {currentUserData.allergies || 'Ninguna'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'my-events' && myEvents.map(e => {
          const active = shifts.find(s => s.userId === user.id && s.eventId === e.id && !s.endTime);
          const completed = shifts.find(s => s.userId === user.id && s.eventId === e.id && s.endTime);
          return (
            <div key={e.id} className="bg-white rounded shadow p-6 mb-4 border-l-4 border-red-600 flex justify-between">
              <div><h3 className="font-bold text-lg">{e.name}</h3><p className="text-slate-500">{e.date} | {e.startTime} - {e.endTime}</p></div>
              <div>
                {completed ? (
                  <div className="text-right">
                    <button disabled className="bg-slate-300 text-slate-500 px-4 py-2 rounded mb-2 flex items-center gap-1"><CheckCircle size={16}/> Completado</button>
                    <div className="text-sm"><input type="checkbox" checked={showOvertime[completed.id]||false} onChange={ev=>setShowOvertime({...showOvertime, [completed.id]: ev.target.checked})}/> Extra?</div>
                    {showOvertime[completed.id] && <div className="flex gap-1 mt-1 animate-in fade-in"><input className="w-16 border rounded p-1" placeholder="Hrs" onChange={ev=>setOvertime({...overtime, [completed.id]: ev.target.value})}/><button onClick={()=>saveOvertime(completed.id)} className="bg-slate-800 text-white px-2 rounded text-xs">OK</button></div>}
                    {completed.overtime > 0 && <p className="text-xs text-green-600 font-bold">+{completed.overtime}h extra</p>}
                  </div>
                ) : active ? <button onClick={()=>handleClockOut(e.id)} className="bg-red-600 text-white px-6 py-3 rounded shadow hover:bg-red-700">Finalizar Turno</button> : <button onClick={()=>handleClockIn(e.id)} className="bg-green-600 text-white px-6 py-3 rounded shadow hover:bg-green-700 flex items-center gap-2"><Clock/> Iniciar</button>}
              </div>
            </div>
          )
        })}
        {tab === 'available' && available.map(e => (<div key={e.id} className="bg-white rounded shadow p-6 mb-4 flex justify-between items-center"><div><h3 className="font-bold text-lg">{e.name}</h3><p className="text-slate-500">{e.date} | {e.location}</p></div><button onClick={()=>dbAdd(COLS.ASSIGNMENTS, {eventId: e.id, userId: user.id})} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-1"><Plus size={16}/> Inscribirme</button></div>))}
        {tab === 'history' && <div className="bg-white rounded shadow overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr><th className="p-4">Evento</th><th>Fecha</th><th className="text-right p-4">Pago</th></tr></thead><tbody>{history.map(h=>(<tr key={h.id} className="border-b hover:bg-slate-50"><td className="p-4 font-medium">{h.eventName}</td><td className="text-slate-500">{h.date}</td><td className="text-right p-4 font-bold text-green-700">${h.pay.toFixed(2)}</td></tr>))}</tbody></table></div>}
      </main>
    </div>
  );
}