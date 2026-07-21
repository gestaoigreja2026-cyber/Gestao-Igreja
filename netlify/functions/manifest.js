/**
 * Netlify Function: manifest dinâmico para PWA multi-tenant
 * Rota: /api/manifest  (configurada no netlify.toml)
 *
 * Detecta o subdomínio da requisição, busca a igreja no Supabase
 * e retorna um manifest.json personalizado com nome, logo e theme_color.
 */
exports.handler = async (event) => {
  try {
    const host = event.headers['host'] || event.headers['x-forwarded-host'] || '';
    const mainDomain = 'church-gest-oficial.com.br';

    // ─── Extrair subdomínio ───────────────────────────────────────────────────
    let subdomain = '';
    if (host.includes(mainDomain)) {
      subdomain = host
        .replace(mainDomain, '')
        .replace(/\.$/, '')
        .replace(/^\./, '')
        .split('.')[0];
    } else {
      subdomain = host.split('.')[0];
    }

    const isMain =
      !subdomain ||
      subdomain === 'www' ||
      subdomain === 'church-gest-oficial' ||
      subdomain === 'localhost';

    // ─── Valores padrão ──────────────────────────────────────────────────────
    let nome = 'Gestão Igreja';
    let themeColor = '#2563eb';
    let shortName = 'Igreja';
    // ─── Cache-busting (Variáveis ajustáveis) ────────────────────────────────
    const v = Date.now();
    let icon192 = `/pwa-icon-192.png?v=${v}`;
    let icon512 = `/pwa-icon-512.png?v=${v}`;

    // ─── Buscar tenant no Supabase ───────────────────────────────────────────
    if (!isMain) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/churches?slug=eq.${encodeURIComponent(subdomain)}&select=name,theme_color,logo_url`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const igreja = data?.[0];

          if (igreja) {
            if (igreja.name) {
              nome = igreja.name;
              // Short name: primeiras 2 palavras, máx 12 chars
              shortName = nome.split(' ').slice(0, 2).join(' ').substring(0, 12);
            }
            if (igreja.theme_color) themeColor = igreja.theme_color;
            if (igreja.logo_url) {
              icon192 = `${igreja.logo_url}?v=${v}`;
              icon512 = `${igreja.logo_url}?v=${v}`;
            }
          }
        }
      }
    }

    // ─── Retorna manifest ─────────────────────────────────────────────────────
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        name: nome,
        short_name: shortName,
        description: 'Sistema de Gestão Eclesiástica Premium',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: themeColor,
        icons: [
          {
            src: icon192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: icon192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: icon512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: icon512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }),
    };
  } catch (error) {
    console.error('Erro no manifest:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/manifest+json' },
      body: JSON.stringify({
        name: 'Gestão Igreja',
        short_name: 'Igreja',
        start_url: '/',
        display: 'standalone',
        theme_color: '#2563eb',
        icons: [
          { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      }),
    };
  }
};
