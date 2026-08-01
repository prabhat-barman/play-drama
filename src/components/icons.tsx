import React from 'react';
import Svg, {Circle, Path, G, Rect} from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
};

export function MailIcon({size = 20, color = '#e9bcb6'}: IconProps) {
  return (
    <Svg width={size} height={(size * 16) / 20} viewBox="0 0 20 16" fill="none">
      <Path
        d="M2 3a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V3z"
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M2.5 3.5l7.5 5 7.5-5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LockIcon({size = 20, color = '#e9bcb6'}: IconProps) {
  const w = (size * 16) / 20;
  return (
    <Svg width={w} height={size + 5} viewBox="0 0 16 21" fill="none">
      <Path
        d="M4 9V6a4 4 0 118 0v3"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M2 11a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z"
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M8 13.5v2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function UserIcon({size = 20, color = '#e9bcb6'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 10a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M2.5 18a7.5 7.5 0 0115 0"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GoogleIcon({size = 20}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <G>
        <Path
          d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.82h5.4a4.62 4.62 0 01-2 3.03v2.51h3.23c1.9-1.75 2.97-4.32 2.97-7.34z"
          fill="#4285F4"
        />
        <Path
          d="M10 20c2.7 0 4.96-.9 6.62-2.43l-3.23-2.51c-.9.6-2.05.96-3.4.96-2.6 0-4.81-1.76-5.6-4.12H1.05v2.6A9.99 9.99 0 0010 20z"
          fill="#34A853"
        />
        <Path
          d="M4.4 11.9a5.98 5.98 0 010-3.8V5.5H1.05a10 10 0 000 9l3.35-2.6z"
          fill="#FBBC05"
        />
        <Path
          d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.94 9.94 0 0010 0 9.99 9.99 0 001.05 5.5l3.35 2.6C5.19 5.74 7.4 3.98 10 3.98z"
          fill="#EA4335"
        />
      </G>
    </Svg>
  );
}

export function AppleIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <Path d="M14.15 10.63c-.02-2.15 1.76-3.19 1.84-3.24-1-1.47-2.56-1.67-3.11-1.7-1.32-.13-2.58.78-3.25.78-.68 0-1.71-.76-2.82-.74-1.45.02-2.79.84-3.53 2.14-1.51 2.62-.39 6.5 1.08 8.63.72 1.04 1.57 2.21 2.68 2.17 1.08-.04 1.49-.7 2.79-.7s1.67.7 2.81.68c1.16-.02 1.9-1.06 2.6-2.11.82-1.2 1.16-2.37 1.18-2.43-.03-.01-2.26-.87-2.28-3.48zM12.06 4.24c.6-.72 1-1.72.89-2.72-.86.03-1.91.57-2.53 1.29-.56.64-1.05 1.66-.92 2.64.96.08 1.95-.49 2.56-1.21z" />
    </Svg>
  );
}

export function EyeIcon({size = 20, color = '#e9bcb6'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z"
        stroke={color}
        strokeWidth={1.6}
      />
      <Path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function HomeIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CompassIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path
        d="M15.5 8.5l-2 5.5-5.5 2 2-5.5 5.5-2z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DownloadIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HeartIcon({
  size = 24,
  color = '#e5e2e1',
  filled = false,
}: IconProps & {filled?: boolean}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M12 21s-7-4.5-9.5-9C.8 8.4 3.3 4 7 4c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.7 0 6.2 4.4 4.5 8-2.5 4.5-9.5 9-9.5 9z"
        stroke={color}
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookmarkIcon({
  size = 24,
  color = '#e5e2e1',
  filled = false,
}: IconProps & {filled?: boolean}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ProfileIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M4 21a8 8 0 0116 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlayIcon({size = 24, color = '#0a0a0a', filled = true}: IconProps & {filled?: boolean}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M6 4l14 8L6 20V4z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PauseIcon({size = 24, color = '#0a0a0a'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x={6} y={4} width={4} height={16} rx={1} />
      <Rect x={14} y={4} width={4} height={16} rx={1} />
    </Svg>
  );
}

export function RewindIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5l-7 7 7 7V5zM20 5l-7 7 7 7V5z"
        fill={color}
      />
    </Svg>
  );
}

export function ForwardIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 5l7 7-7 7V5zM4 5l7 7-7 7V5z"
        fill={color}
      />
    </Svg>
  );
}

export function PlusIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l4.5 4.5L19 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ChevronLeftIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronDownIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StarIcon({size = 14, color = '#ffb400'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </Svg>
  );
}

export function BellIcon({size = 22, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8a6 6 0 1112 0c0 4.5 2 5.5 2 7H4c0-1.5 2-2.5 2-7z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M10 20a2 2 0 004 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CastIcon({size = 22, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 8V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M3 12a6 6 0 016 6M3 16a2 2 0 012 2M3 20h.01"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ClockIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
      <Path
        d="M12 7v5l3 2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HeadphonesIcon({size = 22, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 15v-2a9 9 0 0118 0v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Rect x={3} y={14} width={4} height={7} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Rect x={17} y={14} width={4} height={7} rx={1.5} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function MicIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 11a7 7 0 0014 0M12 18v3M9 21h6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TrendingUpIcon({size = 18, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 17l6-6 4 4 8-8M15 7h6v6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SubtitlesIcon({size = 22, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={2} stroke={color} strokeWidth={1.8} />
      <Path
        d="M7 10h4M7 14h10M13 10h4"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ExpandIcon({size = 22, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function WifiIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 8.5a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={19} r={1.4} fill={color} />
    </Svg>
  );
}

export function KeyIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={15} r={4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M11 12l9-9M18 5l2 2M15 8l2 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LogOutIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShieldIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HelpIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path
        d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={17} r={1} fill={color} />
    </Svg>
  );
}

export function SlidersIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={16} cy={6} r={2} stroke={color} strokeWidth={1.8} />
      <Circle cx={10} cy={12} r={2} stroke={color} strokeWidth={1.8} />
      <Circle cx={18} cy={18} r={2} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function EditIcon({size = 18, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4L20.5 7.5a2.121 2.121 0 00-3-3L5 17v3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CrownIcon({size = 16, color = '#ffb400'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 18l1.5-9 5 4L12 6l2.5 7 5-4L21 18H3zm0 2h18v2H3v-2z" />
    </Svg>
  );
}

export function NextEpisodeIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4l10 8-10 8V4zM19 5v14"
        fill={color}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PrevEpisodeIcon({size = 24, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4L9 12l10 8V4zM5 5v14"
        fill={color}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function EpisodesListIcon({size = 20, color = '#e5e2e1'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 6h13M8 12h13M8 18h13M3 6h2M3 12h2M3 18h2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

