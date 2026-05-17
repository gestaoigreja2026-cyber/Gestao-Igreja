import { createClient } from '@supabase/supabase-js';
// dotenv removed for native Node --env-file option

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam variáveis de ambiente');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getSlugs() {
  const { data, error } = await supabase
    .from('churches')
    .select('name, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

getSlugs();
