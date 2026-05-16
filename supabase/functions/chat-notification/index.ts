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
    console.log("Nova mensagem de chat detectada:", record.id)

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const APP_URL = Deno.env.get("APP_URL") || "https://church-gest-oficial.vercel.app"

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing configuration")
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Pegar quem enviou e quem deve receber (num chat privado)
    // 1. Quem enviou
    const { data: sender } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', record.sender_id)
      .single()

    // 2. Participantes da conversa (excluindo o remetente)
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('profile:profiles(name, email)')
      .eq('conversation_id', record.conversation_id)
      .neq('profile_id', record.sender_id)

    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No participants to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const senderName = sender?.name || "Alguém"
    const messagePreview = record.content.substring(0, 100) + (record.content.length > 100 ? "..." : "")

    // Enviar e-mail para cada participante
    for (const p of participants) {
      const recipient = p.profile as any
      if (!recipient?.email) {
        console.log("Participante sem e-mail cadastrado:", recipient?.name)
        continue
      }

      console.log(`Enviando notificação de chat para: ${recipient.email}`)

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .message-bubble { background-color: #f1f5f9; padding: 20px; border-radius: 12px; border-left: 4px solid #2563eb; margin: 20px 0; }
            .btn { background-color: #2563eb; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
          </style>
        </head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Nova mensagem 💬</h2>
          <p>Olá <strong>${recipient.name}</strong>,</p>
          <p>Você recebeu uma nova mensagem de <strong>${senderName}</strong> no chat da igreja:</p>
          
          <div class="message-bubble">
            <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #1e293b;">${messagePreview}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/chat" class="btn">Visualizar e Responder</a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px;">
            Gestão Igreja — Notificações Instantâneas
          </p>
        </body>
        </html>
      `

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Gestão Igreja <onboarding@resend.dev>",
          to: recipient.email,
          subject: `Nova mensagem de ${senderName} 💬`,
          html: html,
        }),
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
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
