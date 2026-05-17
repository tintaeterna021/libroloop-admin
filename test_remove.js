const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const path = '3d3278d8-14ab-499b-aa23-43167abe5a04/publish_back.jpg';
  const { data, error } = await supabase.storage.from('books').remove([path]);
  console.log("Remove response data:", data);
  console.log("Remove response error:", error);
}
run();
