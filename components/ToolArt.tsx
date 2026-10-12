import Image from 'next/image';
import { isCrafterImage } from '@/lib/catalog-model';
export default function ToolArt({
  category = '3',
  image = '',
  name = '',
  large = false,
}: {
  category?: string;
  image?: string;
  name?: string;
  large?: boolean;
}) {
  if (image)
    return (
      <div className={`tool-art uploaded ${large ? 'large' : ''}`}>
        <Image src={image} alt={name} fill unoptimized={isCrafterImage(image)} sizes={large ? "(max-width: 767px) 90vw, 550px" : "(max-width: 767px) 44vw, (max-width: 991px) 33vw, 280px"} loading={large ? 'eager' : 'lazy'} fetchPriority={large ? 'high' : 'auto'} />
      </div>
    );
  const c = Number(category);
  return (
    <div className={`tool-art art-${c % 4} ${large ? 'large' : ''}`} aria-hidden="true">
      <span className="art-halo" />
      <svg viewBox="0 0 300 240" fill="none">
        <ellipse cx="155" cy="205" rx="82" ry="9" fill="#162d2710" />
        {c === 0 || c === 1 ? (
          <g transform="rotate(-8 155 125)">
            <path
              d="M105 85Q105 70 120 68h60q16 0 16 17v99q0 14-14 14h-64q-13 0-13-14z"
              fill="#c4d3cf"
              stroke="#647e77"
            />
            <path d="M101 85h99v25h-99z" fill="#54958d" />
            <path d="M122 67v-9q0-9 10-9h36q10 0 10 9v9" stroke="#233b35" strokeWidth="9" />
            <path d="M116 119v58" stroke="#eff5f2" strokeWidth="12" />
            <circle cx="120" cy="199" r="12" fill="#273a35" />
            <circle cx="183" cy="199" r="12" fill="#273a35" />
            <path d="M197 116q42-6 40 30l-3 47" stroke="#304740" strokeWidth="12" />
            <path d="m223 193 23 2" stroke="#20332d" strokeWidth="13" />
            <rect x="121" y="81" width="19" height="8" rx="3" fill="#d8ff3e" />
            <path d="M150 131h30m-30 10h30m-30 10h30" stroke="#8ea59c" />
          </g>
        ) : c === 2 ? (
          <g>
            <path d="m110 118 60-62 7 6-57 68" fill="#31463e" />
            <path d="m162 58 34 16" stroke="#273a34" strokeWidth="10" strokeLinecap="round" />
            <path d="m79 155 43-21 71 3 31 28v29H80z" fill="#6aa49a" stroke="#3d6c61" />
            <path d="M130 112h43l13 38h-69z" fill="#29463c" />
            <rect x="133" y="114" width="37" height="12" rx="3" fill="#d8ff3e" />
            <path d="M90 163h124" stroke="#acc9b7" strokeWidth="4" />
            <circle cx="103" cy="192" r="20" fill="#283b32" />
            <circle cx="201" cy="192" r="20" fill="#283b32" />
            <circle cx="103" cy="192" r="9" fill="#a9beb0" />
            <circle cx="201" cy="192" r="9" fill="#a9beb0" />
          </g>
        ) : c === 7 ? (
          <g transform="rotate(-9 150 130)">
            <path d="M113 82h76l13 83-16 27h-79l-14-25z" fill="#36554b" />
            <path d="M113 82h76l8 43h-92z" fill="#78b4a2" />
            <rect x="128" y="63" width="44" height="31" rx="4" fill="#283f35" />
            <rect x="136" y="67" width="29" height="22" rx="2" fill="#dbf6d6" />
            <path d="M132 106h42v62h-42z" fill="#bddfcc" />
            <path d="M145 108v60m-12-31h39" stroke="#a1e53b" strokeWidth="3" />
            <circle cx="153" cy="181" r="5" fill="#d8ff3e" />
            <path d="M113 193v11m72-11v11" stroke="#263c34" strokeWidth="9" />
          </g>
        ) : c === 9 ? (
          <g>
            <rect
              x="76"
              y="82"
              width="152"
              height="113"
              rx="14"
              stroke="#2b4239"
              strokeWidth="12"
            />
            <rect x="91" y="97" width="120" height="78" rx="8" fill="#70a79b" />
            <rect x="105" y="110" width="55" height="52" rx="5" fill="#334d42" />
            <circle cx="131" cy="136" r="19" stroke="#8bafa1" strokeWidth="2" />
            <path d="M120 126l24 20m-24 0 24-20" stroke="#8bafa1" />
            <rect x="169" y="109" width="26" height="45" rx="3" fill="#d4e3d7" />
            <circle cx="181" cy="122" r="6" fill="#344d40" />
            <circle cx="181" cy="143" r="5" fill="#344d40" />
            <path d="M95 197v10m112-10v10" stroke="#2b4239" strokeWidth="12" />
            <rect x="116" y="77" width="40" height="9" rx="3" fill="#d8ff3e" />
          </g>
        ) : c === 5 || c === 6 ? (
          <g transform="rotate(-24 150 130)">
            <ellipse
              cx="222"
              cy="124"
              rx="14"
              ry="53"
              fill="#9db2a7"
              stroke="#405e50"
              strokeWidth="4"
            />
            <ellipse cx="225" cy="124" rx="7" ry="40" fill="#dce6de" />
            <path d="M199 109h24v29h-24z" fill="#4e675b" />
            <rect x="106" y="95" width="103" height="51" rx="17" fill="#589c8a" />
            <path d="M114 97v47m9-47v47" stroke="#8fbeb0" strokeWidth="3" />
            <path d="M64 103h56v35H64q-17 0-17-17t17-18" fill="#2d473b" />
            <path d="M185 96V64" stroke="#263e32" strokeWidth="14" strokeLinecap="round" />
            <path d="M61 141q-20 22-10 40" stroke="#2c4639" strokeWidth="5" />
            <rect x="141" y="107" width="30" height="10" rx="3" fill="#d8ff3e" />
          </g>
        ) : c === 4 ? (
          <g transform="rotate(-10 150 130)">
            <circle cx="177" cy="158" r="48" fill="#acbfb3" stroke="#486657" strokeWidth="3" />
            <circle cx="177" cy="158" r="33" fill="#dce6dd" stroke="#a7b9ac" />
            <path d="m99 160 27-63h63l34 60-16 11h-95z" fill="#639f8c" />
            <path
              d="m136 99 6-18h35l16 33"
              stroke="#2d483a"
              strokeWidth="15"
              strokeLinecap="round"
            />
            <path d="M83 188h155" stroke="#567b68" strokeWidth="9" />
            <rect x="109" y="120" width="31" height="34" rx="5" fill="#324c3c" />
            <circle cx="178" cy="151" r="8" fill="#d8ff3e" />
          </g>
        ) : c === 8 ? (
          <g>
            <path d="M139 50v119l-43 29m43-29 66 19" stroke="#355746" strokeWidth="9" />
            <rect x="132" y="44" width="54" height="58" rx="9" fill="#65a18d" />
            <circle cx="158" cy="70" r="16" stroke="#365344" strokeWidth="4" />
            <path d="M186 76h25v60q-3 15-15 10" stroke="#34533f" strokeWidth="5" />
            <path d="M134 44h58" stroke="#d8ff3e" strokeWidth="6" />
            <circle cx="96" cy="199" r="13" fill="#2a4234" />
            <circle cx="206" cy="190" r="13" fill="#2a4234" />
          </g>
        ) : (
          <g transform="rotate(-17 150 130)">
            <path d="M135 118h45l-7 59h-45z" fill="#2e473f" />
            <path d="M143 126h25l-6 42h-28z" fill="#5e9f90" />
            <path d="M109 173h73v27h-73z" fill="#263e34" />
            <path d="M109 173h73v10h-73z" fill="#83b4a1" />
            <path
              d="M91 67h87q25 0 31 23v20q-3 20-28 20h-62q-30 0-30-29z"
              fill="#5a9f8f"
              stroke="#3c796c"
            />
            <rect x="187" y="78" width="34" height="40" rx="6" fill="#2c443a" />
            <path d="M219 87h20v21h-20z" fill="#90a89b" />
            <path d="M238 93h32v9h-32" fill="#627a6c" />
            <path d="M98 80h24m-24 9h24m-24 9h24" stroke="#254f42" strokeWidth="3" />
            <rect x="144" y="79" width="22" height="10" rx="3" fill="#d8ff3e" />
            <path d="M178 125v12" stroke="#243d33" strokeWidth="8" />
          </g>
        )}
      </svg>
    </div>
  );
}
