import React, { useState } from 'react';
import { useController } from '../context/ControllerContext';
import { Edit2, Check, X, ShieldCheck } from 'lucide-react';

export const DevicesPage: React.FC = () => {
  const { channels, updateChannelMetadata } = useController();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempRoom, setTempRoom] = useState('');

  const handleStartEdit = (id: number, name: string, room: string) => {
    setEditingId(id);
    setTempName(name);
    setTempRoom(room);
  };

  const handleSave = (id: number) => {
    if (tempName.trim()) {
      updateChannelMetadata(id, tempName.trim(), tempRoom.trim() || 'General');
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Channel Configuration</h2>
        <p className="text-xs text-slate-400 mt-0.5">Assign human-friendly labels and room allocations.</p>
      </div>

      <div className="space-y-2.5">
        {channels.map((channel) => {
          const isEditing = editingId === channel.id;
          return (
            <div key={channel.id} className="bg-[#0f172a]/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex-1 pr-3">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono uppercase bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700">
                    Channel 0{channel.id}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">GPIO Pin: Fixed</span>
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder="Device Name"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="text"
                      value={tempRoom}
                      onChange={(e) => setTempRoom(e.target.value)}
                      placeholder="Room"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                ) : (
                  <div className="mt-1.5">
                    <h3 className="text-sm font-medium text-slate-200">{channel.name}</h3>
                    <p className="text-xs text-slate-400">{channel.room}</p>
                  </div>
                )}
              </div>

              <div>
                {isEditing ? (
                  <div className="flex items-center space-x-1.5">
                    <button onClick={() => handleSave(channel.id)} className="p-2 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handleStartEdit(channel.id, channel.name, channel.room)} className="p-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg">
                    <Edit2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-2 text-xs text-slate-400">
        <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
        <span>Hardware GPIO configurations are locked in ESP32 firmware for electrical safety.</span>
      </div>
    </div>
  );
};
