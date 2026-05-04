export default async function handler(req, res) {
  try {
    const host = req.headers.host || "";
    const mainDomain = "church-gest-oficial.com.br";

    // Extrair subdomínio (ex: batista.church-gest-oficial.com.br → batista)
    let subdomain = "";
    if (host.includes(mainDomain)) {
      subdomain = host
        .replace(mainDomain, "")
        .replace(/\.$/, "")
        .replace(/^\./, "")
        .split(".")[0];
    } else {
      // Fallback para localhost ou outros domínios
      subdomain = host.split(".")[0];
    }

    // Ignora domínio principal e www
    const isMain = !subdomain || subdomain === "www" || subdomain === mainDomain.split(".")[0];

    let nome = "Gestão Igreja";
    let logo = "/logo-app.png";
    let themeColor = "#2563eb";
    let shortName = "Igreja";

    if (!isMain) {
      // Buscar igreja no Supabase
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/churches?slug=eq.${encodeURIComponent(subdomain)}&select=name,logo_url,theme_color`,
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
              // Short name: primeiras 2 palavras (máx 12 chars)
              shortName = nome.split(" ").slice(0, 2).join(" ").substring(0, 12);
            }
            if (igreja.logo_url) logo = igreja.logo_url;
            if (igreja.theme_color) themeColor = igreja.theme_color;
          }
        }
      }
    }

    // Cache-busting para evitar o navegador servir manifest desatualizado
    const v = Date.now();
    const logoWithV = logo.startsWith("http")
      ? `${logo}${logo.includes("?") ? "&" : "?"}v=${v}`
      : `${logo}?v=${v}`;

    // ⚠️ CRÍTICO: sem cache
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json({
      name: nome,
      short_name: shortName,
      description: "Sistema de Gestão Eclesiástica Premium",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: themeColor,
      icons: [
        {
          src: logoWithV,
          sizes: "192x192",
          type: logo.endsWith(".svg") ? "image/svg+xml" : "image/png",
          purpose: "any maskable",
        },
        {
          src: logoWithV,
          sizes: "512x512",
          type: logo.endsWith(".svg") ? "image/svg+xml" : "image/png",
          purpose: "any maskable",
        },
      ],
    });
  } catch (error) {
    console.error("Erro no manifest:", error);

    return res.status(500).json({
      name: "Gestão Igreja",
      short_name: "Igreja",
      start_url: "/",
      display: "standalone",
      theme_color: "#2563eb",
      icons: [
        { src: "/logo-192.png", sizes: "192x192", type: "image/png" },
        { src: "/logo-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
  }
}
