import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GLOBAL_PACKS } from '../data/globalPacks';
import { supabase, supabaseReady, uploadPackImage, createPack, addPackItem, fetchUserPacks } from '../lib/supabase';
import useStore from '../store/useStore';

export default function PackSelector({ onClose }) {
  const { username, setPack } = useStore();
  const [tab, setTab] = useState('global'); // 'global' | 'custom'
  const [userPacks, setUserPacks] = useState([]);
  const [loadingUserPacks, setLoadingUserPacks] = useState(false);

  // Custom pack creation state
  const [creating, setCreating] = useState(false);
  const [packName, setPackName] = useState('');
  const [uploadedItems, setUploadedItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSelectGlobal = (pack) => {
    setPack(pack);
    onClose();
  };

  const handleTabChange = async (t) => {
    setTab(t);
    if (t === 'custom' && supabaseReady && username) {
      setLoadingUserPacks(true);
      try {
        const packs = await fetchUserPacks(username);
        setUserPacks(packs.map(p => ({
          ...p,
          items: (p.pack_items || []).map(item => ({
            id: item.id,
            name: item.name,
            imageUrl: item.image_url,
          })),
        })));
      } catch (e) {
        console.error('Error loading user packs:', e);
      } finally {
        setLoadingUserPacks(false);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newItems = [];
    for (const file of files) {
      try {
        let imageUrl;
        if (supabaseReady) {
          imageUrl = await uploadPackImage(file);
        } else {
          // Fallback: create object URL for local preview (not persisted)
          imageUrl = URL.createObjectURL(file);
        }
        newItems.push({
          id: `local-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          imageUrl,
          file,
        });
      } catch (err) {
        console.error('Upload failed for', file.name, err);
      }
    }
    setUploadedItems(prev => [...prev, ...newItems]);
    setUploading(false);
    e.target.value = '';
  };

  const handleSaveCustomPack = async () => {
    if (!packName.trim() || uploadedItems.length < 2) return;
    setUploading(true);
    try {
      let pack;
      if (supabaseReady) {
        pack = await createPack(packName, username);
        for (let i = 0; i < uploadedItems.length; i++) {
          const item = uploadedItems[i];
          await addPackItem(pack.id, item.name, item.imageUrl, i);
        }
        setPack({
          id: pack.id,
          name: packName,
          items: uploadedItems.map((item, i) => ({
            id: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
          })),
        });
      } else {
        // No Supabase: use locally
        setPack({
          id: `local-pack-${Date.now()}`,
          name: packName,
          items: uploadedItems.map(item => ({
            id: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
          })),
        });
      }
      onClose();
    } catch (err) {
      console.error('Error saving pack:', err);
    } finally {
      setUploading(false);
    }
  };

  const updateItemName = (id, name) => {
    setUploadedItems(prev => prev.map(item => item.id === id ? { ...item, name } : item));
  };

  const removeItem = (id) => {
    setUploadedItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        id="pack-selector-modal"
        className="glass-card"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Modal header */}
        <div style={{
          padding: '24px 24px 0',
          borderBottom: '1px solid var(--kick-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: '700', fontSize: '1.2rem', margin: 0 }}>
              Select a Pack
            </h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--kick-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
            >✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px' }}>
            {[['global', '🌍 Global Packs'], ['custom', '✏️ My Packs']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === key ? '2px solid var(--kick-green)' : '2px solid transparent',
                  color: tab === key ? 'var(--kick-green)' : 'var(--kick-text-muted)',
                  fontWeight: tab === key ? '600' : '400',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            {tab === 'global' && (
              <motion.div
                key="global"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
              >
                {GLOBAL_PACKS.map((pack) => (
                  <motion.button
                    key={pack.id}
                    whileHover={{ scale: 1.02, borderColor: 'var(--kick-green)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectGlobal(pack)}
                    style={{
                      background: 'var(--kick-surface-2)',
                      border: '1px solid var(--kick-border)',
                      borderRadius: '10px',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{pack.name.split(' ')[0]}</div>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--kick-text)', marginBottom: '4px' }}>
                      {pack.name.slice(pack.name.indexOf(' ') + 1)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--kick-text-muted)', marginBottom: '8px' }}>
                      {pack.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--kick-green)' }}>
                      {pack.items.length} items
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {tab === 'custom' && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {!creating ? (
                  <div>
                    {/* Create new button */}
                    <motion.button
                      id="create-pack-btn"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setCreating(true)}
                      style={{
                        width: '100%',
                        background: 'rgba(83,252,24,0.05)',
                        border: '1px dashed var(--kick-green)',
                        borderRadius: '10px',
                        padding: '16px',
                        cursor: 'pointer',
                        color: 'var(--kick-green)',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        marginBottom: '16px',
                      }}
                    >
                      + Create New Pack
                    </motion.button>

                    {/* User's saved packs */}
                    {loadingUserPacks ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--kick-text-muted)' }}>
                        Loading your packs…
                      </div>
                    ) : userPacks.length === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '30px',
                        color: 'var(--kick-text-dim)', fontSize: '0.875rem',
                      }}>
                        {supabaseReady ? "No saved packs yet. Create your first one!" : "🔧 Supabase not configured — packs will work locally only."}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {userPacks.map(pack => (
                          <motion.button
                            key={pack.id}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => { setPack(pack); onClose(); }}
                            style={{
                              background: 'var(--kick-surface-2)',
                              border: '1px solid var(--kick-border)',
                              borderRadius: '10px',
                              padding: '14px 16px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--kick-text)' }}>{pack.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--kick-text-muted)', marginTop: '2px' }}>{pack.items.length} items</div>
                            </div>
                            <span style={{ color: 'var(--kick-green)', fontSize: '0.8rem' }}>Select →</span>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Custom pack creator */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--kick-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Pack Name
                      </label>
                      <input
                        className="kick-input"
                        placeholder="e.g. My Pokémon Team"
                        value={packName}
                        onChange={e => setPackName(e.target.value)}
                        autoFocus
                      />
                    </div>

                    {/* Upload area */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--kick-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Upload Images
                      </label>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                          width: '100%',
                          background: 'var(--kick-surface-2)',
                          border: '1px dashed var(--kick-border)',
                          borderRadius: '10px',
                          padding: '24px',
                          cursor: uploading ? 'wait' : 'pointer',
                          color: 'var(--kick-text-muted)',
                          fontSize: '0.875rem',
                          textAlign: 'center',
                        }}
                      >
                        {uploading ? '⏳ Uploading…' : '📁 Click to upload images (PNG, JPG, WebP)'}
                      </motion.button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {/* Preview grid */}
                    <AnimatePresence>
                      {uploadedItems.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}
                        >
                          {uploadedItems.map((item) => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              style={{ position: 'relative' }}
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '6px', display: 'block' }}
                              />
                              <button
                                onClick={() => removeItem(item.id)}
                                style={{
                                  position: 'absolute', top: '4px', right: '4px',
                                  background: 'rgba(0,0,0,0.7)',
                                  border: 'none', color: '#fff',
                                  width: '18px', height: '18px',
                                  borderRadius: '50%',
                                  cursor: 'pointer', fontSize: '10px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >✕</button>
                              <input
                                value={item.name}
                                onChange={e => updateItemName(item.id, e.target.value)}
                                style={{
                                  width: '100%', background: 'var(--kick-surface)',
                                  border: 'none', color: 'var(--kick-text)',
                                  fontSize: '0.65rem', padding: '3px 4px',
                                  marginTop: '3px', borderRadius: '4px',
                                  fontFamily: 'Inter, sans-serif',
                                }}
                              />
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn-primary"
                        style={{ flex: 1 }}
                        disabled={!packName.trim() || uploadedItems.length < 2 || uploading}
                        onClick={handleSaveCustomPack}
                      >
                        {uploading ? 'Saving…' : `Use Pack (${uploadedItems.length} items)`}
                      </button>
                      <button className="btn-secondary" onClick={() => setCreating(false)}>
                        Back
                      </button>
                    </div>
                    {!supabaseReady && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--kick-text-dim)' }}>
                        ℹ Supabase not configured — this pack will only work this session.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
