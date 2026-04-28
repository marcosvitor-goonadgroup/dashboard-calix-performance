import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 2, className = '' }) => {
  if (disabled) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 20%, #ec4899 40%, #f59e0b 60%, #a855f7 80%, #6366f1 100%)',
        backgroundSize: '200% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        animation: `shine ${speed}s linear infinite`,
      }}
    >
      {text}
      <style>{`
        @keyframes shine {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
      `}</style>
    </span>
  );
};

export default ShinyText;
