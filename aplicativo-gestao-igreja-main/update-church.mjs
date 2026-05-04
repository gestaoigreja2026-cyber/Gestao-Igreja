// Script para atualizar slug e logo_url da Igreja Lagoinha
const SUPABASE_URL = 'https://amgpwwdhqtoaxkrvakzg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtZ3B3d2RocXRvYXhrcnZha3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTYzODMsImV4cCI6MjA4NTgzMjM4M30.36DWRC6AEL_KkGlV9Em8XHVVrO4R-eCEPbdN15MPzRo';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// 1. Listar todas as igrejas
console.log('🔍 Buscando igrejas no banco...');
const listRes = await fetch(`${SUPABASE_URL}/rest/v1/churches?select=id,name,slug,logo_url`, { headers });
const churches = await listRes.json();

if (!Array.isArray(churches) || churches.length === 0) {
  console.log('❌ Nenhuma igreja encontrada (RLS bloqueando ou tabela vazia).');
  console.log('Resposta:', JSON.stringify(churches));
  process.exit(1);
}

console.log(`✅ ${churches.length} igreja(s) encontrada(s):\n`);
churches.forEach(c => {
  console.log(`  - ${c.name} | slug: "${c.slug}" | logo: ${c.logo_url || '(sem logo)'}`);
});

// 2. Atualizar a Igreja Lagoinha (slug=localhost) 
//    → novo slug: lagoinha
//    → logo_url: URL pública da logo oficial
const LOGO_URL = 'https://amgpwwdhqtoaxkrvakzg.supabase.co/storage/v1/object/public/logos/logo-oficial.png';

const lagoinha = churches.find(c => c.slug === 'localhost' || c.name?.toLowerCase().includes('lagoinha'));
if (lagoinha) {
  console.log(`\n📝 Atualizando "${lagoinha.name}" (id: ${lagoinha.id})...`);
  
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/churches?id=eq.${lagoinha.id}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        slug: 'lagoinha',
        logo_url: LOGO_URL,
      }),
    }
  );

  const updateData = await updateRes.json();
  console.log('Resultado:', JSON.stringify(updateData, null, 2));
  
  if (updateRes.ok) {
    console.log('\n✅ Igreja Lagoinha atualizada com sucesso!');
    console.log('   Slug novo: lagoinha');
    console.log('   Logo URL: ' + LOGO_URL);
    console.log('\n🔗 Teste agora em: http://localhost:5173/?slug=lagoinha');
  } else {
    console.log('\n⚠️  Erro ao atualizar (provável RLS). Resposta:', updateData);
  }
} else {
  console.log('\n⚠️  Igreja Lagoinha não encontrada pelo slug "localhost" ou nome.');
}
