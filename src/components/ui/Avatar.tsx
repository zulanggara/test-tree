'use client';

import { useRef } from 'react';
import { FamilyMember } from '@/types';
import { getAvatarUrl } from '@/lib/family';
import { usePhoto } from '@/contexts/PhotoContext';

interface AvatarProps {
  member: FamilyMember;
  size?: number;
  borderColor?: string;
  showStatusDot?: boolean;
  allowUpload?: boolean;
}

export function Avatar({
  member,
  size = 80,
  borderColor = 'var(--accent)',
  showStatusDot = false,
  allowUpload = false,
}: AvatarProps) {
  const { getPhoto, uploadPhoto, removePhoto } = usePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAlive = !member.deathDate;
  const customPhoto = getPhoto(member.id, '');
  const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`w-full h-full rounded-full overflow-hidden${allowUpload ? ' group/avatar' : ''}`}
        style={{ border: `3px solid ${borderColor}` }}
      >
        <img
          src={getPhoto(member.id, getAvatarUrl(member))}
          alt={member.name}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = fallback; }}
        />
      </div>

      {allowUpload && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            title="Ganti foto"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(member.id, file);
              e.target.value = '';
            }}
          />
          {customPhoto && (
            <button
              onClick={() => removePhoto(member.id)}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap flex items-center gap-1 transition-colors"
              style={{ color: 'var(--text-subtle)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
            >
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus foto
            </button>
          )}
        </>
      )}

      {showStatusDot && isAlive && (
        <span
          className="absolute w-4 h-4 rounded-full bg-green-500 border-2"
          style={{ borderColor: 'var(--card)', bottom: -2, right: -2 }}
        />
      )}
      {showStatusDot && !isAlive && (
        <span
          className="absolute w-5 h-5 rounded-full bg-gray-700 border-2 flex items-center justify-center"
          style={{ borderColor: 'var(--card)', bottom: -2, right: -2, fontSize: 10, color: '#9ca3af' }}
        >
          ✝
        </span>
      )}
    </div>
  );
}
