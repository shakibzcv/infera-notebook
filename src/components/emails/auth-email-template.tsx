import * as React from 'react';

interface AuthEmailTemplateProps {
  type: 'forgot-password' | 'email-verification';
  url: string;
}

export function AuthEmailTemplate({ type, url }: AuthEmailTemplateProps) {
  const isForgotPassword = type === 'forgot-password';

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        maxWidth: '600px',
        margin: '0 auto',
        color: '#111827',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 12px' }}>
          {isForgotPassword ? 'Reset your password' : 'Verify your email'}
        </h1>
        <p
          style={{
            fontSize: '16px',
            lineHeight: '24px',
            margin: '0',
            color: '#4b5563',
          }}
        >
          {isForgotPassword
            ? 'We received a request to reset your password. Click the button below to proceed.'
            : 'Welcome to Infera Notebook! Please click the button below to verify your email address.'}
        </p>
      </div>

      <a
        href={url}
        style={{
          display: 'inline-block',
          backgroundColor: '#000',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '16px',
        }}
      >
        {isForgotPassword ? 'Reset Password' : 'Verify Email'}
      </a>

      <div
        style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
          If the button doesn&apos;t work, you can copy and paste this link into your browser:
        </p>
        <p
          style={{
            fontSize: '12px',
            color: '#3b82f6',
            marginTop: '8px',
            wordBreak: 'break-all',
          }}
        >
          {url}
        </p>
      </div>

      <div style={{ marginTop: '24px' }}>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0' }}>
          Infera Notebook - Your ultimate AI-powered notebook.
        </p>
      </div>
    </div>
  );
}
