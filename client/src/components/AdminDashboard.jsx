import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';

export default function AdminDashboard({ onClose }) {
  const { addCustomPack } = useStore();
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
    if (validItems.length === 0) return alert('At least one item with name and image URL is required');

    addCustomPack({
      id: `custom-${Date.now()}`,
      name,
      description,
      items: validItems.map((it, idx) => ({ ...it, id: `it-${Date.now()}-${idx}` }))
    });
    
    alert('Pack saved and added to selector!');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{
        background: 'var(--kick-surface)',
        border: '1px solid var(--kick-border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--kick-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>Create New Pack</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--kick-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--kick-text-muted)' }}>Pack Name</label>
            <input 
              className="input-field" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Best Pizza Toppings"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--kick-text-muted)' }}>Description</label>
            <input 
              className="input-field" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Short description..."
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--kick-border)', margin: '8px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Items</h3>
            <button className="btn-secondary" onClick={addItem} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>+ Add Item</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item, index) => (
              <div key={index} style={{ 
                background: 'rgba(255,255,255,0.03)', 
                padding: '12px', 
                borderRadius: '12px', 
                border: '1px solid var(--kick-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <input 
                      className="input-field" 
                      style={{ fontSize: '0.8rem', padding: '8px' }}
                      placeholder="Item Name"
                      value={item.name}
                      onChange={e => updateItem(index, 'name', e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => removeItem(index)}
                    style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
                <input 
                  className="input-field" 
                  style={{ fontSize: '0.8rem', padding: '8px' }}
                  placeholder="Image URL (direct link)"
                  value={item.imageUrl}
                  onChange={e => updateItem(index, 'imageUrl', e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--kick-border)', display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Pack</button>
        </div>
      </div>
    </motion.div>
  );
}
