'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface Captain {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  skills: Array<{ skill: string; certified_at: string; expires_at: string }>;
  today_assignments: number;
  month_completed_trips: number;
}

const SKILL_OPTIONS = [
  'ocean_navigation', 'river_navigation', 'night_navigation',
  'snorkeling_guide', 'fishing_guide', 'diving_certified',
  'first_aid', 'vhf_radio', 'guest_relations',
];

export default function CaptainsPage() {
  const locale = useLocale();
  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const [captains, setCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [skillSubmitting, setSkillSubmitting] = useState(false);

  const fetchCaptains = () => {
    setLoading(true);
    fetch('/api/fleet/captains')
      .then(r => r.json())
      .then(d => {
        setCaptains(d.captains || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchCaptains(); }, []);

  const addSkill = async (captainId: string, skill: string) => {
    setSkillSubmitting(true);
    try {
      await fetch('/api/fleet/captains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: captainId, action: 'add_skill', skill }),
      });
      fetchCaptains();
      setNewSkill('');
    } finally {
      setSkillSubmitting(false);
    }
  };

  const removeSkill = async (captainId: string, skill: string) => {
    await fetch('/api/fleet/captains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: captainId, action: 'remove_skill', skill }),
    });
    fetchCaptains();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--charcoal)' }}>
          {ls('Captain Roster', 'Roster de Capitanes')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>
          {ls('Skills, schedules, and availability', 'Habilidades, horarios y disponibilidad')}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--muted-dim)' }}>Loading...</div>
      ) : captains.length === 0 ? (
        <div className="text-center py-16 nayara-card">
          <p style={{ color: 'var(--muted-dim)' }}>
            {ls('No captains found. Staff users with "captain" role will appear here.', 'No se encontraron capitanes.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {captains.map(cap => {
            const skills = Array.isArray(cap.skills) ? cap.skills.filter(s => s && s.skill) : [];
            const isSelected = selectedCaptain?.id === cap.id;

            return (
              <div key={cap.id} className="nayara-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--charcoal)' }}>
                      {cap.first_name} {cap.last_name}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--muted-dim)' }}>{cap.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black" style={{ color: 'var(--sage)' }}>
                      {cap.month_completed_trips || 0}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--muted-dim)' }}>
                      {ls('trips/month', 'viajes/mes')}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mb-3 text-xs" style={{ color: 'var(--muted-dim)' }}>
                  <span>{ls('Today:', 'Hoy:')} {cap.today_assignments || 0} {ls('trips', 'viajes')}</span>
                </div>

                {/* Skills */}
                <div className="mb-3">
                  <div className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted-dim)' }}>
                    {ls('Skills & Certifications', 'Habilidades y Certificaciones')}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                      <span key={s.skill}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: 'rgba(78,94,62,0.1)', color: '#4E5E3E' }}>
                        {s.skill.replace(/_/g, ' ')}
                        <button onClick={() => removeSkill(cap.id, s.skill)}
                          className="hover:text-red-500 ml-0.5">&times;</button>
                      </span>
                    ))}
                    {skills.length === 0 && (
                      <span className="text-[10px] italic" style={{ color: 'var(--muted-dim)' }}>
                        {ls('No skills added', 'Sin habilidades')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Add skill */}
                <button onClick={() => setSelectedCaptain(isSelected ? null : cap)}
                  className="text-[10px] font-medium"
                  style={{ color: 'var(--gold)' }}>
                  {isSelected ? ls('Close', 'Cerrar') : ls('+ Add Skill', '+ Agregar Habilidad')}
                </button>

                {isSelected && (
                  <div className="mt-2 flex gap-2">
                    <select value={newSkill} onChange={e => setNewSkill(e.target.value)}
                      className="nayara-input text-xs flex-1">
                      <option value="">{ls('Select skill...', 'Seleccionar...')}</option>
                      {SKILL_OPTIONS
                        .filter(s => !skills.some(sk => sk.skill === s))
                        .map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                    <button
                      onClick={() => newSkill && addSkill(cap.id, newSkill)}
                      disabled={!newSkill || skillSubmitting}
                      className="nayara-btn nayara-btn-primary text-xs px-3">
                      {ls('Add', 'Agregar')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
