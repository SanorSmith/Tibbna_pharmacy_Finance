'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  backPath?: string;
  label?: string;
}

export default function BackButton({ backPath, label = 'Back' }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (backPath) {
      router.push(backPath);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f9fafb';
        e.currentTarget.style.borderColor = '#d1d5db';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      <ArrowLeft style={{ width: '16px', height: '16px' }} />
      {label}
    </button>
  );
}
