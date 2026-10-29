import React, { useState } from 'react';
import { useController } from '../context/ControllerContext';
import { RelayCard } from '../components/dashboard/RelayCard';
import { Edit2, Check, X, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';

export const DevicesPage: React.FC = () => {
  const { channels, updateChannelMetadata, settings } = useController();
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
    <div className="w-full max-w-[1400px] space-y-5">
      <PageHeader
        eyebrow="NEXUS-2810 / RELAY CONTROL"
        title="Relay management"
        description="Control each circuit, inspect software command state, and assign local labels. Configure GPIO assignments in Settings."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {channels.map((channel) => {
          const isEditing = editingId === channel.id;
          return (
            <div key={channel.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3 items-stretch">
              <RelayCard channel={channel} />
              <div className="bg-elevated/80 border border-line rounded-2xl p-4 flex flex-col justify-between hover:border-accent/25 transition-colors duration-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">Local metadata</p>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(channel.id, channel.name, channel.room)}
                      aria-label={`Edit labels for channel 0${channel.id}`}
                      className="pressable h-11 w-11 flex items-center justify-center rounded-lg bg-canvas/60 border border-line text-ink-muted hover:text-accent hover:border-accent/40"
                    >
                      <Edit2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form
                    className="mt-3 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSave(channel.id);
                    }}
                  >
                    <div>
                      <label htmlFor={`name-${channel.id}`} className="block text-xs font-medium text-ink mb-1">
                        Channel name
                      </label>
                      <input
                        id={`name-${channel.id}`}
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="nexus-field"
                      />
                    </div>
                    <div>
                      <label htmlFor={`room-${channel.id}`} className="block text-xs font-medium text-ink mb-1">
                        Room
                      </label>
                      <input
                        id={`room-${channel.id}`}
                        type="text"
                        value={tempRoom}
                        onChange={(e) => setTempRoom(e.target.value)}
                        className="nexus-field"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        aria-label="Save labels"
                        className="min-h-11 px-3 rounded-lg bg-ok/15 text-ok border border-ok/30 inline-flex items-center gap-1.5 text-sm font-medium"
                      >
                        <Check size={16} aria-hidden="true" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel editing"
                        className="min-h-11 px-3 rounded-lg bg-elevated text-ink-muted border border-line inline-flex items-center gap-1.5 text-sm font-medium"
                      >
                        <X size={16} aria-hidden="true" />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium text-ink">{channel.name}</h3>
                    <p className="text-xs text-ink-muted mt-1">{channel.room}</p>
                    <p className="font-mono text-[11px] text-ink-muted mt-3">GPIO assignment: configurable in Settings</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="nexus-panel p-4 flex items-start gap-2 text-sm text-ink-muted">
        <ShieldCheck size={16} className="text-ok shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          {settings.apiMode === 'mock'
            ? 'Labels and relay commands are simulated in this browser; nothing here changes a physical ESP32.'
            : 'Channel labels are stored locally in this browser. GPIO assignments are validated and saved by the ESP32; reported states are software commands, not physical feedback.'}
        </span>
      </div>
    </div>
  );
};
