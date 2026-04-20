import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { supabase, uploadPackImage, createPack, addPackItem } from '../lib/supabase';

// Simple default password for now
const ADMIN_PASS = 'admin123';

export default function AdminDashboard({ onClose }) {
  const { customPacks, officialPacks, deletePack, fetchGlobalPacks } = useStore();
  const [isAuth, setIsAuth] = useState(false);
  const [passInput, setPassInput] = useState('');
  
  const [tab, setTab] = useState('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passInput === ADMIN_PASS) setIsAuth(true);
    else alert('Incorrect password');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newItems = [];
    for (const file of files) {
      try {
        const url = await uploadPackImage(file);
        newItems.push({ 
          id: `tmp-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          imageUrl: url 
        });
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setItems([...items, ...newItems]);
    setUploading(false);
  };

  const removeItem = (id) => setItems(items.filter(it => it.id !== id));
  
  const updateItemName = (id, newName) => {
    setItems(items.map(it => it.id === id ? { ...it, name: newName } : it));
  };

  const handleSave = async () => {
    if (!name.trim() || items.length < 2) return alert('Pack name and 2+ items required');
    setUploading(true);
    try {
      const pack = await createPack(name, description, isOfficial);
      for (let i = 0; i < items.length; i++) {
        await addPackItem(pack.id, items[i].name, items[i].imageUrl, i);
      }
      alert(`Pack "${name}" saved to Tierly Gallery!`);
      setName('');
      setDescription('');
      setItems([]);
      fetchGlobalPacks();
      setTab('manage');
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const allPacks = [...officialPacks, ...customPacks];

  if (!isAuth) {
    return (
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
        <motion.div className="glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} style={{ width: '320px', padding: '32px' }}>
           <h3 style={{ margin: '0 0 16px', textAlign: 'center' }}>🔒 Admin Access</h3>
           <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="password" 
                className="kick-input" 
                autoFocus 
                placeholder="Enter password..." 
                value={passInput} 
                onChange={e => setPassInput(e.target.value)} 
              />
              <button className="btn-primary" type="submit">Unlock Dashboard</button>
              <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
           </form>
           <p style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '12px', color: 'var(--kick-text-dim)' }}>Default: admin123</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <motion.div
        className="glass-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--kick-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Space Grotesk' }}>Tierly Creator</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--kick-text-muted)' }}>Create packs that the whole world can play</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--kick-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--kick-border)' }}>
          <button onClick={() => setTab('create')} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: tab === 'create' ? 'var(--kick-green)' : 'var(--kick-text-muted)', borderBottom: tab === 'create' ? '2px solid var(--kick-green)' : 'none', cursor: 'pointer', fontWeight: '600' }}>Create New</button>
          <button onClick={() => setTab('manage')} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: tab === 'manage' ? 'var(--kick-green)' : 'var(--kick-text-muted)', borderBottom: tab === 'manage' ? '2px solid var(--kick-green)' : 'none', cursor: 'pointer', fontWeight: '600' }}>Manage ({allPacks.length})</button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <AnimatePresence mode="wait">
            {tab === 'create' ? (
              <motion.div key="create" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 3 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--kick-text-muted)' }}>Pack Name</label>
                    <input className="kick-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Anime Openings" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--kick-text-muted)' }}>Type</label>
                    <select className="kick-input" value={String(isOfficial)} onChange={e => setIsOfficial(e.target.value === 'true')}>
                      <option value="false">Community</option>
                      <option value="true">Official</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--kick-text-muted)' }}>Upload Images</label>
                  <button className="btn-secondary" style={{ width: '100%', padding: '20px', border: '2px dashed var(--kick-border)' }} onClick={() => fileInputRef.current.click()} disabled={uploading}>
                    {uploading ? '⏳ Working...' : '📁 Click to upload images (PNG, JPG, etc)'}
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                </div>
                {/* Item List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {items.map(it => (
                    <div key={it.id} style={{ position: 'relative', border: '1px solid var(--kick-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={it.imageUrl} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                      <input 
                        value={it.name} 
                        onChange={e => updateItemName(it.id, e.target.value)} 
                        style={{ width: '100%', border: 'none', background: 'var(--kick-surface-2)', fontSize: '0.6rem', padding: '4px', color: 'var(--kick-text)' }}
                      />
                      <button onClick={() => removeItem(it.id)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="manage" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allPacks.map(p => (
                  <div key={p.id} style={{ background: 'var(--kick-surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--kick-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: p.is_official ? 'var(--kick-green)' : 'var(--kick-border)', color: p.is_official ? '#000' : '#fff', marginRight: '8px' }}>{p.is_official ? 'OFFICIAL' : 'COMMUNITY'}</span>
                      <strong style={{ fontSize: '0.9rem' }}>{p.name}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--kick-text-muted)' }}>{p.items?.length || 0} items</div>
                    </div>
                    <button onClick={() => deletePack(p.id)} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--kick-border)', display: 'flex', gap: '12px', background: 'var(--kick-surface-2)' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={uploading}>Cancel</button>
          {tab === 'create' && (
            <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={uploading || items.length < 2}>
              {uploading ? 'Processing Gallery...' : '🚀 Publish Pack to Global Discovery'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
