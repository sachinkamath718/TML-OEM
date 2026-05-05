import { AVATAR_COLORS } from '../constants';
import { getInitials } from '../utils';

export default function Avatar({ name, size = 28 }) {
  const initials = getInitials(name);
  const color = AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        flexShrink: 0,
        letterSpacing: 0.5,
      }}
    >
      {initials}
    </div>
  );
}
