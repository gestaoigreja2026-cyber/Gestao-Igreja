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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing configuration")
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Estatísticas de Membros
    const { count: memberCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: newMembersWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // 2. Estatísticas de Células e Ministérios
    const { count: cellCount } = await supabase.from('cells').select('*', { count: 'exact', head: true, filter: 'active.eq.true' })
    const { count: ministryCount } = await supabase.from('ministries').select('*', { count: 'exact', head: true, filter: 'active.eq.true' })

    // 3. Finanças (Mês Atual)
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { data: finances } = await supabase
      .from('financial_transactions')
      .select('amount, type')
      .gte('date', firstDayOfMonth)

    const income = finances?.filter(f => f.type === 'entrada').reduce((sum, f) => sum + Number(f.amount), 0) || 0
    const expenses = finances?.filter(f => f.type === 'saida').reduce((sum, f) => sum + Number(f.amount), 0) || 0
    const balance = income - expenses

    // 4. Próximos Eventos (7 dias)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: upcomingEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('date', new Date().toISOString().split('T')[0])
      .lte('date', nextWeek.split('T')[0])

    // 5. Pegar pastores/admins para enviar o relatório
    const { data: admins } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('role', 'admin')

    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No admins to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    for (const admin of admins) {
      if (!admin.email) continue

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .stat-card { background-color: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .stat-value { display: block; font-size: 20px; font-weight: bold; color: #1e40af; }
            .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .btn { background-color: #2563eb; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
          </style>
        </head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin-bottom: 5px;">Relatório Semanal</h1>
            <p style="color: #64748b; margin-top: 0;">Resumo de atividades e crescimento</p>
          </div>

          <p>Olá Pastor(a) <strong>${admin.name}</strong>,</p>
          <p>Aqui estão os principais indicadores da igreja nos últimos 7 dias:</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 25px 0;">
            <div class="stat-card">
              <span class="stat-value">${memberCount || 0}</span>
              <span class="stat-label">Total Membros</span>
              <span style="font-size: 10px; color: #10b981;">+${newMembersWeek || 0} novos</span>
            </div>
            <div class="stat-card">
              <span class="stat-value" style="color: ${balance >= 0 ? '#10b981' : '#ef4444'}">
                R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span class="stat-label">Saldo do Mês</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">${cellCount || 0}</span>
              <span class="stat-label">Células Ativas</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">${upcomingEvents || 0}</span>
              <span class="stat-label">Eventos Próx. Semana</span>
            </div>
          </div>

          <div style="background-color: #eff6ff; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
            <h4 style="margin: 0 0 10px 0; color: #1e40af;">Destaques</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li>A igreja conta hoje com <strong>${ministryCount || 0}</strong> ministérios ativos.</li>
              <li>Receita total do mês: R$ ${income.toLocaleString('pt-BR')}</li>
              <li>Despesas totaos do mês: R$ ${expenses.toLocaleString('pt-BR')}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="https://church-gest-oficial.vercel.app/dashboard" class="btn">Abrir Painel Completo</a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <div style="text-align: center;">
            <p style="font-size: 12px; color: #94a3b8;">
              Gestão Igreja — Inteligência e transparência ministerial.<br>
              Este é um e-mail automático, por favor não responda.
            </p>
          </div>
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
          to: admin.email,
          subject: "Relatório Semanal: Resumo da Igreja 📊",
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
