// Buzz, the Buzzword bee, holding a Burlingame B fountain pen.
// One SVG; its mood is set with a class on the <svg>:
//   (none)        idle
//   is-checking   wings flutter, pen writes
//   is-ready      happy eyes and a sparkle (AP-ready)

export const MASCOT_SVG = /* html */ `
<svg class="bee" viewBox="0 0 160 140" role="img" aria-labelledby="bee-title">
  <title id="bee-title">Buzz the bee, holding a Burlingame B pen</title>
  <defs>
    <clipPath id="bee-body-clip"><ellipse cx="86" cy="80" rx="34" ry="25"/></clipPath>
  </defs>

  <!-- Each wing: the outer <g> sets the angle, the inner ellipse flutters. -->
  <g class="bee-wings">
    <g transform="rotate(26 100 62)"><ellipse class="wing wing-back" cx="100" cy="42" rx="12" ry="20"/></g>
    <g transform="rotate(-20 82 62)"><ellipse class="wing wing-front" cx="82" cy="38" rx="14" ry="24"/></g>
  </g>

  <g class="bee-body" transform="rotate(-10 86 80)">
    <path class="bee-stinger" d="M118 77 L131 81 L118 86 Z"/>
    <ellipse class="bee-fill" cx="86" cy="80" rx="34" ry="25"/>
    <g clip-path="url(#bee-body-clip)">
      <rect class="bee-stripe" x="84" y="50" width="10" height="60"/>
      <rect class="bee-stripe" x="103" y="50" width="9" height="60"/>
    </g>
    <ellipse class="bee-outline" cx="86" cy="80" rx="34" ry="25"/>
  </g>

  <g class="bee-head">
    <path class="bee-antenna" d="M46 52 Q41 37 30 35"/>
    <path class="bee-antenna" d="M57 51 Q62 36 74 34"/>
    <circle class="bee-ink" cx="30" cy="35" r="3"/>
    <circle class="bee-ink" cx="74" cy="34" r="3"/>
    <circle class="bee-fill bee-outline-thick" cx="52" cy="68" r="20"/>
    <g class="eyes-open">
      <circle class="bee-ink" cx="45" cy="65" r="3.4"/>
      <circle class="bee-ink" cx="58" cy="64" r="3.4"/>
      <circle class="bee-shine" cx="46.2" cy="63.8" r="1.1"/>
      <circle class="bee-shine" cx="59.2" cy="62.8" r="1.1"/>
    </g>
    <g class="eyes-happy">
      <path class="bee-line" d="M41.5 66 Q45 61 48.5 66"/>
      <path class="bee-line" d="M54.5 65 Q58 60 61.5 65"/>
    </g>
    <ellipse class="bee-cheek" cx="40" cy="73" rx="3.6" ry="2.2"/>
    <ellipse class="bee-cheek" cx="64" cy="72" rx="3.6" ry="2.2"/>
    <path class="bee-line" d="M47 74 Q52 79 57 73.5"/>
  </g>

  <!-- The pen: nib at the bottom left, like the stem of the B in the logo. -->
  <g class="bee-pen" transform="translate(30 124) rotate(-42)">
    <path class="bee-ink" d="M0 0 L17 -6.5 L17 6.5 Z"/>
    <line class="pen-slit" x1="3" y1="0" x2="12" y2="0"/>
    <circle class="pen-hole" cx="12.5" cy="0" r="1.7"/>
    <rect class="bee-ink" x="17" y="-5" width="9" height="10" rx="1"/>
    <rect class="pen-band" x="26" y="-5.6" width="3.2" height="11.2"/>
    <rect class="bee-ink" x="29" y="-5.6" width="44" height="11.2" rx="2.5"/>
    <circle class="pen-badge" cx="81" cy="0" r="9.5"/>
    <text class="pen-b" x="81" y="0" transform="rotate(42 81 0)">B</text>
  </g>

  <g class="bee-arms">
    <path class="bee-line-thick" d="M60 87 Q58 95 63.5 97.5"/>
    <path class="bee-line-thick" d="M86 103 Q84 94 76.5 88.5"/>
    <circle class="bee-ink" cx="63.5" cy="97.5" r="3.6"/>
    <circle class="bee-ink" cx="76.5" cy="88.5" r="3.6"/>
  </g>

  <g class="bee-sparkle">
    <path d="M136 26 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z"/>
    <path d="M146 54 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z"/>
  </g>
</svg>`;
