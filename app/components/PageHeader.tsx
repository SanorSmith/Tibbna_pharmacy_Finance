'use client';

import { ReactNode } from 'react';
import BackButton from './BackButton';

interface PageHeaderProps {
  title: string;
  backPath?: string;
  backLabel?: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({ 
  title, 
  backPath, 
  backLabel, 
  description,
  actions 
}: PageHeaderProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {backPath && <BackButton backPath={backPath} label={backLabel} />}
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h1>
            {description && (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>{description}</p>
            )}
          </div>
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
}
