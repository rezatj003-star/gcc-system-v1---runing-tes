/**
 * UserManagement.jsx — FINAL REVISION
 * Update: Running Text Position (Below Navbar), Slower Animation, Distinct Items
 */

import { useState, useEffect } from 'react';
import { 
  getUsers, addUser, updateUser, deleteUser, toggleUser, changeUserPassword 
} from '../api';
import { useToast } from '../hooks/use-toast';

export default function UserManagement() {
  // ==============================
  // 1. LOGIC & STATE (TETAP SAMA)
  // ==============================
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedUser, setSelectedUser] = useState(null);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Filters
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { toast } = useToast();

  const [form, setForm] = useState({
    username: '', displayName: '', email: '', role: 'collection', password: '', isActive: true,
    modulePermissions: { collection: 'view', kasir: 'view', masterdata: 'view' },
  });

  useEffect(() => { loadUsers(true); }, []);

  const loadUsers = async (showLoadingScreen = true) => {
    try {
      if (showLoadingScreen) setLoading(true);
      const res = await getUsers();
      const dataUsers = Array.isArray(res) ? res : (res.data || res.users || []);
      setUsers(dataUsers);
      const storedLogs = localStorage.getItem('userLogs');
      if (storedLogs) setLogs(JSON.parse(storedLogs));
    } catch (err) {
      toast({ title: 'GLITCH DETECTED', description: 'Failed to sync user data', variant: 'destructive' });
    } finally {
      if (showLoadingScreen) setLoading(false);
    }
  };

  const addLog = (desc) => {
    const newLog = { id: `log_${Date.now()}`, time: new Date().toISOString(), description: desc };
    const newLogs = [newLog, ...logs].slice(0, 50);
    setLogs(newLogs);
    localStorage.setItem('userLogs', JSON.stringify(newLogs));
  };

  // CRUD HANDLERS
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        await addUser({ ...form, id: `user_${Date.now()}` });
        addLog(`SPAWNED USER: ${form.username}`);
        toast({ title: 'LEVEL UP!', description: 'New player joined the server.' });
      } else {
        await updateUser(selectedUser.id, form);
        addLog(`MODIFIED USER: ${form.username}`);
        toast({ title: 'PATCH APPLIED', description: 'User stats updated.' });
      }
      loadUsers(false); setShowModal(false);
    } catch (err) { toast({ title: 'ERROR', description: err.message, variant: 'destructive' }); }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) return;
    try {
      await changeUserPassword(passwordUser.id, newPassword);
      addLog(`KEY RESET: ${passwordUser.username}`);
      toast({ title: 'SECURE', description: 'New key generated.' });
      loadUsers(false); setShowPasswordModal(false);
    } catch (err) { toast({ title: 'ERROR', description: 'Access Denied', variant: 'destructive' }); }
  };

  const handleToggleUser = async (user) => {
    try { await toggleUser(user.id); addLog(`STATUS FLIP: ${user.username}`); loadUsers(false); } catch (err) { console.error(err); }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`PERMA-BAN ${user.username}?`)) return;
    try { await deleteUser(user.id); addLog(`BANNED: ${user.username}`); loadUsers(false); } catch (err) { console.error(err); }
  };

  // HANDLERS MODAL
  const openAdd = () => {
    setForm({ username: '', displayName: '', email: '', role: 'collection', password: '', isActive: true, modulePermissions: { collection: 'view', kasir: 'view', masterdata: 'view' } });
    setModalType('add'); setShowModal(true);
  };
  const openEdit = (u) => { setForm(u); setSelectedUser(u); setModalType('edit'); setShowModal(true); };
  const openPass = (u) => { setPasswordUser(u); setNewPassword(''); setShowPasswordModal(true); };

  const filteredUsers = users.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' && u.isActive) || (filterStatus === 'inactive' && !u.isActive);
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
    return matchRole && matchStatus && matchSearch;
  });

  // ==============================
  // 3. CSS STYLES (UPDATED FOR TICKER POSITION & SPEED)
  // ==============================
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap');

    /* ANIMASI SPINNING RGB BORDER */
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .neon-box {
      position: relative;
      overflow: hidden;
      z-index: 0;
      border-radius: 1rem;
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.8);
    }
    .neon-box::before {
      content: '';
      position: absolute;
      top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: conic-gradient(transparent, transparent, transparent, #ff0055, #00ffff, #ffff00, #ff0055);
      animation: spin 4s linear infinite;
      z-index: -2;
    }
    .neon-box::after {
      content: '';
      position: absolute;
      inset: 4px;
      background: #ffffff; 
      border-radius: 0.8rem;
      z-index: -1;
    }

    /* CARD 3D PUTIH */
    .card-3d-white {
      background: #ffffff;
      border: 4px solid #000000;
      box-shadow: 6px 6px 0px 0px #000000;
      transition: transform 0.1s;
    }
    .card-3d-white:hover {
      transform: translate(-2px, -2px);
      box-shadow: 10px 10px 0px 0px #00ffff;
    }

    /* RUNNING TEXT (MARQUEE) - UPDATED POSITION & SPEED */
    .ticker-container {
      width: 100%;
      overflow: hidden;
      background: #000;
      border-bottom: 2px solid #00ffff;
      border-top: 2px solid #ff00ff;
      margin-bottom: 2rem; /* Jarak ke judul */
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }
    
    .ticker-wrapper {
      display: flex;
    }

    .ticker {
      display: flex;
      white-space: nowrap;
      /* DURASI LEBIH LAMA = LEBIH PELAN (60s) */
      animation: ticker 60s linear infinite; 
    }

    .ticker-item {
      display: inline-block;
      padding-right: 150px; /* JARAK JAUH ANTAR TEKS */
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 0.9rem;
      color: #00ffff;
      text-shadow: 0 0 5px #00ffff;
    }
    
    /* Warna selang seling biar keren */
    .ticker-item:nth-child(even) {
       color: #ff00ff;
       text-shadow: 0 0 5px #ff00ff;
    }

    @keyframes ticker {
      0% { transform: translateX(0); }
      100% { transform: translateX(-100%); }
    }
  `;

  if (loading) return <div className="min-h-screen bg-[#050510] flex items-center justify-center text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-500 to-yellow-500 animate-pulse font-[Orbitron]">SYSTEM LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#050510] font-[Rajdhani] text-black overflow-hidden relative pb-10 pt-4">
      <style>{styles}</style>
      
      {/* BACKGROUND GLOW */}
      <div className="fixed top-20 left-[-10%] w-[500px] h-[500px] bg-purple-700 rounded-full mix-blend-screen filter blur-[150px] opacity-30 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-700 rounded-full mix-blend-screen filter blur-[150px] opacity-30 animate-pulse pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 px-6">
        
        {/* --- RUNNING TEXT (POSISI DI ATAS JUDUL) --- */}
        <div className="ticker-container rounded-lg">
          <div className="ticker-wrapper">
             <div className="ticker">
               {/* DUPLIKASI ITEM AGAR LOOPING MULUS */}
               {[...Array(2)].map((_, i) => (
                 <div key={i} className="flex">
                    <span className="ticker-item">/// SYSTEM ONLINE: SECURE CONNECTION ESTABLISHED</span>
                    <span className="ticker-item">/// WELCOME ADMINISTRATOR: ACCESS GRANTED</span>
                    <span className="ticker-item">/// SERVER STATUS: 100% STABLE</span>
                    <span className="ticker-item">/// REMINDER: BACKUP DATABASE EVERY FRIDAY</span>
                    <span className="ticker-item">/// NEW MODULES AVAILABLE FOR INSTALLATION</span>
                    <span className="ticker-item">/// GCC SYSTEM V2.0 READY TO DEPLOY</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-500 drop-shadow-[2px_2px_0_#fff] font-[Orbitron]">
              USER MANAGEMENT
            </h1>
            <p className="text-cyan-400 font-mono mt-1 font-bold bg-black/80 inline-block px-3 py-1 rounded border border-cyan-500">/// ADMIN_CONSOLE_V2.0</p>
          </div>
          <button 
            onClick={openAdd}
            className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-xl rounded-xl border-4 border-black shadow-[4px_4px_0px_#fff] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#00ffff] transition-all flex items-center gap-2 font-[Orbitron]"
          >
            <span>+</span> SPAWN USER
          </button>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <NeonCard title="TOTAL PLAYERS" value={users.length} color="text-purple-600" icon="👾" />
          <NeonCard title="ONLINE" value={users.filter(u => u.isActive).length} color="text-green-600" icon="🟢" />
          <NeonCard title="OFFLINE" value={users.filter(u => !u.isActive).length} color="text-red-600" icon="💀" />
          <NeonCard title="SESSIONS" value={users.length * 3} color="text-orange-600" icon="⚡" />
        </div>

        {/* SEARCH BAR & FILTERS */}
        <div className="card-3d-white p-5 rounded-xl flex flex-wrap gap-4 items-center relative mb-8">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input 
              className="w-full bg-gray-100 border-2 border-black focus:border-cyan-500 focus:bg-white rounded-lg py-3 pl-12 pr-4 text-black font-bold placeholder-gray-500 outline-none transition-all text-lg"
              placeholder="SEARCH USERNAME..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="bg-gray-100 border-2 border-black text-black font-bold py-3 px-6 rounded-lg outline-none cursor-pointer hover:bg-gray-200 uppercase text-lg"
            value={filterRole} onChange={e => setFilterRole(e.target.value)}
          >
            <option value="all">ALL ROLES</option>
            <option value="superadmin">SUPERADMIN</option>
            <option value="collection">COLLECTION</option>
            <option value="kasir">KASIR</option>
            <option value="masterdata">MASTERDATA</option>
          </select>
          <select 
            className="bg-gray-100 border-2 border-black text-black font-bold py-3 px-6 rounded-lg outline-none cursor-pointer hover:bg-gray-200 uppercase text-lg"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">ALL STATUS</option>
            <option value="active">ACTIVE</option>
            <option value="inactive">INACTIVE</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="card-3d-white rounded-xl overflow-hidden p-0 mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black text-white border-b-4 border-black font-[Orbitron]">
                <tr>
                  <th className="p-5 font-black uppercase tracking-widest text-sm">Username</th>
                  <th className="p-5 font-black uppercase tracking-widest text-sm">Profile Info</th>
                  <th className="p-5 font-black uppercase tracking-widest text-sm text-center">Class</th>
                  <th className="p-5 font-black uppercase tracking-widest text-sm text-center">Status</th>
                  <th className="p-5 font-black uppercase tracking-widest text-sm text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black text-black bg-white">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-cyan-50 transition-colors group text-lg">
                    <td className="p-5">
                      <div className="font-black text-black text-xl font-[Orbitron]">{user.username}</div>
                    </td>
                    <td className="p-5">
                      <div className="text-black font-bold">{user.displayName}</div>
                      <div className="text-gray-600 text-sm font-mono font-bold">{user.email}</div>
                    </td>
                    <td className="p-5 text-center">
                      <BadgeRole role={user.role} />
                    </td>
                    <td className="p-5 text-center">
                      <div className={`inline-block px-4 py-1 rounded-full border-2 border-black font-bold text-sm ${user.isActive ? 'bg-green-300' : 'bg-red-300'}`}>
                        {user.isActive ? 'ONLINE' : 'BANNED'}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-3">
                        <BtnIcon onClick={() => openEdit(user)} icon="✏️" bg="bg-yellow-300" title="Edit Stats" />
                        <BtnIcon onClick={() => openPass(user)} icon="🔑" bg="bg-cyan-300" title="Change Key" />
                        <BtnIcon onClick={() => handleToggleUser(user)} icon="⚡" bg={user.isActive ? "bg-red-300" : "bg-green-300"} title="Toggle Status" />
                        <BtnIcon onClick={() => handleDeleteUser(user)} icon="🗑️" bg="bg-gray-300" title="Delete" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && <div className="p-10 text-center font-black text-gray-400 text-2xl bg-white">NO PLAYERS FOUND</div>}
        </div>

        {/* LOGS */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-3d-white p-6 rounded-xl">
            <h3 className="text-2xl font-black text-pink-600 mb-4 uppercase font-[Orbitron] flex items-center gap-2">
               <span className="text-3xl">🚀</span> Latest Spawns
            </h3>
            <div className="space-y-3">
              {users.slice(0, 4).map(u => (
                <div key={u.id} className="bg-gray-100 p-3 rounded border-2 border-black flex justify-between items-center hover:bg-yellow-100 transition-colors">
                  <span className="text-black font-black text-lg">{u.username}</span>
                  <span className="text-xs text-white bg-black px-2 py-1 rounded font-mono font-bold">{u.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card-3d-white p-6 rounded-xl">
            <h3 className="text-2xl font-black text-green-600 mb-4 uppercase font-[Orbitron] flex items-center gap-2">
               <span className="text-3xl">📟</span> System Logs
            </h3>
            <div className="h-40 overflow-y-auto space-y-2 pr-2 font-mono text-sm border-2 border-black p-2 bg-black text-green-400 rounded">
              {logs.map(log => (
                <div key={log.id} className="border-b border-gray-800 pb-1">
                  <span className="text-purple-400 font-bold">[{new Date(log.time).toLocaleTimeString()}]</span> {log.description}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* --- MODALS --- */}
      {showModal && (
        <Modal3D title={modalType === 'add' ? 'NEW CHARACTER' : 'EDIT STATS'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input3D label="USERNAME" value={form.username} onChange={e => setForm({...form, username: e.target.value})} disabled={modalType === 'edit'} />
              <Input3D label="DISPLAY NAME" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
              <Input3D label="EMAIL" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <div>
                <label className="block font-black text-black mb-1 text-sm font-[Orbitron]">CLASS (ROLE)</label>
                <select className="w-full bg-white border-4 border-black text-black p-3 rounded-lg font-bold outline-none focus:bg-yellow-50 text-lg uppercase"
                  value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="superadmin">SUPERADMIN</option>
                  <option value="collection">COLLECTION</option>
                  <option value="kasir">KASIR</option>
                  <option value="masterdata">MASTERDATA</option>
                </select>
              </div>
              {modalType === 'add' && <Input3D label="PASSWORD" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />}
              
              <div className="bg-gray-100 p-3 rounded border-2 border-black flex justify-center gap-4">
                 <label className="flex items-center gap-2 font-black cursor-pointer text-green-700 text-lg"><input type="radio" checked={form.isActive} onChange={() => setForm({...form, isActive: true})} className="w-5 h-5 accent-green-600" /> ACTIVE</label>
                 <label className="flex items-center gap-2 font-black cursor-pointer text-red-700 text-lg"><input type="radio" checked={!form.isActive} onChange={() => setForm({...form, isActive: false})} className="w-5 h-5 accent-red-600" /> BANNED</label>
              </div>
            </div>

            <div className="bg-white p-4 rounded border-2 border-black mt-2">
              <div className="text-sm font-black text-black mb-3 uppercase font-[Orbitron]">Skill Tree (Permissions)</div>
              <div className="grid grid-cols-3 gap-3">
                 {Object.keys(form.modulePermissions).map(mod => (
                    <div key={mod} className="bg-gray-100 p-2 rounded border border-gray-300">
                       <div className="text-xs uppercase text-black font-black mb-1">{mod}</div>
                       <select className="w-full bg-white text-black text-xs border-2 border-black rounded font-bold p-1 uppercase"
                         value={form.modulePermissions[mod]} onChange={e => setForm(p => ({...p, modulePermissions: {...p.modulePermissions, [mod]: e.target.value}}))}>
                         <option value="none">LOCKED</option>
                         <option value="view">VIEW</option>
                         <option value="edit">EDIT</option>
                       </select>
                    </div>
                 ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button className="flex-1 py-3 bg-green-400 text-black font-black rounded-lg border-2 border-black text-xl hover:bg-green-300 shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all">SAVE</button>
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-red-400 text-black font-black rounded-lg border-2 border-black text-xl hover:bg-red-300 shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all">CANCEL</button>
            </div>
          </form>
        </Modal3D>
      )}

      {showPasswordModal && (
        <Modal3D title="OVERRIDE PASSWORD" onClose={() => setShowPasswordModal(false)} maxWidth="max-w-md">
           <div className="mb-4 text-center font-mono text-black font-bold text-lg">TARGET: <span className="bg-yellow-300 px-2 border border-black">{passwordUser?.username}</span></div>
           <Input3D label="NEW CREDENTIAL" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus />
           <button onClick={handleChangePassword} className="w-full mt-6 py-3 bg-yellow-400 text-black font-black rounded-lg border-2 border-black text-xl hover:bg-yellow-300 shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all">CONFIRM</button>
        </Modal3D>
      )}

    </div>
  );
}

// ==============================
// 4. COMPONENTS
// ==============================

function NeonCard({ title, value, color, icon }) {
  return (
    <div className="neon-box p-[3px]">
      <div className="bg-white h-full w-full rounded-[0.6rem] p-5 flex flex-col justify-between items-center relative z-10">
         <div className="text-5xl mb-2 drop-shadow-sm">{icon}</div>
         <div className="text-6xl font-black text-black drop-shadow-[2px_2px_0_rgba(0,0,0,0.1)]">{value}</div>
         <div className={`font-black font-[Orbitron] text-sm tracking-widest ${color}`}>{title}</div>
      </div>
    </div>
  );
}

function BadgeRole({ role }) {
  const styles = {
    superadmin: 'bg-red-200 text-red-900 border-red-900',
    collection: 'bg-cyan-200 text-cyan-900 border-cyan-900',
    kasir: 'bg-green-200 text-green-900 border-green-900',
    masterdata: 'bg-purple-200 text-purple-900 border-purple-900',
  };
  return (
    <span className={`inline-block px-3 py-1 font-black text-xs uppercase border-2 rounded shadow-sm ${styles[role] || 'bg-gray-200 text-black border-black'}`}>
      {role}
    </span>
  );
}

function BtnIcon({ onClick, icon, bg, title }) {
  return (
    <button 
      onClick={onClick} 
      title={title}
      className={`${bg} w-10 h-10 flex items-center justify-center rounded-lg border-2 border-black text-xl shadow-[3px_3px_0px_#000] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all text-black`}
    >
      {icon}
    </button>
  );
}

function Input3D({ label, type="text", value, onChange, disabled, autoFocus }) {
  return (
    <div>
      <label className="block font-black text-black mb-1 text-sm font-[Orbitron]">{label}</label>
      <input type={type} value={value} onChange={onChange} disabled={disabled} autoFocus={autoFocus} 
        className="w-full bg-white border-4 border-black text-black p-3 rounded-lg font-bold outline-none focus:bg-yellow-50 focus:border-cyan-500 focus:shadow-[4px_4px_0px_#000] transition-all disabled:opacity-50 disabled:bg-gray-200 text-lg" />
    </div>
  );
}

function Modal3D({ children, title, onClose, maxWidth="max-w-2xl" }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white w-full ${maxWidth} border-4 border-black rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.4)] relative animate-bounce-in overflow-hidden`}>
        <div className="bg-black p-4 border-b-4 border-black flex justify-between items-center">
          <h2 className="text-3xl font-black text-white italic tracking-tighter font-[Orbitron]">{title}</h2>
          <button onClick={onClose} className="bg-white text-black w-8 h-8 rounded-full font-bold hover:bg-red-500 hover:text-white transition-colors border-2 border-black flex items-center justify-center">✕</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        .animate-bounce-in { animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
}