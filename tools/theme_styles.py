"""Builds the theme styles (presets) in config/settings_data.json.

Run: python3 tools/theme_styles.py [path/to/settings_data.json ...]
Each style sets colours, colour schemes, fonts and shapes. Section content is not touched.
"""
import json
import re
import sys


def mix(a, b, t):
    """Blend hex colour a toward b by t (0..1)."""
    pa = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    pb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(pa, pb))


def style(bg, text, alt, accent, primary, primary_text, sale, header_bg, footer_bg, footer_text,
          head_font, body_font, **extra):
    border = mix(bg, text, 0.12)
    dark_bg, dark_text = footer_bg, footer_text
    s = {
        'color_body_bg': bg, 'color_body_text': text, 'color_alt_bg': alt, 'color_border': border,
        'color_primary': primary, 'color_primary_text': primary_text, 'color_accent': accent, 'color_sale': sale,
        'color_announcement_bg': dark_bg, 'color_announcement_text': dark_text,
        'color_header_bg': header_bg, 'color_header_text': text if header_bg != dark_bg else dark_text,
        'color_footer_bg': footer_bg, 'color_footer_text': footer_text,
        'color_badge_sale_bg': sale, 'color_badge_sale_text': '#ffffff',
        'color_badge_sold_out_bg': text, 'color_badge_sold_out_text': bg,
        'color_badge_new_bg': bg, 'color_badge_new_text': text,
        'type_header_font': head_font, 'type_body_font': body_font,
        'color_schemes': {
            'scheme-1': {'settings': {'background': bg, 'alt_background': alt, 'text': text, 'border': border,
                                      'button': primary, 'button_label': primary_text, 'accent': accent}},
            'scheme-2': {'settings': {'background': alt, 'alt_background': bg, 'text': text, 'border': mix(alt, text, 0.14),
                                      'button': primary, 'button_label': primary_text, 'accent': accent}},
            'scheme-3': {'settings': {'background': dark_bg, 'alt_background': mix(dark_bg, dark_text, 0.06), 'text': dark_text,
                                      'border': mix(dark_bg, dark_text, 0.18), 'button': dark_text, 'button_label': dark_bg,
                                      'accent': mix(accent, '#ffffff', 0.35)}},
            'scheme-4': {'settings': {'background': accent, 'alt_background': mix(accent, '#000000', 0.12), 'text': '#ffffff',
                                      'border': mix(accent, '#ffffff', 0.25), 'button': '#ffffff', 'button_label': accent,
                                      'accent': mix(accent, '#ffffff', 0.8)}},
        },
    }
    s.update(extra)
    return s


STYLES = {
    # Warm cream and saddle brown with a classic serif: the default look.
    'Heritage': style('#faf7f2', '#1c1a17', '#f1ebe1', '#9a5b2e', '#1c1a17', '#ffffff', '#b23a2b',
                      '#ffffff', '#1c1a17', '#e9e1d4', 'playfair_display_n4', 'jost_n4',
                      type_header_uppercase=False, button_radius=0, card_radius=0, input_radius=0,
                      badge_style='square', type_button_uppercase=True, type_nav_uppercase=True),
    # Quiet white minimalism with soft greys.
    'Ivory': style('#ffffff', '#222222', '#f5f4f1', '#8c7b6b', '#222222', '#ffffff', '#b8483a',
                   '#ffffff', '#f5f4f1', '#222222', 'lora_n4', 'karla_n4',
                   type_header_uppercase=False, button_radius=2, card_radius=0, input_radius=2,
                   badge_style='rounded', type_button_uppercase=False, type_button_spacing=40,
                   type_nav_uppercase=False, type_nav_size=14, section_spacing=88),
    # Dark luxury: near-black with antique gold.
    'Noir': style('#121212', '#f2efe9', '#1c1c1c', '#c8a96a', '#c8a96a', '#121212', '#d0644f',
                  '#121212', '#0b0b0b', '#d9d3c7', 'playfair_display_n4', 'montserrat_n4',
                  type_header_uppercase=False, type_header_spacing=25, button_radius=0, card_radius=0,
                  input_radius=0, badge_style='square', type_button_uppercase=True, type_button_spacing=200,
                  type_nav_uppercase=True, color_rating_star='#c8a96a'),
    # Bold editorial: big uppercase headings, high contrast, signal orange.
    'Atelier': style('#f4f1ea', '#111111', '#e9e4d8', '#d0471f', '#111111', '#ffffff', '#d0471f',
                     '#f4f1ea', '#111111', '#f4f1ea', 'montserrat_n7', 'work_sans_n4',
                     type_header_uppercase=True, type_header_spacing=-25, type_header_size=110,
                     button_radius=0, card_radius=0, input_radius=0, badge_style='square',
                     type_button_uppercase=True, type_button_spacing=120, grid_spacing=12),
    # Fresh coastal blues with rounded shapes.
    'Coastal': style('#f7fafb', '#1d2b36', '#e8f0f3', '#2f6f8f', '#1d2b36', '#ffffff', '#c4473a',
                     '#ffffff', '#1d2b36', '#e8f0f3', 'josefin_sans_n4', 'nunito_sans_n4',
                     type_header_uppercase=False, button_radius=24, card_radius=12, input_radius=12,
                     badge_style='pill', type_button_uppercase=False, type_button_spacing=20,
                     type_nav_uppercase=False, type_nav_size=15),
    # Natural greens and linen for an organic feel.
    'Botanica': style('#f6f5ef', '#22301f', '#ebeadf', '#5b7a4a', '#2f4a2a', '#ffffff', '#b5543c',
                      '#f6f5ef', '#22301f', '#ebeadf', 'libre_baskerville_n4', 'dm_sans_n4',
                      type_header_uppercase=False, button_radius=6, card_radius=6, input_radius=6,
                      badge_style='rounded', type_button_uppercase=True, type_button_spacing=100),
    # Soft blush tones with friendly rounded buttons.
    'Blush': style('#fbf6f4', '#3a2a2a', '#f4e8e4', '#c27b7f', '#3a2a2a', '#ffffff', '#c0485a',
                   '#fbf6f4', '#3a2a2a', '#f4e8e4', 'playfair_display_n4', 'poppins_n4',
                   type_header_uppercase=False, button_radius=30, card_radius=16, input_radius=16,
                   badge_style='pill', type_button_uppercase=False, type_button_spacing=30,
                   type_nav_uppercase=False, type_nav_size=14, color_tile_bg='#f4e8e4'),
}


def update(path):
    raw = open(path).read()
    header = ''
    m = re.match(r'\s*/\*.*?\*/\s*', raw, re.S)
    if m:
        header, raw = m.group(0), raw[m.end():]
    data = json.loads(raw)
    data['presets'] = {name: dict(values) for name, values in STYLES.items()}
    if not isinstance(data.get('current'), dict):
        data['current'] = dict(STYLES['Heritage'])
    with open(path, 'w') as f:
        f.write(header + json.dumps(data, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    for p in sys.argv[1:] or ['config/settings_data.json']:
        update(p)
