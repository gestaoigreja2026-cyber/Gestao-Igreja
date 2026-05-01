export default async function handler(req, res) {
  try {
    const host = req.headers.host || "";
    const mainDomain = "church-gest-oficial.com.br";
    
    // Extrair subdomínio (ex: batista.church-gest-oficial.com.br -> batista)
    let subdomain = "";
    if (host.includes(mainDomain)) {
      subdomain = host.replace(mainDomain, "").replace(/\.$/, "").replace(/^\./, "").split(".")[0];
    } else {
      // Fallback para localhost ou outros domínios
      subdomain = host.split(".")[0];
    }

    // 🔎 buscar igreja no Supabase
    // Usando a tabela 'churches' e o campo 'slug' conforme o schema do projeto
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/rest/v1/churches?slug=eq.${subdomain}`,
      {
        headers: {
          apikey: process.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        }
      }
    );

    const data = await response.json();
    const igreja = data?.[0];

    // 🛑 fallback (importante)
    const nome = igreja?.name || "Gestão Igreja";
    const logo = igreja?.logo_url || "/logo-app.png";
    const cor = "#2563eb"; // Cor padrão do app

    // 🔥 evitar cache (CRÍTICO)
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      name: nome,
      short_name: nome,
      description: "Sistema de Gestão Eclesiástica Premium",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: cor,
      icons: [
        {
          src: `${logo}?v=${Date.now()}`,
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: `${logo}?v=${Date.now()}`,
          sizes: "512x512",
          type: "image/png"
        }
      ]
    });

  } catch (error) {
    console.error("Erro no manifest:", error);

    return res.status(500).json({
      name: "Gestão Igreja",
      short_name: "Igreja",
      start_url: "/",
      display: "standalone"
    });
  }
}
