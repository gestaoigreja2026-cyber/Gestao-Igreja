import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    console.log("Novo registro recebido:", record)

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    const APP_URL = Deno.env.get("APP_URL") || "https://church-gest-oficial.vercel.app"

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured")
    }

    // Apenas envia se for um novo perfil e tiver e-mail
    if (!record || !record.email) {
      return new Response(JSON.stringify({ ok: true, message: "No email to send" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #334155; }
          .header { text-align: center; margin-bottom: 30px; }
          .welcome-box { background-color: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; }
          .btn { background-color: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #0f172a; margin: 0;">Boas-vindas! 🎉</h1>
          </div>
          
          <div class="welcome-box">
            <p style="font-size: 18px; margin-top: 0;">Olá, <strong>${record.name || 'Membro'}</strong>!</p>
            <p>Seu acesso ao sistema da <strong>Gestão Igreja</strong> foi criado com sucesso. Estamos felizes em ter você conosco!</p>
            
            <a href="${APP_URL}" class="btn">Acessar Meu Painel</a>
            
            <p style="font-size: 14px; color: #64748b;">Dica: Salve o aplicativo na tela inicial do seu celular para facilitar o acesso às escalas e eventos.</p>
          </div>

          <div class="footer">
            <p>Gestão Igreja — Tecnologia a serviço do Reino</p>
          </div>
        </div>
      </body>
      </html>
    `

    console.log("Enviando e-mail via Resend para:", record.email)

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gestão Igreja <onboarding@resend.dev>",
        to: record.email,
        subject: "Bem-vindo(a) à Igreja! 👋",
        html: html,
      }),
    })

    const result = await res.json()
    console.log("Resposta do Resend:", result)

    return new Response(JSON.stringify({ ok: res.ok, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
