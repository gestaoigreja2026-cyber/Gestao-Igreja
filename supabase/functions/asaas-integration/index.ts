import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') // Token de segurança do Webhook
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ASAAS_BASE_URL = ASAAS_API_KEY?.includes('hmlg') ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token'
}

serve(async (req) => {
  const { method } = req

  // 1. Lidar com requisições OPTIONS (CORS)
  if (method === 'OPTIONS') {
    return new Response('ok', { headers: defaultHeaders })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Faltam variáveis de ambiente do Supabase: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.' }), { status: 500, headers: defaultHeaders })
  }

  if (!ASAAS_API_KEY) {
    return new Response(JSON.stringify({ error: 'Falta a variável de ambiente ASAAS_API_KEY. Configure-a no Supabase Edge Functions/Secrets.' }), { status: 500, headers: defaultHeaders })
  }

  try {
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )

    const body = await req.json()
    
    // --- ROTA DE AÇÕES (Chamadas do Frontend) ---
    if (body.action) {
      const { action, churchId } = body
      
      if (action === 'init_checkout') {
        const { churchName, churchSlug, adminEmail, adminName, cpfCnpj, mobilePhone, plan_amount, subscription_plan } = body
        const amount = plan_amount || 199.0;
        const planName = subscription_plan ? subscription_plan.toUpperCase() : 'STARTER';

        // 1. Cria a igreja no banco (status inadimplente até pagar)
        const { data: newChurch, error: churchError } = await supabaseClient
          .from('churches')
          .insert({ name: churchName, slug: churchSlug })
          .select()
          .single()

        if (churchError) throw churchError

        // 2. Cria o Cliente no Asaas
        const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY || '' },
          body: JSON.stringify({
            name: adminName,
            email: adminEmail,
            cpfCnpj: cpfCnpj,
            mobilePhone: mobilePhone
          })
        })
        const customer = await customerResponse.json()
        if (customer.errors) throw new Error(customer.errors[0].description)

        // 3. Cria a Assinatura no Asaas (com valor dinâmico do plano)
        const subResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY || '' },
          body: JSON.stringify({
            customer: customer.id,
            billingType: 'UNDEFINED', // Permite que o cliente escolha PIX ou Cartão no checkout
            value: amount,
            nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0], // Amanhã
            cycle: 'MONTHLY',
            description: `Assinatura Plano ${planName} (R$ ${amount}/mês) - ${churchName}`
          })
        })
        const subscription = await subResponse.json()
        if (subscription.errors) throw new Error(subscription.errors[0].description)

        // 4. Vincula IDs na church_subscriptions e define status
        // Nota: A trigger create_subscription_for_new_church já criou a linha, fazemos UPDATE
        await supabaseClient
          .from('church_subscriptions')
          .update({
            asaas_customer_id: customer.id,
            asaas_subscription_id: subscription.id,
            status: 'inadimplente',
            plan_amount: amount,
            subscription_plan: subscription_plan || 'starter'
          })
          .eq('church_id', newChurch.id)

        // 5. Busca a primeira cobrança pendente para pegar a URL de pagamento e o ID
        const paymentsResponse = await fetch(`${ASAAS_BASE_URL}/payments?subscription=${subscription.id}`, {
          headers: { 'access_token': ASAAS_API_KEY || '' }
        })
        const payments = await paymentsResponse.json()
        const paymentId = payments.data?.[0]?.id
        const invoiceUrl = payments.data?.[0]?.invoiceUrl || customer.invoiceUrl

        let pixData = null;
        if (paymentId) {
          // 6. Busca o QR Code do PIX para exibir na tela
          const pixResponse = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`, {
            headers: { 'access_token': ASAAS_API_KEY || '' }
          })
          if (pixResponse.ok) {
            pixData = await pixResponse.json()
          }
        }

        return new Response(JSON.stringify({ url: invoiceUrl, pix: pixData }), { 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        })
      }

      if (action === 'create_link') {
        // Busca dados da assinatura para pegar o customer_id
        const { data: sub } = await supabaseClient
          .from('church_subscriptions')
          .select('asaas_customer_id')
          .eq('church_id', churchId)
          .single()

        if (!sub?.asaas_customer_id) {
          return new Response(JSON.stringify({ error: 'Igreja não integrada ao Asaas' }), { status: 400 })
        }

        // Busca a última cobrança pendente no Asaas
        const asaasResponse = await fetch(`${ASAAS_BASE_URL}/payments?customer=${sub.asaas_customer_id}&status=PENDING`, {
          headers: { 'access_token': ASAAS_API_KEY || '' }
        })
        const payments = await asaasResponse.json()

        if (payments.data && payments.data.length > 0) {
          return new Response(JSON.stringify({ url: payments.data[0].invoiceUrl }), { 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          })
        }

        return new Response(JSON.stringify({ error: 'Nenhuma fatura pendente encontrada' }), { status: 404 })
      }

      if (action === 'get_status') {
        const { data: sub } = await supabaseClient
          .from('church_subscriptions')
          .select('asaas_subscription_id')
          .eq('church_id', churchId)
          .single()

        if (!sub?.asaas_subscription_id) {
          return new Response(JSON.stringify({ error: 'Assinatura não encontrada' }), { status: 404 })
        }

        const asaasResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions/${sub.asaas_subscription_id}`, {
          headers: { 'access_token': ASAAS_API_KEY || '' }
        })
        const subscription = await asaasResponse.json()
        return new Response(JSON.stringify(subscription), { 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        })
      }
    }

    // --- ROTA DE WEBHOOK (Chamadas do Asaas) ---
    const event = body.event
    const payment = body.payment

    // REGISTRA LOG: Salva o webhook recebido para auditoria
    await supabaseClient.from('asaas_webhooks').insert({
      event: event,
      payload: body
    })

    // Validação de segurança para Webhook
    const token = req.headers.get('asaas-access-token')
    if (ASAAS_WEBHOOK_TOKEN && token !== ASAAS_WEBHOOK_TOKEN) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
    }

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const customerId = payment.customer
      
      const { data: subscription, error: subError } = await supabaseClient
        .from('church_subscriptions')
        .select('church_id')
        .eq('asaas_customer_id', customerId)
        .single()

      if (subError || !subscription) {
        return new Response(JSON.stringify({ error: 'Igreja não encontrada' }), { status: 404 })
      }

      // Reativa a igreja via RPC
      await supabaseClient.rpc('register_payment_church', {
        p_church_id: subscription.church_id
      })

      // Registra no histórico detalhado
      await supabaseClient.from('church_subscription_payments').insert({
        church_id: subscription.church_id,
        amount: payment.value,
        source: 'asaas',
        asaas_billing_id: payment.id,
        asaas_data: body,
        notes: `Pagamento automático via Asaas (${payment.billingType})`
      })

      // Atualiza status final
      await supabaseClient.from('church_subscriptions').update({ 
        asaas_data: body,
        status: 'ATIVO' 
      }).eq('church_id', subscription.church_id)

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    return new Response(JSON.stringify({ message: 'Evento ignorado' }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
