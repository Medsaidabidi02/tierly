import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

export default function AdminDashboard({ onClose }) {
  const { addCustomPack, customPacks, deletePack } = useStore();
  const [tab, setTab] = useState('create'); // 'create' | 'manage'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([{ name: '', imageUrl: '' }]);

  const addItem = () => setItems([...items, { name: '', imageUrl: '' }]);
  
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return alert('Pack name is required');
    const validItems = items.filter(item => item.name.trim() && item.imageUrl.trim());
    if (validItems.length < 2) return alert('At least two items with name and image URL are required');

    addCustomPack({
      id: `custom-${Date.now()}`,
      name,
      description,
      items: validItems.map((it, idx) => ({ ...it, id: `it-${Date.now()}-${idx}` }))
    });
    
    setName('');
    setDescription('');
    setItems([{ name: '', imageUrl: '' }]);
    setTab('manage');
    alert('Pack saved to Global Shared Gallery!');
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this pack from the global gallery?')) {
      deletePack(id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{
        background: 'var(--kick-surface)', border: '1px solid var(--kick-border)',
        borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--kick-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>Admin Dashboard</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--kick-text-muted)' }}>Manage Global Shared Gallery</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--kick-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--kick-border)' }}>
          <button 
            onClick={() => setTab('create')}
            style={{ 
              flex: 1, padding: '12px', background: 'none', border: 'none', 
              color: tab === 'create' ? 'var(--kick-green)' : 'var(--kick-text-muted)',
              borderBottom: tab === 'create' ? '2px solid var(--kick-green)' : 'none',
              cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s'
            }}
          >Create Pack</button>
          <button 
            onClick={() => setTab('manage')}
            style={{ 
              flex: 1, padding: '12px', background: 'none', border: 'none', 
              color: tab === 'manage' ? 'var(--kick-green)' : 'var(--kick-text-muted)',
              borderBottom: tab === 'manage' ? '2px solid var(--kick-green)' : 'none',
              cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s'
            }}
          >Manage Gallery ({customPacks.length})</button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <AnimatePresence mode="wait">
            {tab === 'create' ? (
              <motion.div 
                key="create" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--kick-text-muted)' }}>Pack Name</label>
                  <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Best Pizza Toppings" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--kick-text-muted)' }}>Description</label>
                  <input className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Items</h3>
                  <button className="btn-secondary" onClick={addItem} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>+ Add Item</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--kick-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}><input className="input-field" style={{ fontSize: '0.8rem', padding: '8px' }} placeholder="Item Name" value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} /></div>
                        <button onClick={() => removeItem(index)} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                      </div>
                      <input className="input-field" style={{ fontSize: '0.8rem', padding: '8px' }} placeholder="Image URL" value={item.imageUrl} onChange={e => updateItem(index, 'imageUrl', e.target.value)} />
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="manage" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {customPacks.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px', color: 'var(--kick-text-muted)' }}>No shared packs found.</p>
                ) : (
                  customPacks.map(pack => (
                    <div key={pack.id} style={{ 
                      background: 'var(--kick-surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--kick-border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--kick-text)' }}>{pack.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--kick-text-muted)' }}>{pack.items?.length || 0} items • Created {new Date(pack.created_at).toLocaleDateString()}</div>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(pack.id, e)}
                        style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >Delete</button>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--kick-border)', display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Close</button>
          {tab === 'create' && (
            <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save to Shared Gallery</button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
